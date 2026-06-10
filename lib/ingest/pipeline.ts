import { loadDomainConfig } from "../config-loader";
import {
  enrichSignal,
  enrichmentContextFromConfig,
} from "../enrichment";
import { sourceUrlExists } from "../signal-dedupe";
import { getSupabase } from "../supabase";
import type { DomainConfig, IngestRawItem } from "../types";
import {
  defaultEdgarDateRange,
  ingestEdgar,
  parseEdgarQueryFromSourceUrl,
} from "./edgar";
import { ingestRss } from "./rss";
// import { ingestSearch } from "./search";

const DEFAULT_LOOKBACK_DAYS = 7;

export interface IngestSummary {
  processed: number;
  inserted: number;
  skipped_dedupe: number;
  errors: string[];
  collected: {
    edgar: number;
    rss: number;
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
): Promise<{ items: IngestRawItem[]; counts: IngestSummary["collected"]; errors: string[] }> {
  const counts = { edgar: 0, rss: 0, search: 0, scrape: 0 };
  const errors: string[] = [];
  const items: IngestRawItem[] = [];
  const { startDate, endDate } = defaultEdgarDateRange(DEFAULT_LOOKBACK_DAYS);
  const sinceDate = startDate;
  const actorNames = config.actors.map((actor) => actor.name);

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
        startDate,
        endDate,
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
      const rssItems = await ingestRss({ feeds: rssFeeds, sinceDate });
      items.push(...rssItems);
      counts.rss = rssItems.length;
    } catch (error) {
      errors.push(
        `rss: ${error instanceof Error ? error.message : "Unknown error"}`,
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
  //       lookbackDays: DEFAULT_LOOKBACK_DAYS,
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

  return { items, counts, errors };
}

export async function runIngest(domainSlug: string): Promise<IngestSummary> {
  const config = loadDomainConfig(domainSlug);
  const domainId = await getDomainId(domainSlug);
  const sources = await loadActiveSources(domainId);
  const actorMap = await loadActorMap(domainId);
  const enrichmentContext = enrichmentContextFromConfig(config);

  const { items, counts, errors } = await collectRawItems(config, sources);
  const seenFingerprints = new Set<string>();
  const seenUrls = new Set<string>();

  let processed = 0;
  let inserted = 0;
  let skipped_dedupe = 0;

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

      await insertEnrichedSignal({
        domainId,
        item,
        enrichment,
        actorMap,
      });

      seenFingerprints.add(enrichment.event_fingerprint);
      seenUrls.add(item.url);
      inserted += 1;
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
    errors,
    collected: counts,
  };
}
