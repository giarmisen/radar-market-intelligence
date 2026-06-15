import type { EnrichmentResult } from "./types";
import { getSupabase } from "./supabase";

export interface SignalPeer {
  id: string;
  relevance: number;
  captured_at: string;
  source_url: string;
}

export interface UrlDedupeSummary {
  duplicateUrls: number;
  deleted: number;
  kept: number;
}

export interface SourceUrlDedupeRow {
  id: string;
  source_url: string;
  relevance: number;
  captured_at?: string;
}

/** In-memory dedupe for display queries — keep highest relevance per URL. */
export function dedupeRowsBySourceUrl<T extends SourceUrlDedupeRow>(
  rows: T[],
): T[] {
  const byUrl = new Map<string, T[]>();

  for (const row of rows) {
    const peers = byUrl.get(row.source_url) ?? [];
    peers.push(row);
    byUrl.set(row.source_url, peers);
  }

  const kept: T[] = [];

  for (const peers of Array.from(byUrl.values())) {
    if (peers.length === 1) {
      kept.push(peers[0]);
      continue;
    }

    const keeperId = pickKeeperSignalId(
      peers.map((peer) => ({
        id: peer.id,
        relevance: peer.relevance,
        captured_at: peer.captured_at ?? "",
        source_url: peer.source_url,
      })),
      peers[0].id,
      peers[0].relevance,
    );
    const keeper = peers.find((peer) => peer.id === keeperId) ?? peers[0];
    kept.push(keeper);
  }

  return kept;
}

export async function sourceUrlExists(
  domainId: string,
  sourceUrl: string,
): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("signals")
    .select("id")
    .eq("domain_id", domainId)
    .eq("source_url", sourceUrl)
    .maybeSingle();

  if (error) {
    throw new Error(`Source URL lookup failed: ${error.message}`);
  }

  return Boolean(data);
}

/** Pick the signal to keep for a URL group (highest relevance, oldest on tie). */
export function pickKeeperSignalId(
  peers: SignalPeer[],
  candidateId: string,
  candidateRelevance: number,
): string {
  const ranked = peers
    .map((peer) => ({
      id: peer.id,
      relevance: peer.id === candidateId ? candidateRelevance : peer.relevance,
      captured_at: peer.captured_at,
    }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return a.captured_at.localeCompare(b.captured_at);
    });

  return ranked[0]?.id ?? candidateId;
}

export async function loadSignalPeersByUrl(
  domainId: string,
  sourceUrl: string,
): Promise<SignalPeer[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("signals")
    .select("id, relevance, captured_at, source_url")
    .eq("domain_id", domainId)
    .eq("source_url", sourceUrl);

  if (error) {
    throw new Error(`Signal URL lookup failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    relevance: row.relevance as number,
    captured_at: (row.captured_at as string | null) ?? "",
    source_url: row.source_url as string,
  }));
}

export async function deleteSignals(signalIds: string[]): Promise<void> {
  if (signalIds.length === 0) {
    return;
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("signals").delete().in("id", signalIds);

  if (error) {
    throw new Error(`Signal delete failed: ${error.message}`);
  }
}

async function getDomainId(slug: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("domains")
    .select("id")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    throw new Error(`Domain not found: ${slug}`);
  }

  return data.id;
}

/** Remove duplicate rows per source_url, keeping highest relevance (oldest on tie). */
export async function dedupeDomainBySourceUrl(
  domainSlug: string,
): Promise<UrlDedupeSummary> {
  const domainId = await getDomainId(domainSlug);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("signals")
    .select("id, source_url, relevance, captured_at")
    .eq("domain_id", domainId);

  if (error) {
    throw new Error(`Failed to load signals: ${error.message}`);
  }

  const byUrl = new Map<string, SignalPeer[]>();

  for (const row of data ?? []) {
    const sourceUrl = row.source_url as string;
    if (sourceUrl.startsWith("radar://seed/")) {
      continue;
    }

    const peer: SignalPeer = {
      id: row.id as string,
      source_url: row.source_url as string,
      relevance: row.relevance as number,
      captured_at: (row.captured_at as string | null) ?? "",
    };
    const peers = byUrl.get(peer.source_url) ?? [];
    peers.push(peer);
    byUrl.set(peer.source_url, peers);
  }

  const toDelete: string[] = [];
  let duplicateUrls = 0;

  for (const peers of Array.from(byUrl.values())) {
    if (peers.length <= 1) {
      continue;
    }

    duplicateUrls += 1;
    const keeperId = pickKeeperSignalId(peers, peers[0].id, peers[0].relevance);
    for (const peer of peers) {
      if (peer.id !== keeperId) {
        toDelete.push(peer.id);
      }
    }
  }

  await deleteSignals(toDelete);

  return {
    duplicateUrls,
    deleted: toDelete.length,
    kept: (data?.length ?? 0) - toDelete.length,
  };
}

export async function getFingerprintConflict(
  domainId: string,
  fingerprint: string,
  excludeSignalId: string,
): Promise<{ id: string; source_url: string } | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("signals")
    .select("id, source_url")
    .eq("domain_id", domainId)
    .eq("event_fingerprint", fingerprint)
    .neq("id", excludeSignalId)
    .maybeSingle();

  if (error) {
    throw new Error(`Fingerprint lookup failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    source_url: data.source_url as string,
  };
}

/** Resolve same-URL duplicates after re-enrichment; returns the row that was updated. */
export async function consolidateBySourceUrl(params: {
  domainId: string;
  sourceUrl: string;
  candidateId: string;
  candidateRelevance: number;
}): Promise<{ keeperId: string; deletedIds: string[] }> {
  const peers = await loadSignalPeersByUrl(params.domainId, params.sourceUrl);
  const keeperId = pickKeeperSignalId(
    peers,
    params.candidateId,
    params.candidateRelevance,
  );
  const deletedIds = peers
    .map((peer) => peer.id)
    .filter((id) => id !== keeperId);

  await deleteSignals(deletedIds);

  return { keeperId, deletedIds };
}

export type ReEnrichmentFields = Pick<
  EnrichmentResult,
  | "category"
  | "geography"
  | "relevance"
  | "summary"
  | "so_what"
  | "lifecycle"
  | "scheduled_date"
  | "discard_reason"
  | "worth_watching"
  | "event_fingerprint"
  | "actors"
>;
