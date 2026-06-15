import { createHash } from "crypto";
import type {
  DomainConfigActor,
  EnrichSignalInput,
  EnrichmentContext,
  EnrichmentResult,
  LifecycleEvent,
  RelevanceScore,
  SignalCategory,
} from "./types";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_CALL_DELAY_MS = 5000;

let lastClaudeCallAt = 0;
let claudeCallQueue: Promise<void> = Promise.resolve();

const SIGNAL_CATEGORIES: SignalCategory[] = [
  "product",
  "regulatory",
  "geopolitical",
  "commercial",
  "team",
  "communications",
  "technical",
];

const LIFECYCLE_EVENTS: LifecycleEvent[] = ["shutdown", "acquired", "pivot"];

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

function formatActorList(actors: DomainConfigActor[]): string {
  return actors
    .map((actor) => {
      const geography =
        actor.geography && actor.geography.length > 0
          ? `, geography: ${actor.geography.join(", ")}`
          : "";
      return `- ${actor.name} (role: ${actor.role}, tier: ${actor.tier}${geography})`;
    })
    .join("\n");
}

function formatNaturalWineScoringRules(context: EnrichmentContext): string {
  if (context.domainSlug !== "natural-wine-es") {
    return "";
  }

  const tier1Producers = context.actors
    .filter((actor) => actor.tier === 1 && actor.role === "producer")
    .map((actor) => actor.name);
  const tier2Buyers = context.actors
    .filter((actor) => actor.tier === 2 && actor.role === "buyer")
    .map((actor) => actor.name);

  return `
## Domain scoring rules (Natural Wine — Spain)

Mandatory minimum scores — apply before scoring 0 or 1:
- If the raw text explicitly names any tracked Tier 1 producer (${tier1Producers.join(", ")}), relevance MUST be at least 2. Never score 0 or 1 solely because the piece is editorial, a tasting note, or lacks hard news.
- If the raw text names a tracked Tier 2 buyer (${tier2Buyers.join(", ")}) together with any wine producer (tracked or named in text), relevance MUST be at least 2.

Communications category — lower bar:
- Interviews, profiles, tasting notes, vintage reports, and event coverage (fairs, tastings, restaurant wine lists) that feature tracked Tier 1 producers or Tier 2 buyers are relevance 2, not noise. Use category "communications".
- Trade press, newsletters, and critic pieces about tracked actors are relevant even without a corporate announcement.
- Do NOT score 0 for communications solely because the format is soft or opinionated.

Score 3 (critical) — keep strict. Reserve ONLY for:
- New producer entering the natural wine scene (first significant market entry or discovery)
- DO or regulatory conflict affecting natural/low-intervention producers
- Acquisition, shutdown, or pivot (set lifecycle when applicable)
- Major award or recognition that materially shifts a producer's positioning
- Distribution change: new importer, new export market, major on-premise or retail placement
- NOT for: routine profiles, tasting notes, fair announcements, restaurant features, or general scene commentary (those stay at 2)
`;
}

function formatLanguageServicesScoringRules(context: EnrichmentContext): string {
  if (context.domainSlug !== "language-services-ai") {
    return "";
  }

  const tier1Actors = context.actors
    .filter((actor) => actor.tier === 1)
    .map((actor) => actor.name);

  return `
## Domain scoring rules (Language Services & Language AI)

Mandatory minimum scores — apply before scoring 0 or 1:
- If the raw text explicitly names any tracked Tier 1 actor (${tier1Actors.join(", ")}), relevance MUST be at least 2. Never score 0 or 1 solely because the piece is trade press, a podcast recap, or lacks a corporate announcement.
- If the signal covers machine translation (MT), MTPE, CAT/TMS tools, language AI models, neural MT, localization automation, or LSP/enterprise language strategy (even without naming a tracked actor), relevance MUST be at least 2.

M&A, acquisitions, and funding — always relevance 3:
- Mergers, acquisitions, takeovers, and disclosed funding rounds for LSPs or language-tech companies are relevance 3. Use category "team", set lifecycle to "acquired" for acquisitions, and name acquirer + target in summary and key_facts.

Score 3 (critical) — keep strict. Reserve ONLY for:
- Major product launch or platform release (new MT engine, TMS feature set, enterprise API) from a tracked or market-moving vendor
- Regulatory enforcement action (not proposals or guidance) affecting language services or language AI
- Acquisition, merger, or shutdown (set lifecycle when applicable)
- NOT for: routine conference coverage, opinion pieces, minor feature updates, or general industry commentary without a tracked Tier 1 actor (those stay at 2 unless M&A/funding applies above)
`;
}

