import { getSupabase } from "../lib/supabase";

async function deleteDomain(slug: string): Promise<void> {
  const supabase = getSupabase();

  const { data: domain, error: domainError } = await supabase
    .from("domains")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (domainError) {
    throw new Error(`Domain lookup failed: ${domainError.message}`);
  }

  if (!domain) {
    console.log(`Domain not found: ${slug}`);
    return;
  }

  const domainId = domain.id;

  const { data: signals, error: signalsError } = await supabase
    .from("signals")
    .select("id")
    .eq("domain_id", domainId);

  if (signalsError) {
    throw new Error(`Signals lookup failed: ${signalsError.message}`);
  }

  const signalIds = (signals ?? []).map((row) => row.id);

  if (signalIds.length > 0) {
    const { error: linkError } = await supabase
      .from("signal_actors")
      .delete()
      .in("signal_id", signalIds);

    if (linkError) {
      throw new Error(`signal_actors delete failed: ${linkError.message}`);
    }
  }

  const tables = ["signals", "radar_queries", "sources", "actors"] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("domain_id", domainId);

    if (error) {
      throw new Error(`${table} delete failed: ${error.message}`);
    }
  }

  const { error: domainDeleteError } = await supabase
    .from("domains")
    .delete()
    .eq("id", domainId);

  if (domainDeleteError) {
    throw new Error(`domains delete failed: ${domainDeleteError.message}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      slug,
      deleted_signals: signalIds.length,
    }),
  );
}

const slug = process.argv[2];

if (!slug) {
  console.error("Usage: npx tsx scripts/delete-domain.ts <domain-slug>");
  process.exit(1);
}

deleteDomain(slug).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
