# Radar — Market Intelligence Tool

**Live demo:** [radar-market.vercel.app](https://radar-market.vercel.app)

Radar is a market intelligence app that turns scattered industry news into structured, actionable signals. It monitors RSS feeds, Google Alerts, and other sources on a schedule, enriches each item with AI, and surfaces what matters on a living dashboard. Built as a portfolio project by a product designer who codes, it ships a full workflow from ingestion to insight—not just a static UI mockup. The reference domain is **language services & AI**: tracking companies like RWS, TransPerfect, and DeepL, plus industry news from Slator and similar outlets.

## Key features

- **Market Pulse** — A live view of the latest signal per tracked actor, with relevance scoring, categories, and a short “so what” summary.
- **Timeline** — Full signal history with filters by actor, category, and date.
- **Actor profiles & comparison** — Dedicated pages per company with linked signals; side-by-side comparison across actors.
- **AI-generated actor reports** — On-demand strategic briefs powered by Claude Sonnet.
- **Automated daily ingestion** — Vercel cron pulls new items every morning; RSS and Gmail adapters default to a 48-hour window so late runs don’t miss stories.

## Stack

| Layer | Technology |
| --- | --- |
| App | [Next.js 14](https://nextjs.org) (App Router) |
| Database | [Supabase](https://supabase.com) (Postgres) |
| AI | [Anthropic Claude API](https://www.anthropic.com) — Haiku for signal enrichment, Sonnet for actor reports |
| Hosting & cron | [Vercel](https://vercel.com) |
| Sources | Google Alerts + Gmail API, Slator RSS |

## How it works

```
Sources → Ingest → Enrich → Store → Surface
```

1. **Sources** — Configured per domain (RSS URLs, Gmail inbox for Google Alerts, etc.).
2. **Ingest** — The `/api/ingest` pipeline fetches raw items on a daily cron (or on demand with `?from=` / `?to=` for backfill).
3. **Enrich** — Each item is passed to Claude Haiku to extract category, relevance score, linked actors, lifecycle tags, and a one-line implication.
4. **Store** — Signals, actors, and relationships land in Supabase with URL-based deduplication.
5. **Surface** — Market Pulse, Timeline, and actor pages read from the same data layer so the UI stays in sync with what was ingested.

## Screenshots

_Add screenshots here for portfolio use._

Suggested captures:

1. **Market Pulse** — hero stats and actor cards with recent signals  
2. **Timeline** — filtered table view  
3. **Actor profile** — single company with signal list and analysis section  
4. **Compare** — two or more actors side by side  

Save images to `docs/screenshots/` and reference them like:

```markdown
![Market Pulse](docs/screenshots/market-pulse.png)
```

## Local development

```bash
npm install
# Configure .env.local with Supabase and Anthropic API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Domain config lives in `config/`; schema and migrations in `supabase/`.

## License

Private portfolio project — not licensed for redistribution.
