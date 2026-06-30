# Radar Market Intelligence — Project Rules for Cursor

These rules apply to every code change in this repository. They exist to prevent design system drift — the gradual reintroduction of hardcoded values that the design system was built to eliminate.

---

## Design tokens — non-negotiable

This project has a fully tokenized design system defined in `app/globals.css`. Every visual property — color, spacing, border radius, typography, transition — has a corresponding CSS custom property.

**Never write a literal value when a token exists for it.**

❌ Wrong:
```css
.new-element {
  color: #0F172A;
  padding: 14px 16px;
  border-radius: 10px;
  transition: all 0.15s;
}
```

✅ Correct:
```css
.new-element {
  color: var(--color-text-primary);
  padding: var(--spacing-card-padding);
  border-radius: var(--radius-card);
  transition: var(--transition-card);
}
```

### Before writing any color, spacing, typography, or motion value:

1. Check `app/globals.css` for an existing token that matches or is close to the intended value.
2. If a token exists, use it via `var(--token-name)`.
3. If no token exists and the value is genuinely new and reusable, propose adding it as a new token in `:root` — do not hardcode it inline, even once.
4. If the value is truly one-off and not meant to be reused anywhere else, hardcoding is acceptable, but flag it explicitly in your response: "This value is hardcoded because [reason] — not added as a token."

### Token reference (keep in sync with app/globals.css)

| Category | Tokens |
|---|---|
| Sidebar colors | `--color-sidebar-from`, `--color-sidebar-to`, `--color-sidebar-border`, `--color-sidebar-text-domain`, `--color-sidebar-text-label`, `--color-sidebar-text-collapse` |
| Text colors | `--color-text-primary`, `--color-text-body`, `--color-text-muted`, `--color-text-dim` |
| Backgrounds | `--color-bg-content-from`, `--color-bg-content-to`, `--color-card-bg`, `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-stat-card` |
| Borders | `--color-border-default`, `--color-card-border`, `--color-border-card` |
| Signal states | `--color-signal-s3-border`, `--color-signal-s3-bg`, `--color-signal-s2-border`, `--color-signal-s2-bg` |
| Filters/badges | `--color-filter-active-bg`, `--color-filter-active-text`, `--color-filter-inactive-bg`, `--color-badge-score3-bg`, `--color-badge-score3-text`, `--color-badge-score2-bg`, `--color-badge-score2-text`, `--color-upcoming-pill-bg` |
| Signal feedback | `--color-new-badge-bg`, `--color-new-badge-text`, `--color-worth-border` |
| Spacing | `--spacing-card-padding`, `--spacing-section-gap`, `--spacing-stat-gap`, `--spacing-signal-padding` |
| Radius | `--radius-card`, `--radius-badge`, `--radius-sidebar-item`, `--radius-button` |
| Motion | `--transition-card`, `--transition-nav` |
| Typography (tokens) | `--font-primary`, `--font-sans`, `--font-weight-regular`, `--font-weight-medium`, `--font-weight-semibold` |
| Layout | `--radar-topbar-height`, `--sidebar-width` |
| Buttons | `.btn-primary`, `.btn-secondary` (use these classes, don't recreate button styles inline) |
| Typography (classes) | `.text-page-title`, `.text-section-label`, `.text-actor-name`, `.text-actor-meta`, `.text-signal-body`, `.text-signal-sowhat`, `.text-date`, `.text-source-url`, `.text-stat-number`, `.text-stat-label`, `.text-nav-item`, `.text-nav-item-active` |

This table may be incomplete or stale — always cross-check `app/globals.css` directly, it is the source of truth.

---

## Category badge colors — intentionally hardcoded

Category badges (Product, Regulatory, Geopolitical, Commercial, Team/M&A, Communications, Technical) use fixed semantic colors that are NOT tokenized as CSS variables by design — they carry fixed meaning and should never be swapped or themed. Do not "fix" these into tokens unless explicitly asked to.

---

## Component reuse

Before creating a new component, check `/components` for an existing one that does the same job. This project has had repeated issues with components being inline-duplicated instead of reused (badges, pills, score indicators). Extract shared logic into `/components/ui/` rather than copy-pasting JSX with new hardcoded styles.

---

## The DS Sync Agent

This project has a pre-commit hook (`scripts/ds-sync-agent.ts`) that runs on every commit touching `app/globals.css`, `/components/**/*.tsx`, or `docs/DESIGN.md`. It:

- Detects new tokens and updates Foundation stories automatically
- Detects new components and scaffolds basic stories
- Detects orphaned components (no longer imported anywhere) and warns (non-blocking)
- Detects hardcoded values introduced in `globals.css` and warns (non-blocking)
- Runs `npm run test-storybook` and **blocks the commit** if accessibility regressions are introduced

Do not bypass this hook with `--no-verify` unless there's a clear, stated reason. If the hook blocks a commit, fix the underlying issue rather than skipping the check.

---

## Accessibility

All components must pass WCAG AA contrast ratios (4.5:1 for text). The test suite enforces this via `@storybook/addon-a11y` with `a11y.test: 'error'`. If a new color or token fails contrast, do not introduce it — find a passing alternative within the same visual intent.

---

## Storybook

Every new shared component (anything used in 2+ routes) needs a corresponding story in `/stories`, organized by function:
```
1. Foundation   — Colors, Typography, Spacing, Icons, Motion
2. Navigation   — Sidebar, PageTopbar
3. Controls     — badges, pills, buttons
4. Data Display — SignalItem, TimelineTable, etc.
5. Layouts      — AppShell, page-level compositions
```

Foundation stories must read values directly from CSS custom properties (`getComputedStyle(document.documentElement)`) — never hardcode example values, or they'll drift from the actual tokens silently.

---

## When in doubt

If a request requires a visual decision not covered by an existing token (a genuinely new color, a new spacing scale, a new component pattern), stop and propose the token/pattern explicitly before implementing — don't silently hardcode a one-off value to move faster.