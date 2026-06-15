import { loadDomainConfig, resolveDomainSlug } from "./config-loader";
import { getDomainMeta } from "./domain";
import { todayIsoDate } from "./ingest/date-range";
import type { QuarterlyReviewMeta } from "./report-date-range";
import { dedupeRowsBySourceUrl } from "./signal-dedupe";
import { getSupabase } from "./supabase";
import type { DomainConfig, SignalCategory } from "./types";

export type { QuarterlyReviewMeta } from "./report-date-range";
export { parseReportDateRange } from "./report-date-range";

const REPORT_MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export interface ReportSignal {
  id: string;
  title: string;
  summary: string;
  so_what: string | null;
  category: SignalCategory;
  relevance: number;
  event_date: string;
  lifecycle: string | null;
  worth_watching: boolean;
  scheduled_date: string | null;
  source_url: string;
  actor_names: string[];
}

export interface ReportUpcomingEvent {
  title: string;
  scheduled_date: string;
  so_what: string | null;
  category: SignalCategory;
}

export interface QuarterlyReviewResult {
  markdown: string;
  meta: QuarterlyReviewMeta;
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY in environment");
  }
  return key;
}

function buildActorNamesBySignalId(
  links: Array<{ signal_id: string; actor_id: string }>,
  actorById: Map<string, string>,
): Map<string, string[]> {
  const bySignalId = new Map<string, string[]>();

  for (const link of links) {
    const name = actorById.get(link.actor_id);
    if (!name) {
      continue;
    }
    const names = bySignalId.get(link.signal_id) ?? [];
    if (!names.includes(name)) {
      names.push(name);
    }
    bySignalId.set(link.signal_id, names);
  }

  return bySignalId;
}

export async function fetchReportSignals(
  domainSlug: string,
  from: string,
  to: string,
): Promise<ReportSignal[]> {
  const domain = await getDomainMeta(domainSlug);
  const supabase = getSupabase();

  const { data: rows, error } = await supabase
    .from("signals")
    .select(
      `
      id,
      title,
      summary,
      so_what,
      category,
      relevance,
      event_date,
      lifecycle,
      worth_watching,
      scheduled_date,
      source_url
    `,
    )
    .eq("domain_id", domain.id)
    .gte("event_date", from)
    .lte("event_date", to)
    .gt("relevance", 0)
    .order("event_date", { ascending: false });

  if (error) {
    throw new Error(`signals: ${error.message}`);
  }

  const signalIds = (rows ?? []).map((signal) => signal.id as string);
  if (signalIds.length === 0) {
    return [];
  }

  const [linksRes, actorsRes] = await Promise.all([
    supabase
      .from("signal_actors")
      .select("signal_id, actor_id")
      .in("signal_id", signalIds),
    supabase.from("actors").select("id, name").eq("domain_id", domain.id),
  ]);

  if (linksRes.error) {
    throw new Error(`signal_actors: ${linksRes.error.message}`);
  }
  if (actorsRes.error) {
    throw new Error(`actors: ${actorsRes.error.message}`);
  }

  const actorById = new Map(
    (actorsRes.data ?? []).map((actor) => [actor.id as string, actor.name as string]),
  );
  const bySignalId = buildActorNamesBySignalId(
    (linksRes.data ?? []) as Array<{ signal_id: string; actor_id: string }>,
    actorById,
  );

  return dedupeRowsBySourceUrl(
    (rows ?? []).map((signal) => ({
      id: signal.id as string,
      title: signal.title as string,
      summary: signal.summary as string,
      so_what: signal.so_what as string | null,
      category: signal.category as SignalCategory,
      relevance: signal.relevance as number,
      event_date: signal.event_date as string,
      lifecycle: signal.lifecycle as string | null,
      worth_watching: Boolean(signal.worth_watching),
      scheduled_date: (signal.scheduled_date as string | null) ?? null,
      source_url: signal.source_url as string,
      actor_names: bySignalId.get(signal.id as string) ?? [],
    })),
  );
}

