/**
 * Compare full living-document pipeline vs scoped grouping for TransPerfect.
 */
import { config } from "dotenv";
import { resolveDomainSlug } from "../lib/config-loader";
import { getDomainMeta } from "../lib/domain";
import { getLivingDocumentData } from "../lib/living-document";
import { groupSignals } from "../lib/group-signals";
import { dedupeRowsBySourceUrl } from "../lib/signal-dedupe";
import { getSupabase } from "../lib/supabase";

config({ path: ".env.local" });

async function main() {
  const slug = resolveDomainSlug(process.env.DOMAIN);
  const domain = await getDomainMeta(slug);
  const supabase = getSupabase();

  const { data: signalsRes } = await supabase
    .from("signals")
    .select("id, title, summary, category, relevance, event_date, source_url, captured_at, lifecycle")
    .eq("domain_id", domain.id)
    .gte("relevance", 2)
    .order("event_date", { ascending: false });

  const { data: tpActor } = await supabase
    .from("actors")
    .select("id, name")
    .eq("domain_id", domain.id)
    .eq("name", "TransPerfect")
    .single();

  const signalIds = (signalsRes ?? []).map((s) => s.id as string);
  const { data: links } = await supabase
    .from("signal_actors")
    .select("signal_id, actor_id")
    .in("signal_id", signalIds);

  const { data: actors } = await supabase
    .from("actors")
    .select("id, name, domain_id")
    .eq("domain_id", domain.id);

  const actorById = new Map(
    (actors ?? []).map((a) => [a.id as string, { name: a.name as string, domain_id: a.domain_id as string }]),
  );

  const bySignalId = new Map<string, string[]>();
  for (const link of links ?? []) {
    const actor = actorById.get(link.actor_id as string);
    if (!actor || actor.domain_id !== domain.id) continue;
    const names = bySignalId.get(link.signal_id as string) ?? [];
    if (!names.includes(actor.name)) names.push(actor.name);
    bySignalId.set(link.signal_id as string, names);
  }

  const tpLinked = (signalsRes ?? []).filter((s) =>
    (bySignalId.get(s.id as string) ?? []).includes("TransPerfect"),
  );

  console.log(`Market Pulse query (relevance >= 2): ${signalsRes?.length ?? 0} total signals`);
  console.log(`TransPerfect-linked in that set: ${tpLinked.length}`);
  console.log("");

  const signals = dedupeRowsBySourceUrl(
    (signalsRes ?? []).map((signal) => ({
      id: signal.id as string,
      title: signal.title as string,
      summary: signal.summary as string,
      so_what: null,
      category: signal.category as string,
      relevance: signal.relevance as number,
      event_date: signal.event_date as string,
      source_url: signal.source_url as string,
      captured_at: (signal.captured_at as string | null) ?? undefined,
      lifecycle: signal.lifecycle as string | null,
      actor_names: bySignalId.get(signal.id as string) ?? [],
    })),
  );

  const tpSignals = signals.filter((s) => s.actor_names.includes("TransPerfect"));
  console.log(`After URL dedupe — TransPerfect signals: ${tpSignals.length}`);

  const tpBucket: typeof signals = [];
  for (const signal of signals) {
    if (signal.actor_names.includes("TransPerfect")) {
      tpBucket.push(signal);
    }
  }

  const groupedCurrent = groupSignals(tpBucket);
  const groupedScoped = groupSignals(
    tpBucket.map((s) => ({ ...s, actor_names: ["TransPerfect"] })),
  );

  console.log(`After groupSignals (current, multi-actor names): ${groupedCurrent.length}`);
  console.log(`After groupSignals (scoped to TransPerfect):     ${groupedScoped.length}`);
  console.log("");

  const pageData = await getLivingDocumentData(slug);
  const tpCard = pageData.tiers
    .flatMap((t) => t.actors)
    .find((a) => a.name === "TransPerfect");

  console.log(`Living document UI — TransPerfect card: ${tpCard ? "yes" : "NO"}`);
  if (tpCard) {
    console.log(`  Signals on card: ${tpCard.signals.length}`);
    for (const s of tpCard.signals) {
      const src =
        s.source_count && s.source_count > 1 ? ` [${s.source_count} sources]` : "";
      console.log(`    ${s.event_date} rel=${s.relevance} ${s.category}${src}`);
    }
  }
}

main().catch(console.error);
