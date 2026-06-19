import { loadDomainConfig } from "../config-loader";
import {
  enrichSignal,
  enrichmentContextFromConfig,
} from "../enrichment";
import { sourceUrlExists } from "../signal-dedupe";
import {
  maxExistingTemporalRelevance,
  shouldSkipTemporalDedupe,
  type TemporalDedupeRecord,
} from "../signal-temporal-dedupe";
import {
  findSemanticDedupeCandidates,
  isSameEvent,
  mergeIntoGroupedSources,
  toEnrichedSignal,
} from "../semantic-dedupe";
import { getSupabase } from "../supabase";
import type { DomainConfig, IngestRawItem } from "../types";
import {
  ingestEdgar,
  parseEdgarQueryFromSourceUrl,
} from "./edgar";
import { type IngestDateRange, parseIngestDateRange } from "./date-range";
import { type GmailIngestDebug, ingestGmail } from "./gmail";
import { type RssIngestDebug, ingestRss } from "./rss";
// import { ingestSearch } from "./search";

export interface IngestDebugInfo {
  rss?: RssIngestDebug;
  gmail?: GmailIngestDebug;
}

export interface IngestSummary {
  processed: number;
  inserted: number;
  skipped_dedupe: number;
  skipped_temporal_dedupe: number;
  skipped_semantic_dedupe: number;
  errors: string[];
  date_range: IngestDateRange;
  debug: IngestDebugInfo;
  collected: {
    edgar: number;
    rss: number;
    gmail: number;
    search: number;
    scrape: number;
  };
}

interface DbSource {
  id: string;
  type: string;
  url: string | null;
  label: string;
}

