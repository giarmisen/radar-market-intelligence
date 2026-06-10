import { loadDomainConfig, resolveDomainSlug } from "./config-loader";
import { actorNameToSlug } from "./actor-slug";
import { getDomainMeta, getPendingProposalsCount } from "./domain";
import { dedupeRowsBySourceUrl } from "./signal-dedupe";
import { getSupabase } from "./supabase";
import type { ActorRole, SignalCategory } from "./types";

export interface ActorProfileRecord {
  description: string;
  business_model: string;
  ai_strategy: string;
  recent_moves: string;
  revenue_usd: number | null;
  revenue_year: number | null;
  headcount_approx: string | null;
  hq: string | null;
  core_products: string[];
  core_technology: string[];
  key_markets: string[];
  updated_at: string | null;
}

export interface ActorProfileSignal {
  id: string;
  title: string;
  summary: string;
  so_what: string | null;
  category: SignalCategory;
  relevance: number;
  event_date: string;
  lifecycle: string | null;
  source_url: string;
}

export interface ActorProfileActor {
  id: string;
  name: string;
  slug: string;
  role: ActorRole;
  tier: number;
  geography: string[] | null;
  status: string;
}

export interface ActorProfilePageData {
  domainName: string;
  domainSlug: string;
  actor: ActorProfileActor;
  profile: ActorProfileRecord | null;
  signals: ActorProfileSignal[];
  pendingProposals: number;
  stats: {
    signals: number;
    critical: number;
  };
}

export interface ActorCompareOption {
  slug: string;
  name: string;
  tier: number;
  hasProfile: boolean;
}

export interface ActorComparePageData {
  domainName: string;
  domainSlug: string;
  options: ActorCompareOption[];
  pendingProposals: number;
}

async function loadActorIdMap(
  domainId: string,
): Promise<Map<string, { id: string; name: string }>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("actors")
    .select("id, name")
    .eq("domain_id", domainId);

  if (error) {
    throw new Error(`actors: ${error.message}`);
  }

  const map = new Map<string, { id: string; name: string }>();
  for (const actor of data ?? []) {
    map.set(actorNameToSlug(actor.name), { id: actor.id, name: actor.name });
  }
  return map;
}

export async function resolveActorBySlug(
  domainId: string,
  slug: string,
): Promise<{ id: string; name: string } | null> {
  const map = await loadActorIdMap(domainId);
  return map.get(slug) ?? null;
}

