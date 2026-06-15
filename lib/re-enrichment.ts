import { loadDomainConfig } from "./config-loader";
import {
  enrichSignal,
  enrichmentContextFromConfig,
} from "./enrichment";
import {
  deleteSignals,
  getFingerprintConflict,
  pickKeeperSignalId,
  loadSignalPeersByUrl,
  type ReEnrichmentFields,
} from "./signal-dedupe";
import { getSupabase } from "./supabase";

export interface ReEnrichSummary {
  processed: number;
  updated: number;
  deleted_duplicates: number;
  errors: string[];
}

interface DbSignal {
  id: string;
  event_date: string;
  title: string;
  raw_content: string | null;
  source_url: string;
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

async function loadActorMap(domainId: string): Promise<Map<string, string>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("actors")
    .select("id, name")
    .eq("domain_id", domainId);

  if (error) {
    throw new Error(`Failed to load actors: ${error.message}`);
  }

  return new Map((data ?? []).map((actor) => [actor.name, actor.id]));
}

async function loadSignals(domainId: string): Promise<DbSignal[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("signals")
    .select("id, event_date, title, raw_content, source_url")
    .eq("domain_id", domainId)
    .order("event_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to load signals: ${error.message}`);
  }

  return data ?? [];
}

async function applyEnrichmentToSignal(params: {
  domainId: string;
  signalId: string;
  sourceUrl: string;
  enrichment: ReEnrichmentFields;
  actorMap: Map<string, string>;
}): Promise<void> {
  const supabase = getSupabase();
  const { domainId, signalId, sourceUrl, enrichment, actorMap } = params;

  let skipFingerprint = false;
  const fingerprintConflict = await getFingerprintConflict(
    domainId,
    enrichment.event_fingerprint,
    signalId,
  );

  if (fingerprintConflict) {
    if (fingerprintConflict.source_url === sourceUrl) {
      await deleteSignals([fingerprintConflict.id]);
    } else {
      skipFingerprint = true;
    }
  }

  const { error: updateError } = await supabase
    .from("signals")
    .update({
      category: enrichment.category,
      geography: enrichment.geography.length > 0 ? enrichment.geography : null,
      relevance: enrichment.relevance,
      summary: enrichment.summary,
      so_what: enrichment.so_what,
      lifecycle: enrichment.lifecycle,
      scheduled_date: enrichment.scheduled_date,
      discard_reason: enrichment.discard_reason,
      worth_watching: enrichment.worth_watching,
      ...(skipFingerprint ? {} : { event_fingerprint: enrichment.event_fingerprint }),
    })
    .eq("id", signalId);

  if (updateError) {
    throw new Error(`Signal update failed: ${updateError.message}`);
  }

  const { error: deleteLinksError } = await supabase
    .from("signal_actors")
    .delete()
    .eq("signal_id", signalId);

  if (deleteLinksError) {
    throw new Error(`signal_actors delete failed: ${deleteLinksError.message}`);
  }

  const actorIds = enrichment.actors
    .map((name) => actorMap.get(name))
    .filter((id): id is string => Boolean(id));

  if (actorIds.length === 0) {
    return;
  }

  const { error: linkError } = await supabase.from("signal_actors").insert(
    actorIds.map((actorId) => ({
      signal_id: signalId,
      actor_id: actorId,
    })),
  );

  if (linkError) {
    throw new Error(`signal_actors insert failed: ${linkError.message}`);
  }
}

async function updateSignal(params: {
  domainId: string;
  signalId: string;
  sourceUrl: string;
  enrichment: ReEnrichmentFields;
  actorMap: Map<string, string>;
}): Promise<{ keeperId: string; deletedIds: string[] }> {
  const peers = await loadSignalPeersByUrl(params.domainId, params.sourceUrl);
  const keeperId = pickKeeperSignalId(
    peers,
    params.signalId,
    params.enrichment.relevance,
  );

  await applyEnrichmentToSignal({
    domainId: params.domainId,
    signalId: keeperId,
    sourceUrl: params.sourceUrl,
    enrichment: params.enrichment,
    actorMap: params.actorMap,
  });

  const deletedIds = peers
    .map((peer) => peer.id)
    .filter((id) => id !== keeperId);

  await deleteSignals(deletedIds);

  return { keeperId, deletedIds };
}

/** Re-run enrichment on stored signals for a domain (uses raw_content). */
export async function runReEnrich(
  domainSlug: string,
  options?: { sourceUrls?: string[] },
): Promise<ReEnrichSummary> {
  const config = loadDomainConfig(domainSlug);
  const domainId = await getDomainId(domainSlug);
  const actorMap = await loadActorMap(domainId);
  const enrichmentContext = enrichmentContextFromConfig(config);
  const urlFilter = options?.sourceUrls?.length
    ? new Set(options.sourceUrls)
    : null;
  const signals = (await loadSignals(domainId)).filter(
    (signal) => !urlFilter || urlFilter.has(signal.source_url),
  );

  const processedUrls = new Set<string>();
  let processed = 0;
  let updated = 0;
  let deleted_duplicates = 0;
  const errors: string[] = [];

  for (const signal of signals) {
    if (processedUrls.has(signal.source_url)) {
      continue;
    }

    processed += 1;
    processedUrls.add(signal.source_url);

    const rawText = signal.raw_content?.trim()
      ? `${signal.title}\n\n${signal.raw_content}`
      : signal.title;

    try {
      const enrichment = await enrichSignal({
        rawText,
        eventDate: signal.event_date,
        context: enrichmentContext,
      });

      const peers = await loadSignalPeersByUrl(domainId, signal.source_url);
      const keeperId = pickKeeperSignalId(
        peers,
        signal.id,
        enrichment.relevance,
      );

      const result = await updateSignal({
        domainId,
        signalId: keeperId,
        sourceUrl: signal.source_url,
        enrichment,
        actorMap,
      });

      updated += 1;
      deleted_duplicates += result.deletedIds.length;
    } catch (error) {
      errors.push(
        `signal (${signal.source_url}): ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return { processed, updated, deleted_duplicates, errors };
}
