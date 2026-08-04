# Accessibility

Status: **confirmed requirement** — target **WCAG 2.2 AA** (REQ-A11Y-01). Accessibility is also product-critical: accessible-travel data is a differentiator (persona P5), and an inaccessible UI would be self-defeating.

## Standards & scope

- WCAG 2.2 AA for all public screens and the print output; admin interface targets AA pragmatically (keyboard + contrast + labels; smaller audience, faster iteration).
- Tested: automated axe-core in e2e (zero violations budget on core screens) + manual audit per release (keyboard-only and screen-reader passes: NVDA/Firefox, VoiceOver/iOS Safari) — [testing-strategy.md](testing-strategy.md).

## Key requirements by area

### Keyboard navigation
Full operability without a pointer: filter panel (roving focus in chip groups), list browsing, detail page, plan management. **Plan reorder** has explicit ↑/↓ buttons per stop (not drag-only) with focus retention after move ([../planning/manual-planner.md](../planning/manual-planner.md#functional-rules)). Visible focus indicators ≥ 3:1 contrast (WCAG 2.4.13-adjacent); skip-link to results; no keyboard traps (map handled below).

### Screen readers
Semantic landmarks per screen · list items as articles with accessible names ("Insel Mainau, Garten/Park, geöffnet, 2,1 km") · live-region announcements for async result updates ("42 Ergebnisse" / "42 results") · filter state changes announced · conflict warnings tied to their stops via `aria-describedby` · localized `lang` attributes (DE pages `lang="de"`, EN `lang="en"` — correct SR pronunciation).

### Map alternative {#map-alternative}
The map is **never the only path** ([../ux/map-and-list-behaviour.md](../ux/map-and-list-behaviour.md#accessibility)): every result and every geographic fact (distance, direction, municipality) is available in the list and detail views as text. Map canvas gets `role="application"` with keyboard zoom/pan when focused, markers expose accessible names, but the *equivalent-experience guarantee* is the list, not ARIA-on-canvas heroics. Static map images (print/detail) carry meaningful alt text ("Karte: Lage von X in Y, 500 m vom Ufer").

### Reduced motion
`prefers-reduced-motion`: no map fly-to animations (jump-cut instead), no marker bounce, no sheet spring physics, no skeleton shimmer. Enforced by a lint rule for animation utilities + e2e check with emulated preference.

### Visual
Contrast ≥ 4.5:1 text, ≥ 3:1 UI components — including **marker colors against map tiles** (test against the actual tile style; add halo/outline) · never color-only encoding (open/closed states get icons + text) · text resizable 200 % without loss · touch targets ≥ 24×24 CSS px (2.5.8), practically ≥ 44 px for primary actions · dark mode respects the same contrast budget.

### Forms & errors
Labels always visible (no placeholder-as-label) · error messages programmatically associated + plain-language in both locales · date picker keyboard-operable with a text-input fallback.

### Cognitive
Plain language (B1-level German/English for core flows) · icons + text labels together · consistent navigation · "no dead ends" empty states ([../ux/core-user-flows.md](../ux/core-user-flows.md)) · honest uncertainty ("hours unverified") instead of confident wrongness.

## Content accessibility (data side)

- `wheelchairAccess`/`strollerSuitable`/`wheelchairToilet` are **verified-only** fields — `UNKNOWN` is shown as "not verified", never hidden and never guessed ([../data/tag-and-filter-taxonomy.md](../data/tag-and-filter-taxonomy.md)); must-filter semantics exclude UNKNOWN ([../ux/filter-and-search-behaviour.md](../ux/filter-and-search-behaviour.md#general-semantics-decision)).
- Image alt texts are an editorial field per image (localized), required for publication.

## Definition-of-done integration

Every UI ticket carries accessibility acceptance criteria ([../agents/definition-of-done.md](../agents/definition-of-done.md)); axe budget failures block merge; the review checklist includes a keyboard-only smoke pass ([../agents/review-checklist.md](../agents/review-checklist.md)).
