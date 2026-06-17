/**
 * Run the Market Pulse signals verification query.
 * npx tsx scripts/verify-signals-query.ts
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

  const { data, error } = await supabase
    .from("signals")
    .select("id, title, relevance, event_date, category")
    .eq("domain_id", domain.id)
    .gte("relevance", 2)
    .order("event_date", { ascending: false });

  if (error) {
    throw error;
  }

  console.log(`signals relevance >= 2: ${data?.length ?? 0} rows\n`);
  for (const row of data ?? []) {
    console.log(
      `${row.event_date} rel=${row.relevance} ${row.id} ${(row.title as string)?.slice(0, 72)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
