/**
 * Link orphan signals (relevance >= 2, no signal_actors rows) to tracked actors
 * by matching actor names in title/summary, then re-enriching stragglers.
 *
 * Run: npx tsx scripts/fix-orphan-signals.ts [domain-slug]
 */
import { config } from "dotenv";
import { resolveDomainSlug } from "../lib/config-loader";
import { enrichSignal, enrichmentContextFromConfig } from "../lib/enrichment";
import { loadDomainConfig } from "../lib/config-loader";
import { getDomainMeta } from "../lib/domain";
import { getSupabase } from "../lib/supabase";

config({ path: ".env.local" });

const MIN_RELEVANCE = 2;

function matchActorsInText(
  text: string,
  actorNames: string[],
): string[] {
  const haystack = text.toLowerCase();
  const matched: string[] = [];

  const sorted = [...actorNames].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    if (haystack.includes(name.toLowerCase())) {
      matched.push(name);
    }
  }

  return matched;
}

async function main() {
  const slug = resolveDomainSlug(process.argv[2] ?? process.env.DOMAIN);
  const domain = await getDomainMeta(slug);
  const configData = loadDomainConfig(slug);
  const supabase = getSupabase();
  const enrichmentContext = enrichmentContextFromConfig(configData);

  const { data: actors, error: actorsError } = await supabase
    .from("actors")
    .select("id, name")
    .eq("domain_id", domain.id);

  if (actorsError) {
    throw new Error(`actors: ${actorsError.message}`);
  }

  const actorMap = new Map(
    (actors ?? []).map((actor) => [actor.name as string, actor.id as string]),
  );
  const actorNames = Array.from(actorMap.keys());

  const { data: signals, error: signalsError } = await supabase
    .from("signals")
    .select("id, title, summary, raw_content, event_date, relevance, source_url")
    .eq("domain_id", domain.id)
    .gte("relevance", MIN_RELEVANCE);

  if (signalsError) {
    throw new Error(`signals: ${signalsError.message}`);
  }

  const signalIds = (signals ?? []).map((s) => s.id as string);
  const { data: links, error: linksError } = await supabase
    .from("signal_actors")
    .select("signal_id")
    .in("signal_id", signalIds.length > 0 ? signalIds : ["00000000-0000-0000-0000-000000000000"]);

  if (linksError) {
    throw new Error(`signal_actors: ${linksError.message}`);
  }

  const linkedIds = new Set((links ?? []).map((row) => row.signal_id as string));
  const orphans = (signals ?? []).filter((s) => !linkedIds.has(s.id as string));

  console.log(`[fix-orphan-signals] domain=${slug} relevance>=${MIN_RELEVANCE}`);
  console.log(`[fix-orphan-signals] ${signals?.length ?? 0} signals, ${orphans.length} orphans`);

  let linkedByMatch = 0;
  let linkedByEnrich = 0;
  const errors: string[] = [];

  for (const signal of orphans) {
    const text = [signal.title, signal.summary, signal.raw_content]
      .filter(Boolean)
      .join("\n");
    let matched = matchActorsInText(text, actorNames);

    if (matched.length === 0 && signal.raw_content) {
      try {
        const enrichment = await enrichSignal({
          rawText: `${signal.title}\n\n${signal.raw_content}`,
          eventDate: signal.event_date as string,
          context: enrichmentContext,
        });
        matched = enrichment.actors.filter((name) => actorMap.has(name));
      } catch (error) {
        errors.push(
          `${signal.id}: enrich failed — ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    const actorIds = Array.from(new Set(matched.map((name) => actorMap.get(name)!)));
    if (actorIds.length === 0) {
      console.log(
        `  skip ${signal.event_date} rel=${signal.relevance} ${(signal.title as string)?.slice(0, 60)}… (no actor match)`,
      );
      continue;
    }

    const { error: insertError } = await supabase.from("signal_actors").insert(
      actorIds.map((actorId) => ({
        signal_id: signal.id,
        actor_id: actorId,
      })),
    );

    if (insertError) {
      errors.push(`${signal.id}: insert failed — ${insertError.message}`);
      continue;
    }

    const via = matchActorsInText(text, actorNames).length > 0 ? "text" : "enrich";
    if (via === "text") linkedByMatch += 1;
    else linkedByEnrich += 1;

    console.log(
      `  linked (${via}) ${signal.event_date} rel=${signal.relevance} → ${matched.join(", ")} | ${(signal.title as string)?.slice(0, 60)}`,
    );
  }

  console.log("");
  console.log(
    `[fix-orphan-signals] done: ${linkedByMatch} by text match, ${linkedByEnrich} by re-enrich, ${errors.length} errors`,
  );
  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`  error: ${err}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
