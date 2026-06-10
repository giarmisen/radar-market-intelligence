import type { IngestRawItem } from "../types";

const EFTS_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";
const DEFAULT_QUERY = '"rare earth"';
const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_MAX_RESULTS = 50;
const SEARCH_PAGE_SIZE = 100;
const EXCERPT_MAX_LENGTH = 2000;
const FETCH_DELAY_MS = 120;

const SEC_USER_AGENT =
  process.env.EDGAR_USER_AGENT?.trim() ||
  "Radar Market Intelligence radar-market-skill/1.0 (contact: analyst@localhost)";

export interface EdgarIngestParams {
  sourceId: string;
  actorNames: string[];
  query?: string;
  startDate?: string;
  endDate?: string;
  maxResults?: number;
}

interface EdgarHitSource {
  ciks?: string[];
  display_names?: string[];
  file_date?: string;
  form?: string;
  file_description?: string | null;
  adsh?: string;
  root_forms?: string[];
}

interface EdgarSearchHit {
  _id: string;
  _source: EdgarHitSource;
}

interface EdgarSearchResponse {
  hits?: {
    total?: { value?: number };
    hits?: EdgarSearchHit[];
  };
}

export function parseEdgarQueryFromSourceUrl(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl);
    const q = parsed.searchParams.get("q");
    if (q) {
      return q;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_QUERY;
}

export function defaultEdgarDateRange(lookbackDays = DEFAULT_LOOKBACK_DAYS): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - lookbackDays);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchesTrackedActor(
  displayNames: string[],
  actorNames: string[],
): string | null {
  const haystack = normalizeText(displayNames.join(" "));

  for (const actorName of actorNames) {
    if (haystack.includes(normalizeText(actorName))) {
      return actorName;
    }
  }

  return null;
}

function parseHitId(hitId: string): { adsh: string; filename: string } {
  const [adsh, filename] = hitId.split(":");
  if (!adsh || !filename) {
    throw new Error(`Invalid EDGAR hit id: ${hitId}`);
  }
  return { adsh, filename };
}

function filingForm(hit: EdgarSearchHit): string {
  return (hit._source.form ?? hit._source.root_forms?.[0] ?? "")
    .toUpperCase()
    .trim();
}

function isForm4(form: string): boolean {
  const normalized = form.replace(/\s+/g, "");
  return (
    normalized === "4" ||
    normalized === "4/A" ||
    normalized.startsWith("4/A") ||
    normalized === "4A"
  );
}

function isEightK(form: string): boolean {
  return form.startsWith("8-K");
}

function isPressReleaseOrEarnings(hit: EdgarSearchHit): boolean {
  const description = normalizeText(hit._source.file_description ?? "");
  const filename = parseHitId(hit._id).filename.toLowerCase();

  const keywords = [
    "press release",
    "earnings",
    "financial results",
    "results of operations",
    "quarterly results",
    "annual results",
    "item 2.02",
  ];

  if (keywords.some((keyword) => description.includes(keyword))) {
    return true;
  }

  if (description.includes("ex-99") || description.includes("ex 99")) {
    return true;
  }

  return /ex\d*99/.test(filename);
}

/** Keep 8-K press releases and earnings exhibits; skip XML and Form 4. */
export function isProcessableEdgarFiling(hit: EdgarSearchHit): boolean {
  let filename: string;
  try {
    filename = parseHitId(hit._id).filename.toLowerCase();
  } catch {
    return false;
  }

  if (filename.endsWith(".xml")) {
    return false;
  }

  const form = filingForm(hit);
  if (isForm4(form)) {
    return false;
  }

  if (!isEightK(form)) {
    return false;
  }

  return isPressReleaseOrEarnings(hit);
}

