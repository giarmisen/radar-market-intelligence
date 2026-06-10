import { readFileSync } from "fs";
import { join } from "path";
import type {
  ActorRole,
  DomainConfig,
  DomainConfigActor,
  DomainConfigFieldSource,
  DomainConfigRadarQuery,
  DomainConfigScheduledEvent,
  SignalCategory,
  SourceType,
} from "./types";

const ACTOR_ROLES: ActorRole[] = [
  "producer",
  "processor",
  "buyer",
  "regulator",
  "reference",
];

const SOURCE_TYPES: SourceType[] = [
  "rss",
  "newsroom",
  "filings",
  "official_journal",
  "think_tank",
  "trade_press",
  "patent_db",
  "search_query",
];

const SIGNAL_CATEGORIES: SignalCategory[] = [
  "product",
  "regulatory",
  "geopolitical",
  "commercial",
  "team",
  "communications",
  "technical",
];

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid domain config: ${field} must be a non-empty string`);
  }
  return value;
}

function assertNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid domain config: ${field} must be a number`);
  }
  return value;
}

function parseActor(value: unknown, index: number): DomainConfigActor {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid domain config: actors[${index}] must be an object`);
  }

  const actor = value as Record<string, unknown>;
  const role = assertString(actor.role, `actors[${index}].role`);
  if (!ACTOR_ROLES.includes(role as ActorRole)) {
    throw new Error(`Invalid domain config: actors[${index}].role is invalid`);
  }

  const tier = assertNumber(actor.tier, `actors[${index}].tier`);
  if (tier < 0 || tier > 3) {
    throw new Error(`Invalid domain config: actors[${index}].tier must be 0–3`);
  }

  const geography =
    actor.geography === undefined
      ? undefined
      : Array.isArray(actor.geography) &&
          actor.geography.every((item) => typeof item === "string")
        ? actor.geography
        : (() => {
            throw new Error(
              `Invalid domain config: actors[${index}].geography must be a string array`,
            );
          })();

  return {
    name: assertString(actor.name, `actors[${index}].name`),
    role: role as ActorRole,
    tier,
    geography,
  };
}

function parseRadarQuery(
  value: unknown,
  index: number,
): DomainConfigRadarQuery {
  if (!value || typeof value !== "object") {
    throw new Error(
      `Invalid domain config: radar_queries[${index}] must be an object`,
    );
  }

  const query = value as Record<string, unknown>;
  return {
    label: assertString(query.label, `radar_queries[${index}].label`),
    query: assertString(query.query, `radar_queries[${index}].query`),
  };
}

function parseFieldSource(
  value: unknown,
  index: number,
): DomainConfigFieldSource {
  if (!value || typeof value !== "object") {
    throw new Error(
      `Invalid domain config: field_sources[${index}] must be an object`,
    );
  }

  const source = value as Record<string, unknown>;
  const type = assertString(source.type, `field_sources[${index}].type`);
  if (!SOURCE_TYPES.includes(type as SourceType)) {
    throw new Error(`Invalid domain config: field_sources[${index}].type is invalid`);
  }

  return {
    label: assertString(source.label, `field_sources[${index}].label`),
    type: type as SourceType,
    url: assertString(source.url, `field_sources[${index}].url`),
  };
}

function parseScheduledEvent(
  value: unknown,
  index: number,
): DomainConfigScheduledEvent {
  if (!value || typeof value !== "object") {
    throw new Error(
      `Invalid domain config: scheduled_events_seed[${index}] must be an object`,
    );
  }

  const event = value as Record<string, unknown>;
  const category = assertString(
    event.category,
    `scheduled_events_seed[${index}].category`,
  );
  if (!SIGNAL_CATEGORIES.includes(category as SignalCategory)) {
    throw new Error(
      `Invalid domain config: scheduled_events_seed[${index}].category is invalid`,
    );
  }

  return {
    title: assertString(event.title, `scheduled_events_seed[${index}].title`),
    scheduled_date: assertString(
      event.scheduled_date,
      `scheduled_events_seed[${index}].scheduled_date`,
    ),
    category: category as SignalCategory,
    so_what: assertString(event.so_what, `scheduled_events_seed[${index}].so_what`),
  };
}

function parseDomainConfig(raw: unknown): DomainConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid domain config: root must be an object");
  }

  const config = raw as Record<string, unknown>;

  if (!Array.isArray(config.actors)) {
    throw new Error("Invalid domain config: actors must be an array");
  }
  if (!Array.isArray(config.radar_queries)) {
    throw new Error("Invalid domain config: radar_queries must be an array");
  }
  if (!Array.isArray(config.field_sources)) {
    throw new Error("Invalid domain config: field_sources must be an array");
  }
  if (!Array.isArray(config.saved_searches)) {
    throw new Error("Invalid domain config: saved_searches must be an array");
  }
  if (!Array.isArray(config.scheduled_events_seed)) {
    throw new Error("Invalid domain config: scheduled_events_seed must be an array");
  }

  const saved_searches = config.saved_searches.map((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      throw new Error(
        `Invalid domain config: saved_searches[${index}] must be a non-empty string`,
      );
    }
    return item;
  });

  return {
    slug: assertString(config.slug, "slug"),
    name: assertString(config.name, "name"),
    funding_significance_usd: assertNumber(
      config.funding_significance_usd,
      "funding_significance_usd",
    ),
    actors: config.actors.map(parseActor),
    radar_queries: config.radar_queries.map(parseRadarQuery),
    field_sources: config.field_sources.map(parseFieldSource),
    saved_searches,
    scheduled_events_seed: config.scheduled_events_seed.map(parseScheduledEvent),
  };
}

export function loadDomainConfig(slug: string): DomainConfig {
  const configPath = join(process.cwd(), "config", `${slug}.json`);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      throw new Error(`Domain config not found: config/${slug}.json`);
    }
    throw error;
  }

  const config = parseDomainConfig(raw);
  if (config.slug !== slug) {
    throw new Error(
      `Domain config slug mismatch: file is ${config.slug}, expected ${slug}`,
    );
  }

  return config;
}

export function resolveDomainSlug(
  queryDomain?: string | null,
): string {
  return queryDomain?.trim() || process.env.DOMAIN?.trim() || "rare-earths";
}
