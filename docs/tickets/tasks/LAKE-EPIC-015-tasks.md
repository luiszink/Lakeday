# LAKE-EPIC-015 — Tasks: Accessibility

Epic: [LAKE-EPIC-015](../epics/LAKE-EPIC-015-accessibility.md). Global [definition of done](../../agents/definition-of-done.md) applies. Accessibility is built per-ticket; these tickets add automation + audits.

---

## LAKE-058 — axe CI and keyboard/screen-reader audit

**Status:** open · **Phase:** MVP/M6 · **Parallel:** yes

**Objective:** REQ-A11Y-01 automation + first full audit: axe-core integrated into e2e with zero-violation budgets on core screens, plus a complete keyboard-only and screen-reader audit of flows F1–F6 with fixes.

**User story:** As a screen-reader user, I want every core journey completable without sight or pointer so the product's accessibility promise is real.

**Context:** [accessibility.md](../../quality/accessibility.md) (requirements), [testing-strategy.md](../../quality/testing-strategy.md) (a11y suite).

**In scope:** axe in Playwright for: discover list+filters, map view (fallback list focus), detail, favorites, My Day, shared plan, guides, report flow — zero-violations budget as CI gate; keyboard audit (F1–F6: focus order, visible indicators, no traps, skip links, sheet/dialog focus management) with fix PR(s) inside this ticket's scope; screen-reader audit (NVDA/Firefox + VoiceOver/iOS on staging) against a scripted protocol; audit findings documented + fixed or ticketed with severity.
**Out of scope:** motion/contrast/map specifics (LAKE-059), admin AA polish (pragmatic ongoing).

**Dependencies:** epics 6–12 merged. **Files:** e2e a11y specs, fixes across components, audit protocol doc (`docs/quality/` appendix or PR notes).

**Domain rules / API / DB:** none.
**UI states:** audits explicitly include loading/empty/error/stale states (announcements).
**DE/EN:** audits run in both locales (SR pronunciation via correct `lang`).
**A11y:** the ticket itself. **Privacy/security:** none.

**Acceptance criteria:**
- [ ] axe budgets green in CI for all listed screens (both locales)
- [ ] Scripted keyboard protocol passes F1–F6 incl. plan reorder and filter sheet
- [ ] SR protocol passes: results announced, conflicts associated, toggle states correct
- [ ] Zero unfixed critical/serious findings; lower findings ticketed

**Tests:** the axe suite + protocol scripts are the deliverable.
**Manual validation:** the audits are manual by nature; record screencasts/notes.
**Commands:** `pnpm test:e2e -g a11y`.
**Rollback:** n/a (fixes are regular changes).

---

## LAKE-059 — Reduced motion, contrast, and map accessibility

**Status:** open · **Phase:** MVP/M6 · **Parallel:** yes

**Objective:** Complete the remaining AA specifics: `prefers-reduced-motion` compliance, full contrast audit (including markers against real tiles and dark mode decision), and map keyboard/SR verification.

**Context:** [accessibility.md](../../quality/accessibility.md#reduced-motion) (+ visual, map sections); dark-mode ship/no-ship decision (from LAKE-005 note) made here.

**In scope:** reduced-motion sweep (map fly-to → jump, sheets, skeletons, toasts) + lint rule for animation utilities + e2e with emulated preference; contrast audit of tokens (4.5:1 text, 3:1 components) incl. marker halo/outline against the actual tile style, badge/chip states, focus indicators; dark mode: decide ship-or-defer — if ship, token variants with the same contrast budget; touch-target verification (≥24 px strict, ≥44 px primary); map keyboard controls + marker accessible-name verification (LAKE-033 features re-audited); static-map alt-text pattern check.
**Out of scope:** re-auditing what LAKE-058 covered (coordinate scopes).

**Dependencies:** LAKE-058 (sequencing sanity), LAKE-033. **Files:** token adjustments, marker style, lint rule, e2e specs.

**Domain rules / API / DB:** none.
**UI states:** skeleton shimmer disabled under reduced motion (static placeholder).
**DE/EN:** n/a beyond audited surfaces.
**A11y:** the ticket itself. **Privacy/security:** none.

**Acceptance criteria:**
- [ ] Reduced-motion e2e: no animated transitions detected under emulated preference
- [ ] Contrast report: all tokens/markers pass (documented measurements); dark-mode decision recorded (+ implemented if ship)
- [ ] Map keyboard operation + marker names verified; touch-target sweep passes

**Tests:** e2e reduced-motion + contrast assertions where automatable; manual measurements documented.
**Manual validation:** real-tile marker contrast check on device in sunlight (the actual failure mode).
**Commands:** `pnpm test:e2e -g motion`.
**Rollback:** token changes revert cleanly.
