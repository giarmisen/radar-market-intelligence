# Radar — System Taxonomy
**v0.3 — June 2026**
Design document, written before any code. Defines what the system tracks, how it classifies signals, and how curation works. The engine is domain-agnostic; domain configuration (actors, sources, queries, thresholds) lives separately.

---

## Principles

1. **Living document, not an infinite log.** The system maintains the current state of the market, with a queryable history underneath. Two views: *state* and *timeline*.
2. **The system proposes, the human approves.** Automated detection, human curation. Applies to new sources, tier changes, actor entries and exits.
3. **Portable engine, configurable domain.** Switching domains = changing the config file (actors, sources, queries, thresholds), not the code.

---

## 1. Signal types (7 categories)

| Category | What's in | Notes |
|---|---|---|
| **Product** | Launches, features, pricing, deprecations, new capacity | In industrial domains: plants, production capacity |
| **Regulatory** | Formal rule-making: approvals, standards, enforcement, administrative sanctions | CE/FDA in medtech; CRMA, mining licenses in raw materials |
| **Geopolitical** | State power moves: export controls, tariffs, bilateral deals, state stockpiling | Separate from Regulatory: here the state acts as a strategic actor, not a rule-maker |
| **Commercial** | Partnerships, contracts (public and private), offtakes, geographic expansion, use cases | |
| **Team** | Senior hires, departures, layoffs, funding, M&A | M&A also triggers a *lifecycle* event |
| **Communications** | Press releases, leadership posts, papers, conferences, trade press | |
| **Technical** | Patents | Stack changes: excluded (noise in practice) |

**Cross-cutting — Actor lifecycle:** shutdown, acquisition, major pivot. Not just another signal: it changes the actor's state in the document (exits, mutates, or is tracked through its acquirer).

## 2. Sources — DRAFT, pending review

Each signal type maps to source types. Domain config supplies the concrete URLs/queries; the engine only knows source *types*.

| Signal type | Primary source types | Rare-earths examples |
|---|---|---|
| Product | Company newsrooms, investor relations pages, trade press | Company press pages; Argus/Fastmarkets coverage |
| Regulatory | Official journals, regulator newsrooms, legal trackers | EUR-Lex, Federal Register, MOFCOM announcements |
| Geopolitical | Government releases, policy think tanks, Tier 0 analysis | EU Commission, US DOE/Commerce, MERICS, CSIS |
| Commercial | SEC/regulatory filings, company IR, procurement portals | SEC 8-K filings (very high signal in US-listed actors) |
| Team | Filings, LinkedIn announcements, funding databases | 8-K, press releases |
| Communications | RSS of company blogs, conference programs, trade press | Company feeds |
| Technical | Patent databases | EPO/USPTO searches by assignee |

**Ingestion mechanics per source type:**
- RSS where available (cheapest, most reliable)
- Scheduled web search with saved queries (engine-level, domain-configured)
- Targeted page scraping for high-value pages with no feed (newsroom, pricing, careers)
- Filings APIs where the domain has listed companies (SEC EDGAR is free and structured)

**Tier 0 self-management:** when ingestion repeatedly captures high-relevance signals from an untracked source, the source is flagged as a Tier 0 candidate. Human approves or rejects. Same propose-and-approve loop as actors.

## 3. Actors

Model: **actors with roles**, not "competitors". Roles: `producer`, `processor`, `buyer`, `regulator`, `reference`. A SaaS domain would only use `producer` + `reference`; supply-chain domains use all five.

### Tracking tiers

| Tier | Name | Coverage |
|---|---|---|
| **0** | Reference | Sources that frame the field (institutions, analysts, price reporting). Not competitors: authoritative context. |
| **1** | Focus | Exhaustive tracking across all 7 categories. |
| **2** | Peripheral | High-impact signals only. **Only score-3 signals surface in the living document** (decided: keeps the document lean). All signals still stored in history. |
| **3** | Wide radar | Whole categories, not specific companies ("recycling startups", "Greenland projects"). Monitored by query, not by entity. |

### Lifecycle

- **Entry:** a Tier 3 actor accumulating relevant signals → the system proposes promotion to Tier 2.
- **Promotion/demotion:** automatic proposal based on signal frequency × relevance; human decision.
- **Exit:** shutdown → archived with history intact. Acquisition → archived + tracking redirected to the acquirer.

### Initial set — example domain: rare earths / critical raw materials

**Tier 0 (seed):** USGS, IEA Critical Minerals, EU DG GROW, European Court of Auditors, MERICS, CSIS, RAND, Argus Media, Fastmarkets

**Tier 1 — producers (Western):** MP Materials (US), Lynas Rare Earths (AU), USA Rare Earth (US), Iluka Resources (AU), Energy Fuels (US)

**Tier 1 — producers (China):** China Northern Rare Earth Group, China Rare Earth Group, JL Mag Rare-Earth, Shenghe Resources

**Tier 2 — processors:** Solvay, Neo Performance Materials, Arafura Rare Earths

