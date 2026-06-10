# Radar — Cursor Kickoff Brief

Active domain: natural-wine-es (rare earths remains as design reference only)

**v1.0 — June 2026**
Hand this file to Cursor at the start of every session. It replaces context you'd otherwise have to re-explain.

---

## What this is

A domain-agnostic market intelligence system for product analysts. It ingests signals (news, filings, regulatory moves, geopolitical events) about tracked actors, enriches them with an LLM, stores a queryable history, and surfaces a living document + quarterly reviews.

The engine is domain-agnostic. Domain specifics (actors, sources, queries, thresholds) live in a config file (`/config/[domain].json`). Switching domains = writing a new config, not touching engine code.

**Example domain:** rare earths / critical raw materials (2026 context, high signal volume).

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Same as Needle-web; deploy to Vercel |
| Database | Supabase (Postgres) | Schema already designed; RLS for multi-domain later |
| Enrichment | Anthropic Claude API (`claude-sonnet-4-20250514`) | Summary + so_what + relevance score + signal_type |
| Ingestion sources | RSS, web search (Claude + Perplexity), SEC EDGAR, targeted scraping | Per source type in config |
| Scheduling | Vercel cron (not Apps Script) | Engine and cron live in same project, one deploy |
| Styling | Tailwind + no border-radius, no rounded cards | Editorial aesthetic, consistent with Needle |

---

## Repo structure

```
/
├── app/
│   ├── page.tsx                  # Living document — default view
│   ├── timeline/page.tsx         # Full signal history with filters
│   ├── actors/page.tsx           # Actor list + tier status
│   ├── proposals/page.tsx        # Pending system proposals for review
│   └── api/
│       ├── ingest/route.ts       # POST — triggered by Vercel cron
│       └── proposals/route.ts    # PATCH — approve/reject a proposal
├── lib/
│   ├── supabase.ts               # Client init
│   ├── enrichment.ts             # Claude API call — returns structured signal
│   ├── ingest/
│   │   ├── rss.ts
│   │   ├── search.ts             # Saved-query web search
│   │   ├── edgar.ts              # SEC EDGAR full-text search
│   │   └── scrape.ts             # Targeted newsroom scraping
│   └── config-loader.ts          # Reads /config/[domain].json
├── config/
│   └── rare-earths.json          # Domain config (actors, sources, queries, thresholds)
├── supabase/
│   └── schema.sql                # Full schema — apply once to Supabase dashboard
├── vercel.json                   # Cron schedule
└── .env.local                    # SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY, PERPLEXITY_API_KEY
```

---

## Database

Schema file: `supabase/schema.sql` (already written — copy contents into Supabase SQL editor and run).

Key tables: `domains`, `actors`, `sources`, `signals`, `signal_actors`, `radar_queries`, `proposals`.
Key views: `living_document`, `upcoming_events`.

On first run, seed the DB from the domain config:
```
POST /api/seed?domain=rare-earths
```
This creates the domain row, all actors, sources, and radar_queries from the JSON. Scheduled events are inserted as signals with `relevance=3`, `scheduled_date` set, and no `captured_at` — they surface in `upcoming_events` automatically.

---

## Build order

Work in this sequence. Each phase produces something independently runnable before moving to the next.

### Phase 1 — Schema + seed (day 1)
1. Apply `schema.sql` to Supabase.
2. Build `config-loader.ts` — reads the domain JSON, returns typed config object.
3. Build `/api/seed` — idempotent (safe to re-run), seeds actors/sources/queries from config.
4. Verify in Supabase dashboard: rows exist, tiers correct, scheduled event for 2026-11-10 is in `signals`.

**Checkpoint:** Supabase has data. Nothing else works yet. That's fine.

### Phase 2 — Enrichment (day 1–2)
Build `lib/enrichment.ts` before any ingestion — it's the most important piece.

Input: raw text + domain context (actor list, categories).
Output (structured, from Claude):
```typescript
{
  category: SignalCategory,
  relevance: 0 | 1 | 2 | 3,
  summary: string,        // 2-3 sentences
  so_what: string,        // one sentence: why this matters
  actors: string[],       // names matching actors in DB
  geography: string[],
  lifecycle: LifecycleEvent | null,
  scheduled_date: string | null,
  event_fingerprint: string   // hash: actors + category + event_date + key facts
}
```

Prompt strategy: give Claude the full actor list and signal categories as context. Ask it to match actor names exactly as they appear in the list. Return JSON only — no preamble, no markdown fences.

Test with the four validation cases from the taxonomy before connecting ingestion:
1. USA Rare Earth acquires Serra Verde (lifecycle + team)
2. EU REsourceEU export restrictions (geopolitical)
3. USA Rare Earth $1.6B LOI with US Gov (commercial)
4. China export-control suspension expiring 2026-11-10 (scheduled future event)

