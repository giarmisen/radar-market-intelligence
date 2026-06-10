-- Radar — Supabase schema v1
-- Direct translation of radar-taxonomy.md v0.3
-- Engine tables are domain-agnostic; domain specifics live in `domains` + config.

-- ============================================================
-- DOMAINS — one row per radar instance (rare earths, a11y, ...)
-- ============================================================
create table domains (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,            -- 'rare-earths'
  name text not null,                   -- 'Rare Earths / Critical Raw Materials'
  funding_significance numeric,         -- domain-relative threshold (USD), per taxonomy §4
  created_at timestamptz default now()
);

-- ============================================================
-- ACTORS — actors with roles, tiers, lifecycle (taxonomy §3)
-- ============================================================
create type actor_role as enum ('producer','processor','buyer','regulator','reference');
create type actor_status as enum ('active','archived_shutdown','archived_acquired','candidate');

create table actors (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references domains(id) not null,
  name text not null,
  role actor_role not null,
  tier smallint not null check (tier between 0 and 3),
  status actor_status not null default 'active',
  acquired_by uuid references actors(id),   -- set when status = archived_acquired
  geography text[],                          -- HQ / main operations
  notes text,                                -- human curation notes
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (domain_id, name)
);

-- Tier 3 "wide radar" categories are monitored by query, not entity:
create table radar_queries (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references domains(id) not null,
  label text not null,                  -- 'recycling startups'
  query text not null,                  -- saved search string
  active boolean default true
);

-- ============================================================
-- SOURCES — typed sources, Tier 0 self-management (taxonomy §2)
-- ============================================================
create type source_type as enum (
  'rss','newsroom','filings','official_journal','think_tank',
  'trade_press','patent_db','search_query'
);
create type source_status as enum ('active','candidate','rejected','retired');

create table sources (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references domains(id) not null,
  actor_id uuid references actors(id),  -- null for field-level sources
  type source_type not null,
  url text,
  label text not null,
  status source_status not null default 'active',
  is_tier0 boolean default false,
  hit_count int default 0,              -- feeds the Tier-0-candidate proposal logic
  created_at timestamptz default now()
);

-- ============================================================
-- SIGNALS — the core table (taxonomy §1, §4, §5)
-- ============================================================
create type signal_category as enum (
  'product','regulatory','geopolitical','commercial',
  'team','communications','technical'
);
create type lifecycle_event as enum ('shutdown','acquired','pivot');

create table signals (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references domains(id) not null,

  -- §5 dimensions
  event_date date not null,             -- date of the underlying event
  captured_at timestamptz default now(),
  category signal_category not null,
  geography text[],
  relevance smallint not null check (relevance between 0 and 3),
  relevance_overridden boolean default false,  -- human changed the auto score
  source_id uuid references sources(id),
  source_url text not null,
  title text not null,
  summary text not null,                -- 2-3 sentences, enrichment-generated
  so_what text,                         -- one sentence: why this matters
  lifecycle lifecycle_event,            -- null unless applicable
  scheduled_date date,                  -- future events to resurface
  discard_reason text,                  -- only for relevance = 0

  -- dedupe by underlying event, not URL (taxonomy §4 discard rules)
  event_fingerprint text,               -- hash of normalized {actors, category, event_date, key facts}

  raw_content text                      -- original text for re-enrichment
);

create unique index signals_dedupe on signals (domain_id, event_fingerprint)
  where event_fingerprint is not null;

-- many-to-many: one signal can involve several actors (e.g., M&A)
create table signal_actors (
  signal_id uuid references signals(id) on delete cascade,
  actor_id uuid references actors(id),
  primary key (signal_id, actor_id)
);

-- ============================================================
-- PROPOSALS — "system proposes, human approves" (principle 2)
-- ============================================================
create type proposal_type as enum (
  'promote_actor','demote_actor','new_actor','archive_actor',
  'new_tier0_source'
);
create type proposal_status as enum ('pending','approved','rejected');

create table proposals (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references domains(id) not null,
  type proposal_type not null,
  status proposal_status not null default 'pending',
  subject_actor_id uuid references actors(id),
  subject_source_id uuid references sources(id),
  rationale text not null,              -- system-generated justification
  evidence_signal_ids uuid[],           -- signals that triggered the proposal
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- ============================================================
-- Helpful views
-- ============================================================

-- Living document feed: relevance >= 2 for all actor tiers
create view living_document as
select s.*, array_agg(a.name) as actor_names, min(a.tier) as top_tier
from signals s
join signal_actors sa on sa.signal_id = s.id
join actors a on a.id = sa.actor_id
where s.relevance >= 2
group by s.id;

-- Upcoming scheduled events
create view upcoming_events as
select * from signals
where scheduled_date is not null and scheduled_date >= current_date
order by scheduled_date;
