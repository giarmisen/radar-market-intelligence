export type ActorRole =
  | "producer"
  | "processor"
  | "buyer"
  | "regulator"
  | "reference";

export type SourceType =
  | "rss"
  | "newsroom"
  | "filings"
  | "official_journal"
  | "think_tank"
  | "trade_press"
  | "patent_db"
  | "search_query"
  | "gmail";

export type SignalCategory =
  | "product"
  | "regulatory"
  | "geopolitical"
  | "commercial"
  | "team"
  | "communications"
  | "technical";

export type LifecycleEvent = "shutdown" | "acquired" | "pivot";

export type RelevanceScore = 0 | 1 | 2 | 3;

export interface EnrichmentContext {
  domainSlug: string;
  domainName: string;
  fundingSignificanceUsd: number;
  actors: DomainConfigActor[];
}

export interface EnrichSignalInput {
  rawText: string;
  eventDate: string;
  context: EnrichmentContext;
}

export interface EnrichmentResult {
  category: SignalCategory;
  relevance: RelevanceScore;
  summary: string;
  so_what: string;
  actors: string[];
  geography: string[];
  lifecycle: LifecycleEvent | null;
  scheduled_date: string | null;
  event_fingerprint: string;
  discard_reason: string | null;
  worth_watching: boolean;
}

export interface DomainConfigActor {
  name: string;
  role: ActorRole;
  tier: number;
  geography?: string[];
}

export interface DomainConfigRadarQuery {
  label: string;
  query: string;
}

export interface DomainConfigFieldSource {
  label: string;
  type: SourceType;
  url: string;
}

export interface DomainConfigScheduledEvent {
  title: string;
  scheduled_date: string;
  category: SignalCategory;
  so_what: string;
}

export interface DomainConfig {
  slug: string;
  name: string;
  funding_significance_usd: number;
  actors: DomainConfigActor[];
  radar_queries: DomainConfigRadarQuery[];
  field_sources: DomainConfigFieldSource[];
  saved_searches: string[];
  scheduled_events_seed: DomainConfigScheduledEvent[];
}

export interface SeedCounts {
  inserted: number;
  updated: number;
  skipped: number;
}

export interface SeedResult {
  domain_id: string;
  domain_slug: string;
  actors: SeedCounts;
  radar_queries: SeedCounts;
  sources: SeedCounts;
  scheduled_events: SeedCounts;
}

/** Normalized output from all ingestion adapters (Phase 3). */
export interface IngestRawItem {
  title: string;
  url: string;
  raw_content: string;
  source_id: string;
  event_date: string;
}
