import type { IngestRawItem } from "../types";

const CLAUDE_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const WEB_SEARCH_TOOL_TYPE = "web_search_20250305";
const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_MAX_RESULTS_PER_QUERY = 10;
const QUERY_DELAY_MS = 500;

export interface SearchQueryInput {
  sourceId: string;
  query: string;
}

export interface SearchIngestParams {
  queries: SearchQueryInput[];
  domainName?: string;
  lookbackDays?: number;
  maxResultsPerQuery?: number;
}

interface SearchHit {
  url: string;
  title: string;
  snippet: string;
  event_date: string;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  content?: unknown;
  citations?: Array<{
    type?: string;
    url?: string;
    title?: string;
    cited_text?: string;
  }>;
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY in environment");
  }
  return key;
}

function defaultSinceDate(lookbackDays: number): string {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - lookbackDays);
  return since.toISOString().slice(0, 10);
}

function parsePageAge(pageAge?: string): string {
  if (!pageAge?.trim()) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(pageAge);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function mergeSnippet(existing: string | undefined, next: string): string {
  const value = next.trim();
  if (!value) {
    return existing ?? "";
  }
  if (!existing || value.length > existing.length) {
    return value;
  }
  return existing;
}

function extractSearchHits(payload: {
  content?: AnthropicContentBlock[];
}): SearchHit[] {
  const byUrl = new Map<string, SearchHit>();

  for (const block of payload.content ?? []) {
    if (block.type === "web_search_tool_result" && block.content) {
      const results = Array.isArray(block.content)
        ? block.content
        : [block.content];

      for (const result of results) {
        if (!result || typeof result !== "object") {
          continue;
        }

        const row = result as Record<string, unknown>;
        if (row.type !== "web_search_result" || typeof row.url !== "string") {
          continue;
        }

        const url = normalizeUrl(row.url);
        const title =
          typeof row.title === "string" && row.title.trim()
            ? row.title.trim()
            : url;
        const eventDate = parsePageAge(
          typeof row.page_age === "string" ? row.page_age : undefined,
        );

        const existing = byUrl.get(url);
        byUrl.set(url, {
          url,
          title: existing?.title ?? title,
          snippet: existing?.snippet ?? title,
          event_date: existing?.event_date ?? eventDate,
        });
      }
    }

    if (block.type === "text" && block.citations) {
      for (const citation of block.citations) {
        if (!citation?.url) {
          continue;
        }

        const url = normalizeUrl(citation.url);
        const title = citation.title?.trim() || url;
        const snippet = citation.cited_text?.trim() || title;
        const existing = byUrl.get(url);

        byUrl.set(url, {
          url,
          title: existing?.title ?? title,
          snippet: mergeSnippet(existing?.snippet, snippet),
          event_date: existing?.event_date ?? new Date().toISOString().slice(0, 10),
        });
      }
    }
  }

  return Array.from(byUrl.values());
}

async function runWebSearch(
  query: string,
  domainName: string,
): Promise<SearchHit[]> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      tools: [
        {
          type: WEB_SEARCH_TOOL_TYPE,
          name: "web_search",
          max_uses: 3,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Use the web_search tool to search for this exact query: "${query}"

Domain context: ${domainName}. Prioritize rare earths, critical raw materials, and supply-chain news from the past week.

Perform the search now. A short acknowledgement is fine after searching.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic web search failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { content?: AnthropicContentBlock[] };
  return extractSearchHits(payload);
}

/**
 * Saved-query web search via Anthropic web_search tool.
 * Queries come from domain config `saved_searches`; each maps to a `search_query` source id.
 */
export async function ingestSearch(
  params: SearchIngestParams,
): Promise<IngestRawItem[]> {
  if (params.queries.length === 0) {
    return [];
  }

  const lookbackDays = params.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const maxResultsPerQuery =
    params.maxResultsPerQuery ?? DEFAULT_MAX_RESULTS_PER_QUERY;
  const sinceDate = defaultSinceDate(lookbackDays);
  const domainName = params.domainName ?? "market intelligence";
  const items: IngestRawItem[] = [];
  const seenUrls = new Set<string>();

  for (const { sourceId, query } of params.queries) {
    if (!sourceId || !query.trim()) {
      continue;
    }

    const hits = await runWebSearch(query.trim(), domainName);
    let count = 0;

    for (const hit of hits) {
      if (count >= maxResultsPerQuery) {
        break;
      }
      if (hit.event_date < sinceDate) {
        continue;
      }
      if (seenUrls.has(hit.url)) {
        continue;
      }

      seenUrls.add(hit.url);
      items.push({
        title: hit.title,
        url: hit.url,
        raw_content: hit.snippet,
        source_id: sourceId,
        event_date: hit.event_date,
      });
      count += 1;
    }

    await sleep(QUERY_DELAY_MS);
  }

  return items;
}