export async function fetchReportUpcomingEvents(
  domainSlug: string,
): Promise<ReportUpcomingEvent[]> {
  const domain = await getDomainMeta(domainSlug);
  const supabase = getSupabase();
  const today = todayIsoDate();

  const { data, error } = await supabase
    .from("signals")
    .select("title, scheduled_date, so_what, category")
    .eq("domain_id", domain.id)
    .not("scheduled_date", "is", null)
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true });

  if (error) {
    throw new Error(`upcoming_events: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    title: row.title as string,
    scheduled_date: row.scheduled_date as string,
    so_what: row.so_what as string | null,
    category: row.category as SignalCategory,
  }));
}

function formatSignalLine(signal: ReportSignal): string {
  const actors =
    signal.actor_names.length > 0 ? signal.actor_names.join(", ") : "(untracked)";
  const flags = [
    signal.worth_watching ? "worth_watching" : null,
    signal.lifecycle ? `lifecycle:${signal.lifecycle}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const flagSuffix = flags ? ` [${flags}]` : "";

  return `- ${signal.event_date} | ${signal.category} | rel ${signal.relevance} | ${actors}${flagSuffix}
  Title: ${signal.title}
  Summary: ${signal.summary}
  So what: ${signal.so_what ?? "—"}
  Source: ${signal.source_url}`;
}

function formatActorsContext(config: DomainConfig): string {
  return config.actors
    .map(
      (actor) =>
        `- ${actor.name} (tier ${actor.tier}, ${actor.role})`,
    )
    .join("\n");
}

function formatUpcomingContext(events: ReportUpcomingEvent[]): string {
  if (events.length === 0) {
    return "No upcoming scheduled events on the calendar.";
  }

  return events
    .map(
      (event) =>
        `- ${event.scheduled_date} | ${event.category} | ${event.title}\n  So what: ${event.so_what ?? "—"}`,
    )
    .join("\n");
}

function buildReviewPrompt(params: {
  config: DomainConfig;
  from: string;
  to: string;
  signals: ReportSignal[];
  upcoming: ReportUpcomingEvent[];
}): string {
  const { config, from, to, signals, upcoming } = params;
  const trackedSignals = signals.filter((signal) => signal.actor_names.length > 0);
  const worthWatchingSignals = signals.filter(
    (signal) =>
      signal.actor_names.length === 0 &&
      (signal.worth_watching || signal.lifecycle),
  );
  const lifecycleSignals = signals.filter(
    (signal) => signal.lifecycle && signal.actor_names.length > 0,
  );

  return `You are writing a market intelligence report for Radar, a product analyst briefing tool.

Domain: ${config.name}
Review period: ${from} to ${to} (inclusive)
Audience: product and strategy teams in language services and language AI. The report may also be read by non-technical stakeholders — write so a smart reader outside the language industry can follow it.
Tone: analytical and concise — like a product analyst briefing their team, not a press release. Keep industry vocabulary and analytical depth; optimize for clarity, not simplification.
Language: English.
Output: markdown only. No preamble, no JSON, no code fences wrapping the full document.

Readability (apply throughout):
- Use short sentences. If a sentence chains more than two ideas, split it into separate sentences.
- Expand acronyms on first use, then use the acronym freely: MTPE (machine translation post-editing), TMS (translation management system), CAT (computer-assisted translation), LSP (language service provider).
- Prefer plain structure: one idea per sentence, active voice where natural, concrete subjects.

Use exactly these top-level sections as ## headings (in this order):

## Executive Summary
Exactly 3 sentences on the top 3 developments of the period — no more.
Lead with the "so what": open with the big-picture structural insight (e.g. the market is splitting between edge AI and vertical specialization), not a single company's numbers or deal terms. Sentence 1 = the conclusion; sentences 2–3 = the supporting evidence.
Do not preview or enumerate what follows in later sections.

## Movements by Actor
Group by tracked actor only. Summarize what each actor did across the period — synthesize themes, do not list signal-by-signal. Omit actors with no activity. Use ### subheadings per actor name.
When describing a competitor or product move, end with one analytical sentence on what it could mean for a language services product team (not promotional).

## Emerging Patterns
Cross-cutting trends visible only by connecting multiple signals. Synthesize themes already established elsewhere — do not re-describe individual events in detail. If edge AI competition is covered under Microsoft and Google in Movements by Actor, reference that convergence in one or two sentences without repeating product names, features, or deal terms.
When a pattern has product-team implications, add one analytical sentence — not promotional.

## Lifecycle Events
Structural changes involving tracked actors only: acquisitions, shutdowns, pivots where a tracked actor is party to the event. If none, state that briefly.
Do not include adjacent-market or untracked acquisitions here.

## Worth Watching Highlights
Signals from beyond the tracked field: untracked companies and adjacent markets that could inspire or threaten a language services product team. Include adjacent acquisitions (e.g. AMN–Jaide, Bluechip–YarnGPT) here only — never duplicate them in Lifecycle Events.
When describing a move, add one sentence on what it could mean for a language services product team.

## What to Watch Next Quarter
Two subsections in this order:

### Scheduled events
List concrete upcoming calendar events from the data below. Prioritize by strategic significance. Brief product-team implication where relevant. If none, state that briefly.

### Analytical outlook
3-4 forward-looking projections derived from the Emerging Patterns and Movements by Actor sections you wrote above — not from thin air. Each projection must trace back to a specific pattern or signal cluster already established in the report (name the pattern it follows from, e.g. "Following the edge-AI push by Microsoft and Google…").
Frame every projection clearly as a forecast, not a fact — use language like "expect", "likely", "watch for", "could". Example tone: "If Microsoft and Google are pushing edge AI, expect responses from DeepL and major LSPs; watch whether TransPerfect announces on-device TowerLLM capabilities."
Stay grounded in observed signals — no wild speculation. If patterns are too thin for 3 projections, write fewer and say so.

Anti-redundancy rules (critical):
- Each development gets full detail in ONE section only. All other mentions must be brief synthesis (1-2 sentences max), never a second full description.
- Lifecycle Events = tracked actors. Worth Watching = untracked but inspiring/threatening. Adjacent-market acquisitions belong in Worth Watching only, not Lifecycle Events.
- Executive Summary names the top 3 developments; later sections expand without repeating the same facts, quotes, or deal terms.

General rules:
- Ground every claim in the signal data below. Do not invent events.
- Prefer synthesis over enumeration.
- Name actors and companies precisely.
- When evidence is thin for a section, say so briefly rather than padding.
- Maintain analytical rigor and industry terminology — clarity for non-specialists, not dumbing down.

TRACKED ACTORS
${formatActorsContext(config)}

SIGNALS IN PERIOD (${signals.length} total, ${trackedSignals.length} with tracked actors)
${signals.length > 0 ? signals.map(formatSignalLine).join("\n\n") : "No signals in this period."}

WORTH WATCHING / ADJACENT (${worthWatchingSignals.length} — untracked; use for Worth Watching section only)
${worthWatchingSignals.length > 0 ? worthWatchingSignals.map(formatSignalLine).join("\n\n") : "None flagged."}

LIFECYCLE — TRACKED ACTORS ONLY (${lifecycleSignals.length})
${lifecycleSignals.length > 0 ? lifecycleSignals.map(formatSignalLine).join("\n\n") : "None involving tracked actors."}

UPCOMING SCHEDULED EVENTS (calendar — may fall outside review period)
${formatUpcomingContext(upcoming)}`;
}

async function callClaudeReview(prompt: string): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: REPORT_MODEL,
      max_tokens: 8192,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API error ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content?.find((block) => block.type === "text")?.text;
  if (!text) {
    throw new Error("Claude API returned no text content");
  }

  return text.trim();
}

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:markdown)?\s*([\s\S]*?)```\s*$/i);
  return fenced ? fenced[1].trim() : text;
}

export async function generateQuarterlyReview(params: {
  domainSlug?: string;
  from: string;
  to: string;
}): Promise<QuarterlyReviewResult> {
  const slug = resolveDomainSlug(params.domainSlug);
  const config = loadDomainConfig(slug);
  const [signals, upcoming] = await Promise.all([
    fetchReportSignals(slug, params.from, params.to),
    fetchReportUpcomingEvents(slug),
  ]);

  const prompt = buildReviewPrompt({
    config,
    from: params.from,
    to: params.to,
    signals,
    upcoming,
  });

  const markdown = stripMarkdownFences(await callClaudeReview(prompt));

  return {
    markdown,
    meta: {
      domain: slug,
      domain_name: config.name,
      from: params.from,
      to: params.to,
      signal_count: signals.length,
      generated_at: new Date().toISOString(),
    },
  };
}
