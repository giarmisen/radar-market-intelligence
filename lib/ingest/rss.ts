import Parser from "rss-parser";
import type { IngestRawItem } from "../types";

const DEFAULT_LOOKBACK_DAYS = 7;
/** TEMP: raised for RSS backfill */
const DEFAULT_MAX_ITEMS_PER_FEED = 50;

const RSS_USER_AGENT =
  process.env.RSS_USER_AGENT?.trim() ||
  "Radar Market Intelligence radar-market-skill/1.0 (contact: analyst@localhost)";

export interface RssFeedInput {
  sourceId: string;
  url: string;
}

export interface RssIngestParams {
  feeds: RssFeedInput[];
  fromDate?: string;
  toDate?: string;
  /** @deprecated Use fromDate */
  sinceDate?: string;
  maxItemsPerFeed?: number;
}

export interface RssIngestDebug {
  fromDate: string;
  toDate: string;
  filteredByDate: number;
  filteredNoDate: number;
  filteredOther: number;
  kept: number;
  feeds: Array<{
    url: string;
    total: number;
    kept: number;
    filteredByDate: number;
    filteredNoDate: number;
  }>;
}

export interface RssIngestResult {
  items: IngestRawItem[];
  debug: RssIngestDebug;
}

const parser = new Parser({
  timeout: 20_000,
  headers: {
    "User-Agent": RSS_USER_AGENT,
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
  },
});

function defaultSinceDate(lookbackDays = DEFAULT_LOOKBACK_DAYS): string {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - lookbackDays);
  return since.toISOString().slice(0, 10);
}

function parseItemDate(item: Parser.Item): string | null {
  const raw = item.isoDate ?? item.pubDate;
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function itemRawContent(item: Parser.Item): string {
  const content =
    item.contentSnippet?.trim() ||
    item.content?.trim() ||
    item.summary?.trim() ||
    "";

  if (content) {
    return content;
  }

  return item.title?.trim() ?? "";
}

function itemUrl(item: Parser.Item, feedUrl: string): string | null {
  const link = item.link?.trim() || item.guid?.trim();
  if (!link) {
    return null;
  }

  try {
    return new URL(link, feedUrl).toString();
  } catch {
    return link;
  }
}

/**
 * Standard RSS/Atom parse. Feed URLs and source IDs come from domain sources config.
 */
export async function ingestRss(params: RssIngestParams): Promise<RssIngestResult> {
  const fromDate = params.fromDate ?? params.sinceDate ?? defaultSinceDate();
  const toDate = params.toDate ?? new Date().toISOString().slice(0, 10);
  const maxItemsPerFeed = params.maxItemsPerFeed ?? DEFAULT_MAX_ITEMS_PER_FEED;

  const debug: RssIngestDebug = {
    fromDate,
    toDate,
    filteredByDate: 0,
    filteredNoDate: 0,
    filteredOther: 0,
    kept: 0,
    feeds: [],
  };

  if (params.feeds.length === 0) {
    console.log("[ingest:rss] no feeds configured");
    return { items: [], debug };
  }

  const items: IngestRawItem[] = [];
  const seenUrls = new Set<string>();
  const feedErrors: string[] = [];

  console.log("[ingest:rss] date filter disabled (backfill mode)");

  for (const feed of params.feeds) {
    const feedDebug = {
      url: feed.url,
      total: 0,
      kept: 0,
      filteredByDate: 0,
      filteredNoDate: 0,
    };

    let parsedFeed: Parser.Output<Parser.Item>;
    try {
      parsedFeed = await parser.parseURL(feed.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown RSS parse error";
      feedErrors.push(`${feed.url}: ${message}`);
      continue;
    }

    let count = 0;
    for (const entry of parsedFeed.items ?? []) {
      feedDebug.total += 1;

      if (count >= maxItemsPerFeed) {
        debug.filteredOther += 1;
        continue;
      }

      const eventDate = parseItemDate(entry) ?? new Date().toISOString().slice(0, 10);

      const url = itemUrl(entry, feed.url);
      if (!url || seenUrls.has(url)) {
        debug.filteredOther += 1;
        continue;
      }

      const title = entry.title?.trim();
      const rawContent = itemRawContent(entry);
      if (!title || !rawContent) {
        debug.filteredOther += 1;
        continue;
      }

      seenUrls.add(url);
      items.push({
        title,
        url,
        raw_content: rawContent,
        source_id: feed.sourceId,
        event_date: eventDate,
      });
      count += 1;
      debug.kept += 1;
      feedDebug.kept += 1;
    }

    debug.feeds.push(feedDebug);
    console.log(
      `[ingest:rss] ${feed.url}: total=${feedDebug.total} kept=${feedDebug.kept} filteredByDate=${feedDebug.filteredByDate} filteredNoDate=${feedDebug.filteredNoDate}`,
    );
  }

  console.log(
    `[ingest:rss] summary kept=${debug.kept} filteredByDate=${debug.filteredByDate} filteredNoDate=${debug.filteredNoDate} filteredOther=${debug.filteredOther}`,
  );

  if (items.length === 0 && feedErrors.length > 0) {
    throw new Error(`RSS feed failed (${feedErrors[0]})`);
  }

  return { items, debug };
}
