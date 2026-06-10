import { loadDomainConfig, resolveDomainSlug } from "./config-loader";
import { getDomainMeta, getPendingProposalsCount } from "./domain";
import { getSupabase } from "./supabase";
import type { ActorRole } from "./types";

export type ActorStatus =
  | "active"
  | "archived_shutdown"
  | "archived_acquired"
  | "candidate";

export interface ActorProposalFlag {
  id: string;
  type: string;
  rationale: string;
}

export interface RegistryActor {
  id: string;
  name: string;
  role: ActorRole;
  tier: number;
  geography: string[] | null;
  status: ActorStatus;
  pendingProposal: ActorProposalFlag | null;
}

export interface ActorTierSection {
  tier: number;
  label: string;
  actors: RegistryActor[];
}

export interface ActorsPageData {
  domainName: string;
  domainSlug: string;
  tiers: ActorTierSection[];
  pendingProposals: number;
  stats: {
    total: number;
    active: number;
    withProposals: number;
  };
}

const TIER_LABELS: Record<number, string> = {
  0: "Tier 0 — Reference",
  1: "Tier 1 — Focus",
  2: "Tier 2 — Peripheral",
  3: "Tier 3 — Wide radar",
};

export async function getActorsPageData(
  domainSlug?: string,
): Promise<ActorsPageData> {
  const slug = resolveDomainSlug(domainSlug);
  const config = loadDomainConfig(slug);
  const domain = await getDomainMeta(slug);
  const supabase = getSupabase();

  const [actorsRes, proposalsRes] = await Promise.all([
    supabase
      .from("actors")
      .select("id, name, role, tier, geography, status")
      .eq("domain_id", domain.id)
      .order("tier")
      .order("name"),
    supabase
      .from("proposals")
      .select("id, type, rationale, subject_actor_id")
      .eq("domain_id", domain.id)
      .eq("status", "pending"),
  ]);

  if (actorsRes.error) {
    throw new Error(`actors: ${actorsRes.error.message}`);
  }
  if (proposalsRes.error) {
    throw new Error(`proposals: ${proposalsRes.error.message}`);
  }

  const proposalByActor = new Map<string, ActorProposalFlag>();
  for (const proposal of proposalsRes.data ?? []) {
    if (proposal.subject_actor_id) {
      proposalByActor.set(proposal.subject_actor_id, {
        id: proposal.id,
        type: proposal.type,
        rationale: proposal.rationale,
      });
    }
  }

  const actors: RegistryActor[] = (actorsRes.data ?? []).map((actor) => ({
    id: actor.id,
    name: actor.name,
    role: actor.role as ActorRole,
    tier: actor.tier,
    geography: actor.geography,
    status: actor.status as ActorStatus,
    pendingProposal: proposalByActor.get(actor.id) ?? null,
  }));

  const tierNumbers = Array.from(new Set(actors.map((actor) => actor.tier))).sort(
    (a, b) => a - b,
  );

  const tiers: ActorTierSection[] = tierNumbers.map((tier) => ({
    tier,
    label: TIER_LABELS[tier] ?? `Tier ${tier}`,
    actors: actors.filter((actor) => actor.tier === tier),
  }));

  return {
    domainName: config.name,
    domainSlug: slug,
    tiers,
    pendingProposals: await getPendingProposalsCount(domain.id),
    stats: {
      total: actors.length,
      active: actors.filter((actor) => actor.status === "active").length,
      withProposals: actors.filter((actor) => actor.pendingProposal).length,
    },
  };
}
