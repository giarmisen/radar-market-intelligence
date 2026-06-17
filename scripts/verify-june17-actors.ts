/**
 * Verify June 17+ signal actor links for language-services-ai.
 * npx tsx scripts/verify-june17-actors.ts
 */
import { config } from "dotenv";
import { getSupabase } from "../lib/supabase";

config({ path: ".env.local" });

async function main() {
  const supabase = getSupabase();

  const { data: domain, error: domainError } = await supabase
    .from("domains")
    .select("id")
    .eq("slug", "language-services-ai")
    .single();

  if (domainError || !domain) {
    throw new Error(domainError?.message ?? "domain not found");
  }

  const { data: signals, error: signalsError } = await supabase
    .from("signals")
    .select("id, title, relevance, event_date")
    .eq("domain_id", domain.id)
    .gte("event_date", "2026-06-17")
    .order("event_date", { ascending: false });

  if (signalsError) {
    throw signalsError;
  }

  const signalIds = (signals ?? []).map((s) => s.id as string);
  const { data: links, error: linksError } = await supabase
    .from("signal_actors")
    .select("signal_id, actor_id, actors(name)")
    .in("signal_id", signalIds.length > 0 ? signalIds : ["00000000-0000-0000-0000-000000000000"]);

  if (linksError) {
    throw linksError;
  }

  const actorsBySignal = new Map<string, string[]>();
  for (const link of links ?? []) {
    const actor = link.actors as unknown as { name: string } | null;
    const name = actor?.name;
    if (!name) continue;
    const existing = actorsBySignal.get(link.signal_id as string) ?? [];
    existing.push(name);
    actorsBySignal.set(link.signal_id as string, existing);
  }

  console.log("June 17+ signals with actor links:\n");
  console.log("title | relevance | event_date | actor");
  console.log("-".repeat(80));

  for (const signal of signals ?? []) {
    const actors = actorsBySignal.get(signal.id as string) ?? [];
    console.log(
      `${(signal.title as string)?.slice(0, 50)} | ${signal.relevance} | ${signal.event_date} | ${actors.length > 0 ? actors.join(", ") : "(none)"}`,
    );
  }

  const june17Rel3 = (signals ?? []).filter(
    (s) => s.event_date === "2026-06-17" && s.relevance === 3,
  );
  console.log(`\nJune 17 relevance=3 signals: ${june17Rel3.length}`);
  for (const s of june17Rel3) {
    const actors = actorsBySignal.get(s.id as string) ?? [];
    const hasTransPerfect = actors.includes("TransPerfect");
    console.log(`  ${s.id} TransPerfect=${hasTransPerfect} actors=[${actors.join(", ")}]`);
    console.log(`  title: ${s.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
