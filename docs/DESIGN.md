# Radar — DESIGN.md
**v2.0 — June 2026**
Visual specification. Reference this file before writing any component. Do not deviate without updating this doc first.

---

## Typography

Hybrid system: Montserrat for identity/structure, Inter for readability.

```
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Inter:wght@400;500;600&display=swap');
```

| Role | Font | Weight | Size | Notes |
|---|---|---|---|---|
| Nav logo | Montserrat | 800 | 16px | `letter-spacing: -0.3px` |
| Nav links | Montserrat | 600 | 12px | — |
| Hero eyebrow | Montserrat | 700 | 10px | uppercase, `letter-spacing: 2px` |
| Hero title | Montserrat | 800 | 26px | `letter-spacing: -0.5px`, `line-height: 1.1` |
| Stat numbers | Montserrat | 900 | 24px | `letter-spacing: -0.5px` |
| Section labels | Montserrat | 700 | 10px | uppercase, `letter-spacing: 1.5px` |
| Actor name / card title | Montserrat | 800 | 14px | — |
| Category badges | Montserrat | 700 | 9px | uppercase, `letter-spacing: 1px` |
| Score badges | Montserrat | 700 | 10px | — |
| Filter button | Inter | 500 | 11px | — |
| Body / signal text | Inter | 400 | 12px | `line-height: 1.55` |
| So-what line | Inter | 600 | 11px | accent color, prefixed with `→` |
| Meta / dates / counts | Inter | 400–500 | 10–11px | muted color |
| Source URL | Inter | 400 | 10px | link color |
| Sidebar items | Inter | 500 | 12px | — |
| Card meta line | Inter | 400 | 11px | muted |

---

## Color palette

### Base (TransPerfect brand colors)
| Token | Hex | Usage |
|---|---|---|
| `--bg-primary` | `#ffffff` | Page background, cards |
| `--bg-secondary` | `#f5f9fd` | Main content area |
| `--bg-accent-light` | `#eaf2fa` | Upcoming bar, active sidebar, score-2 signal bg, stat card bg |
| `--border` | `#dce8f4` | All borders, dividers |
| `--text-primary` | `#071d49` | Actor names, logo, signal text |
| `--text-body` | `#071d49` | All body text |
| `--text-muted` | `#6a6a6a` | Meta text, dates, counts, card meta |

### Accent (TransPerfect brand)
| Token | Hex | Usage |
|---|---|---|
| `--accent-dark` | `#071d49` | Nav background, score-3 badge bg |
| `--accent-main` | `#196dba` | Hero bg, active states, score-3 signal border, so-what text, sidebar active text, hover border |
| `--accent-light` | `#65a8e4` | Sidebar labels, upcoming label, Tier 2 dot, source URL links, dim badges text |
| `--accent-bg` | `#eaf2fa` | Active nav link bg, upcoming bar bg, signal s2 bg, sidebar active bg |
| `--accent-border` | `#c5dbf0` | Upcoming bar border |

### Category badge colors (semantic)
| Category | Background | Text |
|---|---|---|
| Team / M&A | `rgba(99,59,183,0.08)` | `#533ab7` |
| Product | `rgba(25,109,186,0.10)` | `#196dba` |
| Regulatory | `rgba(216,90,48,0.08)` | `#d85a30` |
| Geopolitical | `rgba(216,90,48,0.08)` | `#d85a30` |
| Commercial | `rgba(22,141,91,0.08)` | `#148d5b` |
| Communications | `rgba(100,100,100,0.08)` | `#646464` |
| Technical | `rgba(52,52,52,0.08)` | `#333` |

### Score badges
| Score | Background | Text |
|---|---|---|
| 3 — Critical | `#071d49` | `#ffffff` |
| 2 — Relevant | `#eaf2fa` | `#196dba` |

### Lifecycle tag
| State | Background | Text |
|---|---|---|
| Any lifecycle event | `rgba(216,90,48,0.08)` | `#d85a30` |

---

## Layout