function mapProfile(row: Record<string, unknown>): ActorProfileRecord {
  return {
    description: (row.description as string) ?? "",
    business_model: (row.business_model as string) ?? "",
    ai_strategy: (row.ai_strategy as string) ?? "",
    recent_moves: (row.recent_moves as string) ?? "",
    revenue_usd: (row.revenue_usd as number | null) ?? null,
    revenue_year: (row.revenue_year as number | null) ?? null,
    headcount_approx: (row.headcount_approx as string | null) ?? null,
    hq: (row.hq as string | null) ?? null,
    core_products: (row.core_products as string[]) ?? [],
    core_technology: (row.core_technology as string[]) ?? [],
    key_markets: (row.key_markets as string[]) ?? [],
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

async function loadActorSignals(
  domainId: string,
  actorId: string,
): Promise<ActorProfileSignal[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("signals")
    .select(
      `
      id,
      title,
      summary,
      so_what,
      category,
      relevance,
      event_date,
      lifecycle,
      source_url,
      captured_at,
      signal_actors!inner (
        actor_id
      )
    `,
    )
    .eq("domain_id", domainId)
    .eq("signal_actors.actor_id", actorId)
    .order("event_date", { ascending: false });

  if (error) {
    throw new Error(`signals: ${error.message}`);
  }

  const rows = dedupeRowsBySourceUrl(
    (data ?? []).map((signal) => ({
      id: signal.id as string,
      title: signal.title as string,
      summary: signal.summary as string,
      so_what: signal.so_what as string | null,
      category: signal.category as SignalCategory,
      relevance: signal.relevance as number,
      event_date: signal.event_date as string,
      lifecycle: signal.lifecycle as string | null,
      source_url: signal.source_url as string,
      captured_at: (signal.captured_at as string | null) ?? undefined,
    })),
  );

  return rows;
}

export async function getActorProfilePageData(
  actorSlug: string,
  domainSlug?: string,
): Promise<ActorProfilePageData | null> {
  const slug = resolveDomainSlug(domainSlug);
  const config = loadDomainConfig(slug);
  const domain = await getDomainMeta(slug);
  const supabase = getSupabase();

  const resolved = await resolveActorBySlug(domain.id, actorSlug);
  if (!resolved) {
    return null;
  }

  const [actorRes, profileRes, signals] = await Promise.all([
    supabase
      .from("actors")
      .select("id, name, role, tier, geography, status")
      .eq("id", resolved.id)
      .single(),
    supabase
      .from("actor_profiles")
      .select(
        "description, business_model, ai_strategy, recent_moves, revenue_usd, revenue_year, headcount_approx, hq, core_products, core_technology, key_markets, updated_at",
      )
      .eq("actor_id", resolved.id)
      .maybeSingle(),
    loadActorSignals(domain.id, resolved.id),
  ]);

  if (actorRes.error || !actorRes.data) {
    throw new Error(`actor: ${actorRes.error?.message ?? "not found"}`);
  }
  if (profileRes.error) {
    throw new Error(`actor_profiles: ${profileRes.error.message}`);
  }

  const actor = actorRes.data;

  return {
    domainName: config.name,
    domainSlug: slug,
    actor: {
      id: actor.id,
      name: actor.name,
      slug: actorNameToSlug(actor.name),
      role: actor.role as ActorRole,
      tier: actor.tier,
      geography: actor.geography,
      status: actor.status,
    },
    profile: profileRes.data ? mapProfile(profileRes.data) : null,
    signals,
    pendingProposals: await getPendingProposalsCount(domain.id),
    stats: {
      signals: signals.length,
      critical: signals.filter((signal) => signal.relevance === 3).length,
    },
  };
}

export async function getActorComparePageData(
  domainSlug?: string,
): Promise<ActorComparePageData> {
  const slug = resolveDomainSlug(domainSlug);
  const config = loadDomainConfig(slug);
  const domain = await getDomainMeta(slug);
  const supabase = getSupabase();

  const [actorsRes, profilesRes] = await Promise.all([
    supabase
      .from("actors")
      .select("id, name, tier")
      .eq("domain_id", domain.id)
      .eq("tier", 1)
      .order("name"),
    supabase.from("actor_profiles").select("actor_id"),
  ]);

  if (actorsRes.error) {
    throw new Error(`actors: ${actorsRes.error.message}`);
  }
  if (profilesRes.error) {
    throw new Error(`actor_profiles: ${profilesRes.error.message}`);
  }

  const profileActorIds = new Set(
    (profilesRes.data ?? []).map((row) => row.actor_id as string),
  );

  const options: ActorCompareOption[] = (actorsRes.data ?? []).map((actor) => ({
    slug: actorNameToSlug(actor.name),
    name: actor.name,
    tier: actor.tier,
    hasProfile: profileActorIds.has(actor.id),
  }));

  return {
    domainName: config.name,
    domainSlug: slug,
    options,
    pendingProposals: await getPendingProposalsCount(domain.id),
  };
}

export async function getActorProfilesForCompare(
  slugs: string[],
  domainSlug?: string,
): Promise<ActorProfilePageData[]> {
  const unique = Array.from(new Set(slugs)).slice(0, 3);
  const results: ActorProfilePageData[] = [];

  for (const actorSlug of unique) {
    const data = await getActorProfilePageData(actorSlug, domainSlug);
    if (data) {
      results.push(data);
    }
  }

  return results;
}
