/**
 * Debug TransPerfect signal counts through the Market Pulse pipeline.
 * Run: npx tsx scripts/debug-transperfect-signals.ts
 */
import { config } from "dotenv";
import { resolveDomainSlug } from "../lib/config-loader";
import { getDomainMeta } from "../lib/domain";
import { groupSignals } from "../lib/group-signals";
import { dedupeRowsBySourceUrl } from "../lib/signal-dedupe";
import { getSupabase } from "../lib/supabase";

config({ path: ".env.local" });

const MARKET_PULSE_SIGNALS_PER_ACTOR = 3;

async function main() {
  const slug = resolveDomainSlug(process.env.DOMAIN);
  const domain = await getDomainMeta(slug);
  const supabase = getSupabase();

  const { data: actor, error: actorError } = await supabase
    .from("actors")
    .select("id, name, tier")
    .eq("domain_id", domain.id)
    .eq("name", "TransPerfect")
    .maybeSingle();

  if (actorError || !actor) {
    console.error("TransPerfect actor not found:", actorError?.message);
    process.exit(1);
  }

  const { data: linkedSignals, error: linkError } = await supabase
    .from("signal_actors")
    .select(
      `
      signal_id,
      signals!inner (
        id,
        title,
        summary,
        category,
        relevance,
        event_date,
        source_url,
        captured_at,
        lifecycle,
        domain_id
      )
    `,
    )
    .eq("actor_id", actor.id)
    .eq("signals.domain_id", domain.id)
    .gte("signals.relevance", 2);

  if (linkError) {
    console.error("signal_actors query failed:", linkError.message);
    process.exit(1);
  }

  const rawRows = (linkedSignals ?? []).map((row) => {
    const signal = row.signals as unknown as Record<string, unknown>;
    return {
      id: signal.id as string,
      title: signal.title as string,
      summary: signal.summary as string,
      category: signal.category as string,
      relevance: signal.relevance as number,
      event_date: signal.event_date as string,
      source_url: signal.source_url as string,
      captured_at: (signal.captured_at as string | null) ?? undefined,
      lifecycle: signal.lifecycle as string | null,
    };
  });

  const uniqueById = new Map(rawRows.map((row) => [row.id, row]));
  const supabaseUnique = Array.from(uniqueById.values());

  const afterUrlDedupe = dedupeRowsBySourceUrl(
    supabaseUnique.map((row) => ({
      ...row,
      so_what: null,
      actor_names: ["TransPerfect"],
    })),
  );

  const afterGrouping = groupSignals(
    afterUrlDedupe.map((row) => ({
      ...row,
      actor_names: ["TransPerfect"],
    })),
  ).sort((a, b) => b.event_date.localeCompare(a.event_date));

  const uiShown = afterGrouping.slice(0, MARKET_PULSE_SIGNALS_PER_ACTOR);

  console.log("=== TransPerfect Market Pulse debug ===");
  console.log(`Domain: ${slug} (${domain.id})`);
  console.log(`Actor: ${actor.name} (${actor.id}), tier ${actor.tier}`);
  console.log("");
  console.log("Counts:");
  console.log(`  Supabase (linked, relevance >= 2):     ${supabaseUnique.length}`);
  console.log(`  After URL dedupe:                      ${afterUrlDedupe.length}`);
  console.log(`  After groupSignals (UI groups):        ${afterGrouping.length}`);
  console.log(`  Shown on card (cap ${MARKET_PULSE_SIGNALS_PER_ACTOR}):          ${uiShown.length}`);
  console.log("");

  if (supabaseUnique.length !== afterGrouping.length) {
    console.log("Grouped merges (signals folded into N-sources cards):");
    for (const group of afterGrouping) {
      if (group.source_count && group.source_count > 1) {
        console.log(
          `  - Primary ${group.id} (${group.event_date}, rel ${group.relevance}, ${group.category}) ← ${group.source_count} sources`,
        );
        for (const source of group.grouped_sources ?? []) {
          console.log(`      · ${source.id} rel ${source.relevance} ${source.source_url.slice(0, 60)}`);
        }
      }
    }
    const mergedAway = supabaseUnique.length - afterGrouping.length;
    console.log(`  Total merged away from card rows: ${mergedAway}`);
    console.log("");
  }

  console.log("All signals in Supabase (relevance >= 2):");
  for (const row of supabaseUnique.sort((a, b) => b.event_date.localeCompare(a.event_date))) {
    console.log(
      `  ${row.event_date} rel=${row.relevance} ${row.category} ${row.id.slice(0, 8)}… ${row.title?.slice(0, 70) ?? row.summary.slice(0, 70)}`,
    );
  }

  console.log("");
  console.log("UI card rows after grouping:");
  for (const row of uiShown) {
    const badge = row.source_count && row.source_count > 1 ? ` [${row.source_count} sources]` : "";
    console.log(
      `  ${row.event_date} rel=${row.relevance} ${row.category}${badge} ${row.title?.slice(0, 70) ?? row.summary.slice(0, 70)}`,
    );
  }

  const missingFromUi = afterGrouping.slice(MARKET_PULSE_SIGNALS_PER_ACTOR);
  if (missingFromUi.length > 0) {
    console.log("");
    console.log(`Hidden by per-actor cap (${MARKET_PULSE_SIGNALS_PER_ACTOR}):`);
    for (const row of missingFromUi) {
      console.log(`  ${row.event_date} rel=${row.relevance} ${row.category}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
