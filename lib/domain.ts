import { resolveDomainSlug } from "./config-loader";
import { getSupabase } from "./supabase";

export async function getDomainId(slug?: string): Promise<string> {
  const domainSlug = resolveDomainSlug(slug);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("domains")
    .select("id, name, slug")
    .eq("slug", domainSlug)
    .single();

  if (error || !data) {
    throw new Error(`Domain not found: ${domainSlug}`);
  }

  return data.id;
}

export async function getDomainMeta(slug?: string): Promise<{
  id: string;
  name: string;
  slug: string;
}> {
  const domainSlug = resolveDomainSlug(slug);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("domains")
    .select("id, name, slug")
    .eq("slug", domainSlug)
    .single();

  if (error || !data) {
    throw new Error(`Domain not found: ${domainSlug}`);
  }

  return data;
}

export async function getPendingProposalsCount(domainId: string): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("domain_id", domainId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`proposals count: ${error.message}`);
  }

  return count ?? 0;
}