interface DbActor {
  id: string;
  name: string;
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

async function loadActiveSources(domainId: string): Promise<DbSource[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sources")
    .select("id, type, url, label")
    .eq("domain_id", domainId)
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to load sources: ${error.message}`);
  }

  return data ?? [];
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

  return new Map((data as DbActor[]).map((actor) => [actor.name, actor.id]));
}

async function fingerprintExists(
  domainId: string,
  fingerprint: string,
): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("signals")
    .select("id")
    .eq("domain_id", domainId)
    .eq("event_fingerprint", fingerprint)
    .maybeSingle();

  if (error) {
    throw new Error(`Fingerprint lookup failed: ${error.message}`);
  }

  return Boolean(data);
}

async function insertEnrichedSignal(params: {
  domainId: string;
  item: IngestRawItem;
  enrichment: Awaited<ReturnType<typeof enrichSignal>>;
  actorMap: Map<string, string>;
}): Promise<void> {
  const supabase = getSupabase();
  const { domainId, item, enrichment, actorMap } = params;

  const { data: signal, error: insertError } = await supabase
    .from("signals")
    .insert({
      domain_id: domainId,
      event_date: item.event_date,
      category: enrichment.category,
      geography: enrichment.geography.length > 0 ? enrichment.geography : null,
      relevance: enrichment.relevance,
      source_id: item.source_id,
      source_url: item.url,
      title: item.title,
      summary: enrichment.summary,
      so_what: enrichment.so_what,
      lifecycle: enrichment.lifecycle,
      scheduled_date: enrichment.scheduled_date,
      discard_reason: enrichment.discard_reason,
      worth_watching: enrichment.worth_watching,
      event_fingerprint: enrichment.event_fingerprint,
      raw_content: item.raw_content,
    })
    .select("id")
    .single();

  if (insertError || !signal) {
    throw new Error(`Signal insert failed: ${insertError?.message}`);
  }

  const actorIds = enrichment.actors
    .map((name) => actorMap.get(name))
    .filter((id): id is string => Boolean(id));

  if (actorIds.length === 0) {
    return;
  }

  const { error: linkError } = await supabase.from("signal_actors").insert(
    actorIds.map((actorId) => ({
      signal_id: signal.id,
      actor_id: actorId,
    })),
  );

  if (linkError) {
    throw new Error(`signal_actors insert failed: ${linkError.message}`);
  }
}

async function collectRawItems(
  config: DomainConfig,
  sources: DbSource[],
  dateRange: IngestDateRange,
): Promise<{
  items: IngestRawItem[];
  counts: IngestSummary["collected"];
  errors: string[];
  debug: IngestDebugInfo;
}> {
  const counts = { edgar: 0, rss: 0, gmail: 0, search: 0, scrape: 0 };
  const errors: string[] = [];
  const debug: IngestDebugInfo = {};
  const items: IngestRawItem[] = [];
  const { fromDate, toDate, explicit } = dateRange;
  const actorNames = config.actors.map((actor) => actor.name);

  console.log(
    `[ingest:pipeline] collecting items for ${fromDate} → ${toDate} explicit=${explicit}`,
  );

  // EDGAR — skip unless domain has a filings source (e.g. rare-earths)
  const filingsSource = sources.find((source) => source.type === "filings");
  if (filingsSource) {
    try {
      const edgarItems = await ingestEdgar({
        sourceId: filingsSource.id,
        actorNames,
        query: filingsSource.url
          ? parseEdgarQueryFromSourceUrl(filingsSource.url)
          : undefined,
        startDate: fromDate,
        endDate: toDate,
      });
      items.push(...edgarItems);
      counts.edgar = edgarItems.length;
    } catch (error) {
      errors.push(
        `edgar: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const rssFeeds = sources
    .filter((source) => source.type === "rss" && source.url)
    .map((source) => ({
      sourceId: source.id,
      url: source.url as string,
    }));

  if (rssFeeds.length > 0) {
    try {
      const rssResult = await ingestRss({
        feeds: rssFeeds,
        fromDate,
        toDate,
        explicit,
      });
      items.push(...rssResult.items);
      counts.rss = rssResult.items.length;
      debug.rss = rssResult.debug;
    } catch (error) {
      errors.push(
        `rss: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const gmailSource = sources.find((source) => source.type === "gmail");
  if (gmailSource) {
    try {
      const gmailResult = await ingestGmail({
        sourceId: gmailSource.id,
        email: gmailSource.url ?? undefined,
        fromDate,
        toDate,
        explicit,
      });
      items.push(...gmailResult.items);
      counts.gmail = gmailResult.items.length;
      debug.gmail = gmailResult.debug;
    } catch (error) {
      errors.push(
        `gmail: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Anthropic web search disabled — re-enable when rate limits allow
  // const searchQueries = config.saved_searches
  //   .map((query) => {
  //     const source = sources.find(
  //       (row) => row.type === "search_query" && row.label === query,
  //     );
  //     if (!source) {
  //       return null;
  //     }
  //     return { sourceId: source.id, query };
  //   })
  //   .filter((row): row is { sourceId: string; query: string } => Boolean(row));
  //
  // if (searchQueries.length > 0) {
  //   try {
  //     const searchItems = await ingestSearch({
  //       queries: searchQueries,
  //       domainName: config.name,
  //       lookbackDays: 7,
  //     });
  //     items.push(...searchItems);
  //     counts.search = searchItems.length;
  //   } catch (error) {
  //     errors.push(
  //       `search: ${error instanceof Error ? error.message : "Unknown error"}`,
  //     );
  //   }
  // }

  // Phase 3: scrape adapter not built yet

  return { items, counts, errors, debug };
}

export async function runIngest(
  domainSlug: string,
  dateRange?: IngestDateRange,
): Promise<IngestSummary> {
  const config = loadDomainConfig(domainSlug);
  const domainId = await getDomainId(domainSlug);
  const sources = await loadActiveSources(domainId);
  const actorMap = await loadActorMap(domainId);
  const enrichmentContext = enrichmentContextFromConfig(config);
  const resolvedDateRange = dateRange ?? parseIngestDateRange(null, null);

  const { items, counts, errors, debug } = await collectRawItems(
    config,
    sources,
    resolvedDateRange,
  );
  const seenFingerprints = new Set<string>();
  const seenUrls = new Set<string>();

  let processed = 0;
  let inserted = 0;
  let skipped_dedupe = 0;
  let skipped_temporal_dedupe = 0;
  let skipped_semantic_dedupe = 0;
  const batchTemporalRecords: TemporalDedupeRecord[] = [];

  for (const item of items) {
    processed += 1;

    try {
      const enrichment = await enrichSignal({
        rawText: `${item.title}\n\n${item.raw_content}`,
        eventDate: item.event_date,
        context: enrichmentContext,
      });

      if (seenUrls.has(item.url)) {
        skipped_dedupe += 1;
        continue;
      }

      const urlExists = await sourceUrlExists(domainId, item.url);
      if (urlExists) {
        seenUrls.add(item.url);
        skipped_dedupe += 1;
        continue;
      }

      if (seenFingerprints.has(enrichment.event_fingerprint)) {
        skipped_dedupe += 1;
        continue;
      }

      const exists = await fingerprintExists(domainId, enrichment.event_fingerprint);
      if (exists) {
        seenFingerprints.add(enrichment.event_fingerprint);
        skipped_dedupe += 1;
        continue;
      }

      const actorIds = enrichment.actors
        .map((name) => actorMap.get(name))
        .filter((id): id is string => Boolean(id));

      const existingTemporalMax = await maxExistingTemporalRelevance({
        domainId,
        category: enrichment.category,
        actorIds,
        eventDate: item.event_date,
      });

      if (
        shouldSkipTemporalDedupe({
          relevance: enrichment.relevance,
          category: enrichment.category,
          actorIds,
          eventDate: item.event_date,
          batchRecords: batchTemporalRecords,
          existingMaxRelevance: existingTemporalMax,
        })
      ) {
        skipped_temporal_dedupe += 1;
        console.log(
          `[ingest:pipeline] skipped_temporal_dedupe url=${item.url} category=${enrichment.category} relevance=${enrichment.relevance}`,
        );
        continue;
      }

      const incoming = toEnrichedSignal(enrichment.summary, enrichment.so_what);
      let mergedSemantically = false;

      if (actorIds.length > 0) {
        const candidates = await findSemanticDedupeCandidates({
          domainId,
          category: enrichment.category,
          actorIds,
          eventDate: item.event_date,
        });

        for (const candidate of candidates) {
          const sameEvent = await isSameEvent(incoming, {
            summary: candidate.summary,
            so_what: candidate.so_what,
          });

          if (!sameEvent) {
            continue;
          }

          await mergeIntoGroupedSources({
            existing: candidate,
            item,
            enrichment,
          });

          skipped_semantic_dedupe += 1;
          mergedSemantically = true;
          console.log(`skipped_semantic_dedupe: ${item.title}`);
          break;
        }
      }

      if (mergedSemantically) {
        seenFingerprints.add(enrichment.event_fingerprint);
        seenUrls.add(item.url);
        continue;
      }

      await insertEnrichedSignal({
        domainId,
        item,
        enrichment,
        actorMap,
      });

      seenFingerprints.add(enrichment.event_fingerprint);
      seenUrls.add(item.url);
      inserted += 1;

      if (actorIds.length > 0) {
        batchTemporalRecords.push({
          actorIds,
          category: enrichment.category,
          eventDate: item.event_date,
          relevance: enrichment.relevance,
        });
      }
    } catch (error) {
      errors.push(
        `item (${item.url}): ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Phase 5: proposal triggers not implemented yet

  return {
    processed,
    inserted,
    skipped_dedupe,
    skipped_temporal_dedupe,
    skipped_semantic_dedupe,
    errors,
    date_range: resolvedDateRange,
    debug,
    collected: counts,
  };
}