export function buildEdgarFilingUrl(hit: EdgarSearchHit): string {
  const { adsh, filename } = parseHitId(hit._id);
  const cik = hit._source.ciks?.[0];
  if (!cik) {
    throw new Error(`Missing CIK for EDGAR hit: ${hit._id}`);
  }

  const cikPath = String(parseInt(cik, 10));
  const adshPath = adsh.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cikPath}/${adshPath}/${filename}`;
}

function buildTitle(hit: EdgarSearchHit, matchedActor: string): string {
  const source = hit._source;
  const company = source.display_names?.[0] ?? matchedActor;
  const form = source.form ?? source.root_forms?.[0] ?? "Filing";
  const description = source.file_description?.trim();
  const label = description ? `: ${description}` : "";

  return `${company} — ${form}${label}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractExcerpt(text: string, query: string): string {
  const normalizedQuery = query.replace(/"/g, "").trim().toLowerCase();
  const normalizedText = text.toLowerCase();
  const idx = normalizedText.indexOf(normalizedQuery);

  if (idx >= 0) {
    const start = Math.max(0, idx - 300);
    return text.slice(start, start + EXCERPT_MAX_LENGTH).trim();
  }

  return text.slice(0, EXCERPT_MAX_LENGTH).trim();
}

async function secFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "User-Agent": SEC_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,text/plain,application/pdf,*/*",
    },
  });
}

async function fetchFilingExcerpt(
  url: string,
  query: string,
  metadata: EdgarHitSource,
): Promise<string> {
  if (url.toLowerCase().endsWith(".pdf")) {
    const company = metadata.display_names?.[0] ?? "Filer";
    const form = metadata.form ?? "filing";
    const description = metadata.file_description?.trim();
    return `${company} — ${form}${description ? ` (${description})` : ""}. PDF filing matched ${query}.`;
  }

  const response = await secFetch(url);
  if (!response.ok) {
    throw new Error(`SEC filing fetch failed (${response.status}): ${url}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (contentType.includes("pdf") || body.startsWith("%PDF")) {
    const company = metadata.display_names?.[0] ?? "Filer";
    return `${company} PDF filing matched ${query}.`;
  }

  return extractExcerpt(stripHtml(body), query);
}

async function searchEdgarPage(params: {
  query: string;
  startDate: string;
  endDate: string;
  from: number;
  size: number;
}): Promise<EdgarSearchResponse> {
  const url = new URL(EFTS_SEARCH_URL);
  url.searchParams.set("q", params.query);
  url.searchParams.set("dateRange", "custom");
  url.searchParams.set("startdt", params.startDate);
  url.searchParams.set("enddt", params.endDate);
  url.searchParams.set("from", String(params.from));
  url.searchParams.set("size", String(params.size));
  url.searchParams.set("forms", "8-K");

  const response = await secFetch(url.toString());
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`EDGAR search failed (${response.status}): ${body}`);
  }

  return (await response.json()) as EdgarSearchResponse;
}

async function collectMatchedHits(params: {
  query: string;
  startDate: string;
  endDate: string;
  actorNames: string[];
  maxResults: number;
}): Promise<Array<{ hit: EdgarSearchHit; matchedActor: string }>> {
  const matched: Array<{ hit: EdgarSearchHit; matchedActor: string }> = [];
  const seenUrls = new Set<string>();
  let from = 0;
  const totalCap = 1000;

  while (matched.length < params.maxResults && from < totalCap) {
    const page = await searchEdgarPage({
      query: params.query,
      startDate: params.startDate,
      endDate: params.endDate,
      from,
      size: SEARCH_PAGE_SIZE,
    });

    const hits = page.hits?.hits ?? [];
    if (hits.length === 0) {
      break;
    }

    for (const hit of hits) {
      if (!isProcessableEdgarFiling(hit)) {
        continue;
      }

      const displayNames = hit._source.display_names ?? [];
      const matchedActor = matchesTrackedActor(displayNames, params.actorNames);
      if (!matchedActor) {
        continue;
      }

      let url: string;
      try {
        url = buildEdgarFilingUrl(hit);
      } catch {
        continue;
      }

      if (seenUrls.has(url)) {
        continue;
      }
      seenUrls.add(url);

      matched.push({ hit, matchedActor });
      if (matched.length >= params.maxResults) {
        break;
      }
    }

    const total = page.hits?.total?.value ?? 0;
    from += SEARCH_PAGE_SIZE;
    if (from >= total) {
      break;
    }

    await sleep(FETCH_DELAY_MS);
  }

  return matched;
}

/**
 * SEC EDGAR full-text search adapter.
 * Queries EFTS for the domain phrase, keeps filings from tracked actors, fetches excerpts.
 */
export async function ingestEdgar(
  params: EdgarIngestParams,
): Promise<IngestRawItem[]> {
  const query = params.query ?? DEFAULT_QUERY;
  const { startDate, endDate } =
    params.startDate && params.endDate
      ? { startDate: params.startDate, endDate: params.endDate }
      : defaultEdgarDateRange();
  const maxResults = params.maxResults ?? DEFAULT_MAX_RESULTS;

  if (params.actorNames.length === 0) {
    return [];
  }

  const matchedHits = await collectMatchedHits({
    query,
    startDate,
    endDate,
    actorNames: params.actorNames,
    maxResults,
  });

  const items: IngestRawItem[] = [];

  for (const { hit, matchedActor } of matchedHits) {
    const url = buildEdgarFilingUrl(hit);
    const eventDate = hit._source.file_date;
    if (!eventDate) {
      continue;
    }

    let rawContent: string;
    try {
      rawContent = await fetchFilingExcerpt(url, query, hit._source);
    } catch {
      const company = hit._source.display_names?.[0] ?? "Filer";
      const form = hit._source.form ?? "filing";
      rawContent = `${company} — ${form} matched ${query}. Excerpt unavailable.`;
    }

    items.push({
      title: buildTitle(hit, matchedActor),
      url,
      raw_content: rawContent,
      source_id: params.sourceId,
      event_date: eventDate,
    });

    await sleep(FETCH_DELAY_MS);
  }

  return items;
}
