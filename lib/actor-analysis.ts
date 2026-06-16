import { loadDomainConfig, resolveDomainSlug } from "./config-loader";
import {
  getActorProfilePageData,
  type ActorProfilePageData,
} from "./actor-profile";

const ANALYSIS_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface ProductMapItem {
  name: string;
  description: string;
}

export interface ActorAnalysisReport {
  swot: SwotAnalysis;
  ai_strategy_assessment: string;
  product_map: ProductMapItem[];
  market_opportunities: string[];
  key_risks: string[];
}

export interface ActorAnalysisResult extends ActorAnalysisReport {
  actor_name: string;
  domain_name: string;
  generated_at: string;
  signal_count: number;
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY in environment");
  }
  return key;
}

function parseClaudeJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid analysis ${field}`);
  }
  return value.trim();
}

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Invalid analysis ${field}`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function normalizeBulletArray(value: unknown, field: string): string[] {
  const items = assertStringArray(value, field);
  if (items.length === 1 && /[\n•]|^[-*]\s/m.test(items[0])) {
    return items[0]
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
  }
  return items;
}

function assertSwot(value: unknown): SwotAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid analysis swot");
  }
  const swot = value as Record<string, unknown>;
  return {
    strengths: normalizeBulletArray(swot.strengths, "swot.strengths"),
    weaknesses: normalizeBulletArray(swot.weaknesses, "swot.weaknesses"),
    opportunities: normalizeBulletArray(swot.opportunities, "swot.opportunities"),
    threats: normalizeBulletArray(swot.threats, "swot.threats"),
  };
}

function assertProductMap(value: unknown): ProductMapItem[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid analysis product_map");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid analysis product_map[${index}]`);
    }
    const row = item as Record<string, unknown>;
    return {
      name: assertString(row.name, `product_map[${index}].name`),
      description: assertString(row.description, `product_map[${index}].description`),
    };
  });
}

function parseAnalysisReport(raw: unknown): ActorAnalysisReport {
  if (!raw || typeof raw !== "object") {
    throw new Error("Analysis response must be a JSON object");
  }

  const data = raw as Record<string, unknown>;
  return {
    swot: assertSwot(data.swot),
    ai_strategy_assessment: assertString(
      data.ai_strategy_assessment,
      "ai_strategy_assessment",
    ),
    product_map: assertProductMap(data.product_map),
    market_opportunities: normalizeBulletArray(
      data.market_opportunities,
      "market_opportunities",
    ),
    key_risks: normalizeBulletArray(data.key_risks, "key_risks"),
  };
}

function formatProfileContext(data: ActorProfilePageData): string {
  const { actor, profile } = data;
  if (!profile) {
    return `Actor: ${actor.name}
Role: ${actor.role}
Tier: ${actor.tier}
Geography: ${actor.geography?.join(", ") ?? "unknown"}
Profile: not seeded — infer from signals only.`;
  }

  return `Actor: ${actor.name}
Role: ${actor.role}
Tier: ${actor.tier}
Geography: ${actor.geography?.join(", ") ?? "unknown"}
HQ: ${profile.hq ?? "unknown"}
Headcount: ${profile.headcount_approx ?? "unknown"}
Revenue: ${profile.revenue_usd ? `$${profile.revenue_usd.toLocaleString("en-US")}` : "unknown"}${profile.revenue_year ? ` (${profile.revenue_year})` : ""}

Description: ${profile.description}
Business model: ${profile.business_model}
AI strategy (baseline): ${profile.ai_strategy}
Recent moves: ${profile.recent_moves}
Core products: ${profile.core_products.join("; ") || "—"}
Core technology: ${profile.core_technology.join("; ") || "—"}
Key markets: ${profile.key_markets.join("; ") || "—"}`;
}

function formatSignalsContext(data: ActorProfilePageData): string {
  if (data.signals.length === 0) {
    return "No linked signals available.";
  }

  return data.signals
    .map((signal, index) => {
      const lines = [
        `${index + 1}. [${signal.event_date}] ${signal.category.toUpperCase()} · relevance ${signal.relevance}`,
        `Title: ${signal.title}`,
        `Summary: ${signal.summary}`,
      ];
      if (signal.so_what) {
        lines.push(`So what: ${signal.so_what}`);
      }
      if (signal.lifecycle) {
        lines.push(`Lifecycle: ${signal.lifecycle}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildAnalysisPrompt(data: ActorProfilePageData, domainName: string): string {
  return `You are a senior market intelligence analyst producing a strategic report for the language services and language AI industry.

Domain: ${domainName}
Write the entire report in English.

Use the actor profile and linked market signals below. Ground conclusions in the evidence provided. Where data is thin, state assumptions clearly. Be specific and analytical — avoid generic filler.

ACTOR PROFILE
${formatProfileContext(data)}

LINKED SIGNALS (${data.signals.length})
${formatSignalsContext(data)}

Return ONLY valid JSON with this exact shape:
{
  "swot": {
    "strengths": ["bullet 1", "bullet 2", "bullet 3"],
    "weaknesses": ["bullet 1", "bullet 2", "bullet 3"],
    "opportunities": ["bullet 1", "bullet 2", "bullet 3"],
    "threats": ["bullet 1", "bullet 2", "bullet 3"]
  },
  "ai_strategy_assessment": "2-4 paragraphs assessing AI strategy maturity, investments, differentiation, and gaps vs competitors",
  "product_map": [
    { "name": "Product or platform name", "description": "Role in portfolio and competitive positioning" }
  ],
  "market_opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "key_risks": ["risk 1", "risk 2", "risk 3"]
}

Output formatting rules (critical):
- swot.strengths, swot.weaknesses, swot.opportunities, and swot.threats MUST each be a JSON array of 3-5 separate bullet strings — one insight per array element. Do NOT return prose paragraphs or a single concatenated string for any SWOT quadrant.
- market_opportunities MUST be a JSON array of 3-6 separate bullet strings — one opportunity per element. Do NOT return prose.
- key_risks MUST be a JSON array of 3-6 separate bullet strings — one risk per element. Do NOT return prose.
- ai_strategy_assessment is the only prose field: return 2-4 paragraphs as a single string with blank lines between paragraphs.
- Each bullet string should be a complete, self-contained insight (no leading "- " or "• " characters in the string values).`;
}

async function callClaudeAnalysis(prompt: string): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getAnthropicApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      max_tokens: 4096,
      temperature: 0.2,
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

export async function generateActorAnalysis(
  actorSlug: string,
  domainSlug?: string,
): Promise<ActorAnalysisResult> {
  const slug = resolveDomainSlug(domainSlug);
  const config = loadDomainConfig(slug);
  const data = await getActorProfilePageData(actorSlug, slug);

  if (!data) {
    throw new Error(`Actor not found: ${actorSlug}`);
  }

  const prompt = buildAnalysisPrompt(data, config.name);
  const responseText = await callClaudeAnalysis(prompt);
  const report = parseAnalysisReport(parseClaudeJson(responseText));

  return {
    ...report,
    actor_name: data.actor.name,
    domain_name: config.name,
    generated_at: new Date().toISOString(),
    signal_count: data.signals.length,
  };
}