**Checkpoint:** paste raw text of each case, get correct structured output. Fix prompt until all four pass.

### Phase 3 — Ingestion pipeline (day 2–3)
Build source adapters one at a time, in this order (simplest → most complex):

1. `edgar.ts` — EDGAR full-text search API is structured and free. Query: `"rare earth"`, filter by actor names. Returns filings with date, URL, excerpt.
2. `rss.ts` — standard RSS parse. Source URLs come from domain config.
3. `search.ts` — saved queries from config, run via Perplexity API. Returns URLs + snippets.
4. `scrape.ts` — targeted fetch of newsroom URLs. Last resort; use only for Tier 1 actors with no RSS.

Each adapter returns the same shape: `{ title, url, raw_content, source_id, event_date }`. Enrichment runs on top of all of them identically.

Dedupe before inserting: compute `event_fingerprint` after enrichment, check `signals` table. If fingerprint exists, skip (log the duplicate URL for monitoring).

### Phase 4 — Cron + API routes (day 3)
```json
// vercel.json
{
  "crons": [
    { "path": "/api/ingest", "schedule": "0 7 * * 1" }
  ]
}
```
Monday 07:00 UTC. Runs all adapters for all active sources in the domain config.

`/api/ingest` flow:
1. Load domain config
2. Run all adapters → collect raw items
3. Dedupe against existing fingerprints
4. Run enrichment on new items
5. Insert into `signals` + `signal_actors`
6. Check proposal triggers (see Phase 5)
7. Return summary: `{ processed, inserted, skipped_dedupe, errors }`

### Phase 5 — Proposals engine (day 3–4)
After every ingestion run, check:
- Any Tier 3 actor name appearing in ≥ 3 signals this month → propose Tier 2 promotion
- Any unknown source URL appearing in ≥ 5 high-relevance signals → propose Tier 0 candidacy
- Any actor with status `active` appearing in a lifecycle signal → propose archive

Insert into `proposals` table with `rationale` and `evidence_signal_ids`. Surface in `/proposals` UI.

### Phase 6 — Frontend (day 4–5)
Four pages, in build order:

**`/` — Living document**
Group by tier, then by actor. Each actor card: name, role, tier badge, last signal date, latest 2-3 relevant signals. Upcoming events block at top (from `upcoming_events` view). No charts in v1 — this is a reading interface, not a dashboard.

**`/timeline` — Full history**
Table view. Filters: category, actor, tier, relevance, date range. Sortable. This is the quarterly review source.

**`/actors` — Actor registry**
List with tier, role, geography, status. Pending proposals flagged inline.

**`/proposals` — Curation queue**
Each proposal: type, rationale, evidence signals (linked). Approve / Reject buttons → `PATCH /api/proposals/:id`.

**Design rules (Needle-consistent):**
- Black and white only — no color except relevance badges (3=black, 2=dark gray, 1=gray, 0=never shown)
- No border-radius
- Georgia serif for summaries and `so_what` text
- Arial/sans for metadata, labels, UI
- Section separation by background color change, not borders
- Dense information layout — this is a tool, not a landing page

---

## Environment variables

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=       # for saved-query search ingestion
DOMAIN=rare-earths        # which config to load at runtime
```

---

## What not to build in v1

- Authentication / multi-user — single analyst tool, no login
- Free-form tags — structured dimensions only (decided in taxonomy)
- Charts / dashboards — reading interface first
- Email delivery — add after the core loop works (Needle pattern: build the data layer first)
- Multiple simultaneous domains — DOMAIN env var switches domain at deploy time; multi-domain UI comes later

---

## Key decisions already made (do not re-open)

| Decision | Resolution |
|---|---|
| Competitors vs actors | Actors with roles (`producer`, `processor`, `buyer`, `regulator`, `reference`) |
| Funding threshold | Relative to domain — `funding_significance_usd` in domain config |
| Tier 2 surface bar | Score 3 only surfaces in living document; everything stored |
| Conference talks | Context (1) by default; relevant (2) only if announcement made on stage |
| Free-form tags | Excluded from v1 |
| Deduplication | By `event_fingerprint`, not URL |
| Scheduling | Vercel cron, not Apps Script |
| Language | English throughout — docs, UI, outputs |

---

## Reference files

| File | Purpose |
|---|---|
| `radar-taxonomy.md` | Full system design — source of truth |
| `supabase/schema.sql` | DB schema — apply to Supabase before anything else |
| `config/rare-earths.json` | Domain config seed |
| `DESIGN.md` | Visual specification — typography, colors, components, rules |