function formatDomainScoringRules(context: EnrichmentContext): string {
  return (
    formatNaturalWineScoringRules(context) +
    formatLanguageServicesScoringRules(context)
  );
}

function buildEnrichmentPrompt(
  rawText: string,
  eventDate: string,
  context: EnrichmentContext,
): string {
  const fundingM = Math.round(context.fundingSignificanceUsd / 1_000_000);

  return `You are the enrichment engine for Radar, a market intelligence system. Domain: ${context.domainName}.

Classify the signal below using ONLY the taxonomy and scoring rules provided. Return JSON only — no preamble, no markdown fences.

## Signal categories (§1)
- product: launches, features, pricing, deprecations, new capacity / plants
- regulatory: formal rule-making — approvals, standards, enforcement, administrative sanctions
- geopolitical: state power moves — export controls, tariffs, bilateral deals, stockpiling (state as strategic actor, not rule-maker)
- commercial: partnerships, contracts, offtakes, geographic expansion, major funding/deals
- team: senior hires, departures, layoffs, funding, M&A (M&A also sets lifecycle)
- communications: press releases, leadership posts, papers, conferences, trade press
- technical: patents

## Category disambiguation (apply before assigning category)
- Acquisitions, mergers, and M&A events always use category "team". Commercial is for partnerships, contracts, and offtakes only — never M&A, even when deal values are disclosed.
- Regulatory is for formal rule-making and standards bodies. Geopolitical is when a state acts as a strategic actor — export controls, tariffs, sanctions, trade restrictions. Export bans, trade restrictions, and bilateral state deals are geopolitical, not regulatory.
- Export restrictions, import controls, and trade barriers imposed by any state or supranational body (including the EU Commission) are always "geopolitical", not "regulatory". The key test: does this measure control cross-border flows of goods? If yes → geopolitical.
- Lifecycle (cross-cutting, nullable): shutdown | acquired | pivot. When the signal describes an acquisition, set lifecycle to "acquired", name the acquirer in actors (if tracked), and name the acquired entity explicitly in summary and key_facts (even if the target is not in the tracked actor list).

## Relevance scoring (§4)
0 = noise (discard) | 1 = context | 2 = relevant | 3 = critical

Always score ≥2 when:
- lifecycle event on a tracked actor
- geopolitical signal touching core supply chain
- regulatory enforcement action (not proposals)
- Tier 1 actor + funding above $${fundingM}M, major contract/offtake, or C-level change
- scheduled future event that should be tracked on a calendar

Score 0 when:
- self-promotional PR with no new facts (no numbers, commitments, dates)
- aggregator repackaging with no new information
- opinion with no primary information (unless Tier 0 source)
- routine financials with no surprises

Tier 2 actors: only score 3 surfaces in living document; still assign honest scores.

Conference talks: default 1 unless a tracked actor announces something substantive on stage (then ≥2).
${formatDomainScoringRules(context)}
## Tracked actors (match names EXACTLY — do not invent variants)
${formatActorList(context.actors)}

Only include actor names from the list above in the "actors" array. For acquisitions: include the acquirer if tracked; omit the target from actors if untracked, but name the acquired entity in summary and key_facts and set lifecycle to "acquired".

## Event date (from ingestion)
${eventDate}

## Raw signal text
${rawText}

## Output JSON schema
{
  "category": "product|regulatory|geopolitical|commercial|team|communications|technical",
  "relevance": 0|1|2|3,
  "summary": "2-3 sentences, factual",
  "so_what": "one sentence: why this matters",
  "actors": ["exact names from tracked list"],
  "geography": ["ISO country/region codes or EU"],
  "lifecycle": "shutdown|acquired|pivot|null",
  "scheduled_date": "YYYY-MM-DD or null — set for future events to resurface (e.g. export control expiry)",
  "key_facts": "required non-empty one-line summary of core event facts for deduplication; for acquisitions include acquirer + acquired entity names",
  "worth_watching": true|false,
  "discard_reason": "required when relevance is 0, else null"
}

Set worth_watching to true if this signal describes something a product team in language services or language AI would want to know about — even if the company is not in the language industry. Examples: a new voice AI product, an interesting human-AI collaboration pattern, an AI tool for underserved languages, a quality transparency feature in any industry. Criteria: novel AI application, new interaction pattern, adjacent market move, or technology that could be replicated. Default false.`;
}

function parseClaudeJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

function assertCategory(value: unknown): SignalCategory {
  if (typeof value !== "string" || !SIGNAL_CATEGORIES.includes(value as SignalCategory)) {
    throw new Error(`Invalid enrichment category: ${String(value)}`);
  }
  return value as SignalCategory;
}

function assertRelevance(value: unknown): RelevanceScore {
  if (typeof value !== "number" || value < 0 || value > 3 || !Number.isInteger(value)) {
    throw new Error(`Invalid enrichment relevance: ${String(value)}`);
  }
  return value as RelevanceScore;
}

function assertLifecycle(value: unknown): LifecycleEvent | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || !LIFECYCLE_EVENTS.includes(value as LifecycleEvent)) {
    throw new Error(`Invalid enrichment lifecycle: ${String(value)}`);
  }
  return value as LifecycleEvent;
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid enrichment ${field}`);
  }
  return value.trim();
}

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Invalid enrichment ${field}`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function filterTrackedActors(
  actors: string[],
  context: EnrichmentContext,
): string[] {
  const allowed = new Set(context.actors.map((actor) => actor.name));
  return actors.filter((name) => allowed.has(name));
}

function computeEventFingerprint(params: {
  actors: string[];
  category: SignalCategory;
  eventDate: string;
  keyFacts: string;
}): string {
  const payload = [
    [...params.actors].sort().join("|"),
    params.category,
    params.eventDate,
    params.keyFacts.toLowerCase().trim(),
  ].join("::");

  return createHash("sha256").update(payload).digest("hex");
}

function assertBoolean(value: unknown, field: string, defaultValue = false): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Invalid enrichment ${field}`);
  }
  return value;
}

function parseClaudeEnrichment(
  raw: unknown,
  eventDate: string,
  context: EnrichmentContext,
): EnrichmentResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Enrichment response must be a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const category = assertCategory(data.category);
  const relevance = assertRelevance(data.relevance);
  const summary = assertString(data.summary, "summary");
  const soWhat = assertString(data.so_what, "so_what");
  const actors = filterTrackedActors(
    assertStringArray(data.actors, "actors"),
    context,
  );
  const geography = assertStringArray(data.geography, "geography");
  const lifecycle = assertLifecycle(data.lifecycle ?? null);
  const scheduledDate =
    data.scheduled_date === null
      ? null
      : assertString(data.scheduled_date, "scheduled_date");
  const keyFacts = assertString(data.key_facts, "key_facts");
  const worthWatching = assertBoolean(data.worth_watching, "worth_watching", false);
  const discardReason =
    data.discard_reason === null
      ? null
      : typeof data.discard_reason === "string"
        ? data.discard_reason.trim() || null
        : (() => {
            throw new Error("Invalid enrichment discard_reason");
          })();

  if (relevance === 0 && !discardReason) {
    throw new Error("Enrichment relevance 0 requires discard_reason");
  }

  if (relevance !== 0 && discardReason) {
    throw new Error("Enrichment discard_reason must be null when relevance > 0");
  }

  return {
    category,
    relevance,
    summary,
    so_what: soWhat,
    actors,
    geography,
    lifecycle,
    scheduled_date: scheduledDate,
    discard_reason: discardReason,
    worth_watching: worthWatching,
    event_fingerprint: computeEventFingerprint({
      actors,
      category,
      eventDate,
      keyFacts,
    }),
  };
}

async function callClaude(prompt: string): Promise<string> {
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
      max_tokens: 1024,
      temperature: 0,
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

  return text;
}

export async function enrichSignal(
  input: EnrichSignalInput,
): Promise<EnrichmentResult> {
  const prompt = buildEnrichmentPrompt(
    input.rawText,
    input.eventDate,
    input.context,
  );
  const responseText = await callClaude(prompt);
  const parsed = parseClaudeJson(responseText);
  return parseClaudeEnrichment(parsed, input.eventDate, input.context);
}

export function enrichmentContextFromConfig(config: {
  slug: string;
  name: string;
  funding_significance_usd: number;
  actors: DomainConfigActor[];
}): EnrichmentContext {
  return {
    domainSlug: config.slug,
    domainName: config.name,
    fundingSignificanceUsd: config.funding_significance_usd,
    actors: config.actors,
  };
}