**Tier 2 — strategic buyers:** Lockheed Martin, Raytheon, Airbus Defence, Tesla, BYD, Vestas, Siemens Gamesa

**Tier 2 — regulators:** US DOE, EU Commission, MOFCOM (China), Australian Gov

**Tier 3 — categories:** recycling startups (Cyclic Materials, Phoenix Tailings, Ionic Rare Earths as examples), new projects in Greenland / Ukraine / Africa

> Note: initial set generated through research, not domain expertise. This is deliberate — it validates that the tool works in domains where the analyst is not an expert. The set self-corrects through use.

## 4. Relevance scoring

Every signal gets a score 0–3 at enrichment time. The score determines what surfaces in the living document vs. what stays in the queryable history vs. what gets discarded.

| Score | Meaning | Rule of thumb |
|---|---|---|
| **3 — Critical** | Changes the state of the field or of a Tier 1 actor | "If I only read three things this month, this is one of them" |
| **2 — Relevant** | Updates the picture of an actor or trend; feeds the quarterly review | Goes into the living document (Tier 1 actors) |
| **1 — Context** | Useful background; stored, not surfaced | Searchable history only |
| **0 — Noise** | Discarded after logging the discard reason | Never enters the document |

### Always-look triggers (auto-score ≥ 2, flag for human review)
- Any lifecycle event on any tracked actor (M&A, shutdown, major pivot)
- Any Geopolitical signal touching the domain's core supply chain
- Any Regulatory enforcement action (not proposals — actions)
- Any Tier 1 actor + {funding above the domain's significance threshold, major contract/offtake, C-level change}
- Any scheduled future event reaching its date (e.g., China's export-control suspension expiring 2026-11-10)

### Discard rules (auto-score 0)
- Self-promotional press releases with no new factual content (marketing language, no numbers, no commitments, no dates) ← *validated rule from Jacoti practice*
- Aggregator articles that only repackage an already-captured signal (dedupe by underlying event, not by URL)
- Opinion pieces with no primary information (unless from a Tier 0 source)
- Routine financial reporting with no surprises (earnings in line with expectations)

### Resolved decisions
- **Funding threshold: relative to domain norms.** The domain config defines `funding_significance` (e.g., rare earths: $200M; SaaS: $20M). The engine compares against the config, never against a hard-coded number.
- **Tier 2 bar: raised.** Only score-3 signals from Tier 2 actors surface in the living document. Everything is stored.
- **Conference talks: context (1) by default; relevant (2) when a tracked actor announces something substantive on stage.** The announcement is the signal, not the talk.

## 5. Tags and dimensions — DRAFT, pending review

Dimensions every signal carries (these become the Supabase schema):

| Dimension | Type | Notes |
|---|---|---|
| `date` | date | Date of the underlying event, not of capture |
| `captured_at` | timestamp | When the system ingested it |
| `signal_type` | enum (7) | Product / Regulatory / Geopolitical / Commercial / Team / Communications / Technical |
| `actors` | array | One signal can involve several (e.g., an acquisition involves two) |
| `geography` | array | Countries/regions affected |
| `relevance` | int 0–3 | Assigned at enrichment, human-overridable |
| `source_url` + `source_type` | text + enum | Original source, traceable |
| `summary` | text | 2–3 sentences, written at enrichment |
| `so_what` | text | One sentence: why this matters. The most valuable field for report generation |
| `lifecycle_event` | nullable enum | shutdown / acquired / pivot — only when applicable |
| `scheduled_date` | nullable date | For future events the system should resurface |
| `discard_reason` | nullable text | Only for score-0; keeps the discard auditable |

Free-form tags deliberately excluded for v1: every free-tag system degrades into inconsistency without a curation process of its own. Structured dimensions cover the report use cases. Revisit if real queries hit a wall.

## 6. Outputs

Two products, distinct:

1. **Living document** — current state per actor: what it is, what tier, latest relevant signals, curation notes.
2. **Quarterly review** — field summary per quarter: what happened, emerging patterns, structural changes, actor movements. Generated by a query skill over ~90 days of history.

All system documentation and outputs are written in English.

## 7. Cadence

Starting hypothesis: **weekly ingestion, quarterly review.** To be validated against the domain's actual signal volume. Rare earths in 2026 is a high-volume domain; if weekly triage exceeds ~30 minutes of human review, tighten discard rules before tightening cadence.

---

## Validation cases (real signals, June 2026)

To test the pipeline once it exists:

1. **Lifecycle + Team:** USA Rare Earth acquires Serra Verde Group (~$2.8B, April 2026) → Serra Verde archived as an entity, tracking redirected to USAR.
2. **Geopolitical:** European Commission restricts exports of rare earth waste and battery scrap (REsourceEU plan, effective 2026).
3. **Commercial:** USA Rare Earth LOI with US Gov — access to $1.6B in CHIPS funding (January 2026).
4. **Geopolitical (scheduled future event):** China's suspension of the second wave of export controls expires November 10, 2026 → the system should hold this as a calendar event, not just react when it happens.
