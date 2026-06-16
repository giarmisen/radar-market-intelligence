# Radar — DESIGN.md
**v3.0 — June 2026**
Visual specification. Reference this file before writing any component. Do not deviate without updating this doc first.

---

## Aesthetic direction

Linear-light. White content area, `#FAFAFA` sidebar, black as the only accent color. Clean, dense, readable. No hero sections, no colored backgrounds on large areas. Color appears only where it carries meaning — category badges (semantic), NEW badge (green), Worth Watching border (amber). Everything else is black, white, and grays.

---

## Typography

Single font: **Inter**. Two weights only in practice: 400 (body) and 500–600 (labels, headings). Never 700 or 800 — hierarchy comes from size and color, not weight.

```
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
```

| Role | Weight | Size | Color | Notes |
|---|---|---|---|---|
| Logo | 600 | 12px | `#111` | `letter-spacing: 0.3px` |
| Page title | 600 | 16px | `#111` | `letter-spacing: -0.3px` |
| Page subtitle | 400 | 11px | `#C0C0C0` | |
| Section label | 500 | 10px | `#C0C0C0` | uppercase, `letter-spacing: 0.8px` |
| Actor name / card title | 600 | 13px | `#111` | |
| Actor meta | 400 | 11px | `#C0C0C0` | |
| Sidebar nav item | 400 | 13px | `#888` default, `#111` active | |
| Filter pill label | 500 | 11px | varies | |
| Signal body text | 400 | 12px | `#444` | `line-height: 1.55` |
| So-what line | 500 | 11px | `#555` | prefixed with `→` |
| Category badge | 500 | 9px | semantic | uppercase, `letter-spacing: 0.6px` |
| Score badge | 500 | 10px | see below | |
| Date / meta | 400 | 10px | `#C0C0C0` | |
| Source URL | 400 | 10px | `#C0C0C0` | |
| Stat number | 600 | 20px | `#111` | `letter-spacing: -0.5px` |
| Stat label | 500 | 10px | `#C0C0C0` | uppercase, `letter-spacing: 0.8px` |
| Worth Watching body | 400 | 12px | `#444` | `line-height: 1.5` |
| Worth Watching meta | 400 | 10px | `#C0C0C0` | |

---

## Color palette

### Base
| Token | Hex | Usage |
|---|---|---|
| `--bg-primary` | `#ffffff` | Page background, cards, content area |
| `--bg-secondary` | `#FAFAFA` | Sidebar, stat cards, signal backgrounds |
| `--bg-tertiary` | `#F5F5F5` | Filter pills (inactive), upcoming pills |
| `--border-default` | `#EBEBEB` | Sidebar border, dividers |
| `--border-card` | `#F0F0F0` | Card borders, section borders |
| `--text-primary` | `#111111` | All primary text, headings, actor names |
| `--text-body` | `#444444` | Signal body text |
| `--text-muted` | `#888888` | Sidebar items (inactive), filters (inactive) |
| `--text-dim` | `#C0C0C0` | Dates, meta, labels, counts |

### Accent (black only)
| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#111111` | Active sidebar item text, score-3 badge bg, score-3 signal border, filter active bg, proposal badge |
| `--accent-bg` | `#F0F0F0` | Active sidebar item bg, card hover border |

### Semantic colors (only for meaning, never decoration)
| Usage | Background | Text / Border |
|---|---|---|
| NEW badge | `#DCFCE7` | `#16A34A` |
| Worth Watching border | `#FEF3C7` | — |
| Proposal count badge | `#111` | `#fff` |

### Category badge colors
| Category | Background | Text |
|---|---|---|
| Product | `#F0FDF4` | `#15803D` |
| Regulatory | `#FEF2F2` | `#B91C1C` |
| Geopolitical | `#FFF7ED` | `#C2410C` |
| Commercial | `#EFF6FF` | `#2563EB` |
| Team / M&A | `#F5F3FF` | `#6D28D9` |
| Communications | `#EFF6FF` | `#2563EB` |
| Technical | `#F9FAFB` | `#374151` |

### Score badges
| Score | Background | Text |
|---|---|---|
| 3 — Critical | `#111111` | `#ffffff` |
| 2 — Relevant | `#F0F0F0` | `#888888` |

