import { loadDomainConfig, resolveDomainSlug } from "./config-loader";
import { getDomainMeta, getPendingProposalsCount } from "./domain";
import { getSupabase } from "./supabase";
import type { ProposalType } from "./proposals";

export interface EvidenceSignal {
  id: string;
  title: string;
  event_date: string;
  summary: string;
  source_url: string;
  relevance: number;
}

export interface ProposalItem {
  id: string;
  type: ProposalType;
  rationale: string;
  created_at: string;
  subjectLabel: string | null;
  subjectMeta: string | null;
  evidence: EvidenceSignal[];
}

export interface ResolvedProposalItem {
  id: string;
  type: ProposalType;
  status: "approved" | "rejected";
  subjectLabel: string | null;
  resolved_at: string;
}

export interface ProposalsPageData {
  domainName: string;
  domainSlug: string;
  proposals: ProposalItem[];
  resolvedProposals: ResolvedProposalItem[];
  pendingProposals: number;
  stats: {
    pending: number;
    evidence: number;
  };
}

export async function getProposalsPageData(
  domainSlug?: string,
): Promise<ProposalsPageData> {
  const slug = resolveDomainSlug(domainSlug);
  const config = loadDomainConfig(slug);
  const domain = await getDomainMeta(slug);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("proposals")
    .select(
      "id, type, rationale, created_at, evidence_signal_ids, subject_actor_id, subject_source_id",
    )
    .eq("domain_id", domain.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: resolvedData, error: resolvedError } = await supabase
    .from("proposals")
    .select("id, type, status, resolved_at, subject_actor_id, subject_source_id")
    .eq("domain_id", domain.id)
    .in("status", ["approved", "rejected"])
    .order("resolved_at", { ascending: false });

  if (error) {
    throw new Error(`proposals: ${error.message}`);
  }
  if (resolvedError) {
    throw new Error(`resolved proposals: ${resolvedError.message}`);
  }

  const proposalRows = data ?? [];
  const resolvedRows = resolvedData ?? [];
  const actorIds = Array.from(
    new Set(
      [...proposalRows, ...resolvedRows]
        .map((row) => row.subject_actor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const sourceIds = Array.from(
    new Set(
      [...proposalRows, ...resolvedRows]
        .map((row) => row.subject_source_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const evidenceIds = Array.from(
    new Set(proposalRows.flatMap((row) => row.evidence_signal_ids ?? [])),
  );

  const [actorsRes, sourcesRes, signalsRes] = await Promise.all([
    actorIds.length > 0
      ? supabase.from("actors").select("id, name, tier").in("id", actorIds)
      : Promise.resolve({ data: [], error: null }),
    sourceIds.length > 0
      ? supabase.from("sources").select("id, label, url").in("id", sourceIds)
      : Promise.resolve({ data: [], error: null }),
    evidenceIds.length > 0
      ? supabase
          .from("signals")
          .select("id, title, event_date, summary, source_url, relevance")
          .in("id", evidenceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (actorsRes.error) {
    throw new Error(`actors: ${actorsRes.error.message}`);
  }
  if (sourcesRes.error) {
    throw new Error(`sources: ${sourcesRes.error.message}`);
  }
  if (signalsRes.error) {
    throw new Error(`evidence signals: ${signalsRes.error.message}`);
  }

  const actorById = new Map(
    (actorsRes.data ?? []).map((actor) => [actor.id as string, actor]),
  );
  const sourceById = new Map(
    (sourcesRes.data ?? []).map((source) => [source.id as string, source]),
  );
  const evidenceById = new Map(
    (signalsRes.data ?? []).map((signal) => [
      signal.id as string,
      signal as EvidenceSignal,
    ]),
  );

  const proposals: ProposalItem[] = proposalRows.map((row) => {
    const actor = row.subject_actor_id
      ? actorById.get(row.subject_actor_id)
      : null;
    const source = row.subject_source_id
      ? sourceById.get(row.subject_source_id)
      : null;

    let subjectLabel: string | null = null;
    let subjectMeta: string | null = null;

    if (actor) {
      subjectLabel = actor.name as string;
      subjectMeta = `Tier ${actor.tier}`;
    } else if (source) {
      subjectLabel = source.label as string;
      subjectMeta = (source.url as string | null) ?? null;
    }

    const evidence = (row.evidence_signal_ids ?? [])
      .map((id: string) => evidenceById.get(id))
      .filter(
        (signal: EvidenceSignal | undefined): signal is EvidenceSignal =>
          Boolean(signal),
      );

    return {
      id: row.id as string,
      type: row.type as ProposalType,
      rationale: row.rationale as string,
      created_at: row.created_at as string,
      subjectLabel,
      subjectMeta,
      evidence,
    };
  });

  const evidenceCount = proposals.reduce(
    (sum, proposal) => sum + proposal.evidence.length,
    0,
  );

  const resolvedProposals: ResolvedProposalItem[] = resolvedRows
    .filter((row) => Boolean(row.resolved_at))
    .map((row) => {
      const actor = row.subject_actor_id
        ? actorById.get(row.subject_actor_id)
        : null;
      const source = row.subject_source_id
        ? sourceById.get(row.subject_source_id)
        : null;

      const subjectLabel = actor
        ? (actor.name as string)
        : source
          ? (source.label as string)
          : null;

      return {
        id: row.id as string,
        type: row.type as ProposalType,
        status: row.status as "approved" | "rejected",
        subjectLabel,
        resolved_at: row.resolved_at as string,
      };
    });

  return {
    domainName: config.name,
    domainSlug: slug,
    proposals,
    resolvedProposals,
    pendingProposals: await getPendingProposalsCount(domain.id),
    stats: {
      pending: proposals.length,
      evidence: evidenceCount,
    },
  };
}