### Grid
- Nav: full width, `height: 52px`, `padding: 0 28px`, `background: #071d49`
- Hero: full width, `padding: 28px 28px 24px`, `background: #196dba`
- Upcoming bar: full width, `padding: 10px 28px`, `background: #eaf2fa`
- Body: two-column grid — sidebar `200px` + main `1fr`
- Sidebar: `padding: 18px 10px`, `border-right: 1px solid #dce8f4`
- Main: `padding: 20px 22px`, `background: #f5f9fd`

### Border radius
- Cards: `10px`
- Badges / pills / category tags: `20px` (pills) or `10px` (small badges)
- Nav links, sidebar items, filter button: `6px`
- Signals: `0 8px 8px 0` (left-border pattern)

### Borders
- All borders: `1px solid #dce8f4`
- Score-3 signal left border: `2px solid #196dba`
- Score-2 signal left border: `2px solid #65a8e4`
- Card hover: `border-color: #196dba`
- No box shadows

---

## Components

### Nav
- Background: `#071d49`
- Logo: `Radar.` — dot in `#65a8e4`, Montserrat 800
- Links: Montserrat 600 12px, `rgba(255,255,255,0.6)` default, white + `rgba(255,255,255,0.1)` bg on active
- Proposal count: `rgba(255,255,255,0.2)` bg, white text

### Hero
- Background: `#196dba` (solid, no gradient)
- Eyebrow: Montserrat 700 10px uppercase, `#65a8e4`
- Title: Montserrat 800 26px white, `letter-spacing: -0.5px`
- Sub: Inter 400 12px, `rgba(255,255,255,0.65)`
- Stats: Montserrat 900 24px white numbers, Inter 500 10px `rgba(255,255,255,0.6)` labels, separated by `rgba(255,255,255,0.2)` dividers

### Upcoming bar
- Background: `#eaf2fa`, border-bottom: `1px solid #c5dbf0`
- Label: Montserrat 700 10px uppercase `#196dba`
- Pills: white bg, `#c5dbf0` border, `border-radius: 20px` — date in `#196dba`/600

### Sidebar
- Items: Inter 500 12px `#6a6a6a`, active = `#eaf2fa` bg + `#071d49` text/600
- Tier dots: 6px circle — Tier 1 `#196dba`, Tier 2 `#65a8e4`
- Section labels: Montserrat 700 9px uppercase `#65a8e4`
- Count badges: `#196dba` bg + white text for new signals; `#eaf2fa` bg + `#65a8e4` text for zero

### Cards
- White bg, `#dce8f4` border, `border-radius: 10px`
- Hover + highlight: `border-color: #196dba`
- Actor name: Montserrat 800 14px `#071d49`
- Meta line: Inter 400 11px `#6a6a6a`
- Footer: `border-top: 1px solid #dce8f4`, `padding-top: 10px`

### Signals (inside cards)
- Left border pattern: `2px solid` + `border-radius: 0 8px 8px 0`
- Score 3: left border `#196dba`, background `#eaf2fa`
- Score 2: left border `#65a8e4`, background `#f5f9fd`
- Category badge: Montserrat 700 9px uppercase, semantic color
- Date: Inter 500 10px `#6a6a6a`
- Text: Inter 400 12px `#071d49`, `line-height: 1.55`
- So-what line: Inter 600 11px `#196dba`, prefixed with `→`
- Source URL: Inter 400 10px `#65a8e4`, clickable, opens new tab

---

## Rules

1. **No gradients.** Hero is flat `#196dba`. Nav is flat `#071d49`. Nothing else.
2. **No shadows.** Cards use border-color transitions only.
3. **Section separation by background color.** White → `#f5f9fd` → `#eaf2fa` — never by borders.
4. **No rounded corners on left-border signals.** `border-radius: 0 8px 8px 0` only.
5. **Signal borders are always 2px.** Everything else 1px.
6. **So-what lines always start with →.**
7. **Category badges are semantic, not decorative.**
8. **Montserrat for structure and identity. Inter for reading.**
9. **Source URL always visible** on signal cards, below the so-what line.