---

## Layout

### Overall structure
- Two-column grid: sidebar `200px` + main `1fr`
- Sidebar: `background: #FAFAFA`, `border-right: 1px solid #EBEBEB`, `padding: 16px 8px`
- Main: two sub-areas — topbar (white, `border-bottom: 1px solid #F0F0F0`) + content area (`background: #FAFAFA`, `padding: 18px 24px`)

### Sidebar
- Logo: 12px/600, `padding: 4px 10px`, `margin-bottom: 12px`
- Nav items: 13px/400, `padding: 6px 10px`, `border-radius: 6px`
- Active: `background: #F0F0F0`, `color: #111`, weight 500
- Hover: `background: #F0F0F0`, `color: #111`
- Divider before Proposals: `height: 1px`, `background: #EBEBEB`, `margin: 8px 4px`
- Icons: Tabler outline, 14px, inherit color

### Topbar (inside main)
- `padding: 16px 24px 0`
- Title + last-ingestion time on the same row
- Subtitle below title
- Filter pills below subtitle, `padding-bottom: 12px`

### Filter pills
- `font-size: 11px`, `font-weight: 500`, `border-radius: 20px`, `padding: 4px 12px`
- Inactive: `background: #F5F5F5`, `color: #888`
- Active: `background: #111`, `color: #fff`
- Hover (inactive): `background: #EBEBEB`, `color: #111`

### Stat cards
- `background: #fff`, `border: 1px solid #F0F0F0`, `border-radius: 8px`, `padding: 12px 14px`
- Grid of 4 with `gap: 8px`

### Upcoming bar
- `background: #fff`, `border: 1px solid #F0F0F0`, `border-radius: 8px`, `padding: 10px 14px`
- Pills: `background: #F5F5F5`, `border-radius: 20px`, `padding: 3px 10px`
- Date inside pill: `color: #111`, `font-weight: 600`

### Cards
- `background: #fff`, `border: 1px solid #F0F0F0`, `border-radius: 10px`, `padding: 14px 16px`
- Hover: `border-color: #DDD`, `box-shadow: 0 4px 12px rgba(0,0,0,0.06)`, `transform: translateY(-1px)`, `transition: all 0.15s`
- Footer: `border-top: 1px solid #F5F5F5`, `padding-top: 8px`, `margin-top: 10px`

### Signals (inside cards)
- Left border pattern: `border-left: 2px solid`, `border-radius: 0 6px 6px 0`, `padding: 7px 10px`
- Score 3: `border-left-color: #111`, `background: #F8F8F8`
- Score 2: `border-left-color: #EBEBEB`, `background: #FAFAFA`
- NEW badge: `background: #DCFCE7`, `color: #16A34A`, 9px/600, `border-radius: 20px`, `padding: 2px 6px`

### Worth Watching section
- No full-width colored background — integrated as a group in the content flow
- Header: amber dot (6px, `#F59E0B`) + label
- Cards: `background: #fff`, `border: 1px solid #FEF3C7`, `border-radius: 10px`, `padding: 12px 14px`

---

## Navigation structure

**Sidebar contains only global views — never contextual filters:**
1. Market Pulse
2. Timeline
3. Reports
4. Actors
5. (divider)
6. Proposals `[count badge]`

**Tier/actor filters live inside pages** — as filter pills in the topbar of Market Pulse and Timeline. Not in the sidebar.

---

## Rules

1. **No hero sections.** No full-width colored backgrounds. The topbar is white, the content area is `#FAFAFA`.
2. **Black is the only accent.** No brand blues, no greens, no purples as accent. Color only in semantic badges (category, NEW, Worth Watching border).
3. **No shadows on cards by default.** Only on hover, and subtle: `0 4px 12px rgba(0,0,0,0.06)`.
4. **Sidebar = navigation only.** No actor lists, no tier breakdowns. Those go inside the page.
5. **Inter only, max weight 600.** Never 700 or 800.
6. **So-what lines always start with →.**
7. **Source URL always visible** on signal cards, below the so-what.
8. **NEW badge = green, always.** Only for signals captured in the last 24h.
9. **Worth Watching border = amber.** Not the card background — just the border.
10. **Transitions: 0.15s on cards, 0.12s on sidebar items.**