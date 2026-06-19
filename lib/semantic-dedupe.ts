import { randomUUID } from "crypto";
import type { GroupedSignalSource } from "./group-signals";
import { getSupabase } from "./supabase";
import type { EnrichmentResult, IngestRawItem } from "./types";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_CALL_DELAY_MS = 5000;
const SEMANTIC_DEDUPE_WINDOW_DAYS = 7;

let lastClaudeCallAt = 0;
let claudeCallQueue: Promise<void> = Promise.resolve();

export interface EnrichedSignal {
  summary: string;
  so_what: string | null;
}

export interface SemanticDedupeCandidate {
  id: string;
  title: string;
  summary: string;
  so_what: string | null;
  source_url: string;
  event_date: string;
  relevance: number;
  captured_at: string | null;
  grouped_sources: GroupedSignalSource[] | null;
  source_count: number | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForClaudeRateLimit(): Promise<void> {
  const run = async () => {
    const elapsed = Date.now() - lastClaudeCallAt;
    if (elapsed < CLAUDE_CALL_DELAY_MS) {
      await sleep(CLAUDE_CALL_DELAY_MS - elapsed);
    }
    lastClaudeCallAt = Date.now();
  };

  claudeCallQueue = claudeCallQueue.then(run, run);
  await claudeCallQueue;
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY in environment");
  }
  return key;
}

function semanticWindowStart(eventDate: string): string {
  const start = new Date(`${eventDate}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - SEMANTIC_DEDUPE_WINDOW_DAYS);
  return start.toISOString().slice(0, 10);
}

function parseGroupedSources(value: unknown): GroupedSignalSource[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  return value as GroupedSignalSource[];
}

function buildComparisonPrompt(signalA: EnrichedSignal, signalB: EnrichedSignal): string {
  return `Signal A:
Summary: ${signalA.summary}
So what: ${signalA.so_what ?? "(none)"}

Signal B:
Summary: ${signalB.summary}
So what: ${signalB.so_what ?? "(none)"}

Are these two signals describing the same real-world event? Answer only YES or NO.`;
}

function parseYesNo(response: string): boolean {
  const normalized = response.trim().toUpperCase();
  return normalized.startsWith("YES");
}

export async function isSameEvent(
  signalA: EnrichedSignal,
  signalB: EnrichedSignal,
): Promise<boolean> {
  await waitForClaudeRateLimit();

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 16,
      temperature: 0,
      messages: [{ role: "user", content: buildComparisonPrompt(signalA, signalB) }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude semantic dedupe error ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content?.find((block) => block.type === "text")?.text;
  if (!text) {
    throw new Error("Claude semantic dedupe returned no text content");
  }

  return parseYesNo(text);
}

export async function findSemanticDedupeCandidates(params: {
  domainId: string;
  category: string;
  actorIds: string[];
  eventDate: string;
}): Promise<SemanticDedupeCandidate[]> {
  const { domainId, category, actorIds, eventDate } = params;
  if (actorIds.length === 0) {
    return [];
  }

  const supabase = getSupabase();
  const windowStart = semanticWindowStart(eventDate);

  const { data: links, error: linksError } = await supabase
    .from("signal_actors")
    .select("signal_id")
    .in("actor_id", actorIds);

  if (linksError) {
    throw new Error(`Semantic dedupe actor lookup failed: ${linksError.message}`);
  }

  const signalIds = Array.from(
    new Set((links ?? []).map((link) => link.signal_id as string)),
  );
  if (signalIds.length === 0) {
    return [];
  }

  const { data: signals, error: signalsError } = await supabase
    .from("signals")
    .select(
      "id, title, summary, so_what, source_url, event_date, relevance, captured_at, grouped_sources, source_count",
    )
    .eq("domain_id", domainId)
    .eq("category", category)
    .gte("event_date", windowStart)
    .lte("event_date", eventDate)
    .gte("relevance", 1)
    .in("id", signalIds)
    .order("event_date", { ascending: false });

  if (signalsError) {
    throw new Error(`Semantic dedupe signal lookup failed: ${signalsError.message}`);
  }

  return (signals ?? []).map((signal) => ({
    id: signal.id as string,
    title: signal.title as string,
    summary: signal.summary as string,
    so_what: (signal.so_what as string | null) ?? null,
    source_url: signal.source_url as string,
    event_date: signal.event_date as string,
    relevance: signal.relevance as number,
    captured_at: (signal.captured_at as string | null) ?? null,
    grouped_sources: parseGroupedSources(signal.grouped_sources),
    source_count: (signal.source_count as number | null) ?? null,
  }));
}

export async function mergeIntoGroupedSources(params: {
  existing: SemanticDedupeCandidate;
  item: IngestRawItem;
  enrichment: EnrichmentResult;
}): Promise<void> {
  const { existing, item, enrichment } = params;
  const supabase = getSupabase();

  const newSource: GroupedSignalSource = {
    id: randomUUID(),
    source_url: item.url,
    summary: enrichment.summary,
    relevance: enrichment.relevance,
    event_date: item.event_date,
    captured_at: new Date().toISOString(),
  };

  const primarySource: GroupedSignalSource = {
    id: existing.id,
    source_url: existing.source_url,
    summary: existing.summary,
    relevance: existing.relevance,
    event_date: existing.event_date,
    captured_at: existing.captured_at,
  };

  const groupedSources = existing.grouped_sources?.length
    ? [...existing.grouped_sources, newSource]
    : [primarySource, newSource];

  const { error } = await supabase
    .from("signals")
    .update({
      grouped_sources: groupedSources,
      source_count: groupedSources.length,
    })
    .eq("id", existing.id);

  if (error) {
    throw new Error(`Semantic dedupe merge failed: ${error.message}`);
  }
}

export function toEnrichedSignal(summary: string, soWhat: string | null): EnrichedSignal {
  return { summary, so_what: soWhat };
}
