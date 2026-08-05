# LAKE-EPIC-011 — Tasks: Manual plans

Epic: [LAKE-EPIC-011](../epics/LAKE-EPIC-011-manual-plans.md). Global [definition of done](../../agents/definition-of-done.md) applies. Strict chain 045 → 046 → 047.

---

## LAKE-045 — Plan store and stop management

**Status:** done · **Phase:** MVP/M4 · **Parallel:** no (chain start)

**Objective:** REQ-PLAN-01…05, 11: the local plan store (IndexedDB, server-shape-compatible) and stop management UI — add from anywhere, remove, reorder (drag + accessible buttons), date picker, start-point selection.

**User story:** As Familie Weber (P3), I want to assemble tomorrow's stops from favorites and details with a visible running plan so planning feels like ticking boxes, not admin work.

**Context:** [manual-planner.md#functional-rules](../../planning/manual-planner.md#functional-rules), [favorites-and-plans.md#my-day](../../ux/favorites-and-plans.md#my-day-manual-plan), [domain-model.md#plan--planstop](../../architecture/domain-model.md#plan--planstop-user-data-server-side-only-when-shared).

**In scope:** plan store on the LAKE-043 wrapper (single active plan; saved snapshots list); add-to-plan buttons (list/map mini-card/detail/favorites) with toast + undo; duplicate-add no-op with hint; 20-stop cap with honest message; My Day screen skeleton: ordered stop cards (name, duration default from typical, override stepper 15-min), remove, reorder via drag handles (pointer) **and** ↑/↓ buttons; date picker (past-date soft warning); start-point selector reusing the LAKE-031 picker (+ "current position" option, rounded); tab badge with stop count.
**Out of scope:** validation/conflicts/totals (046), full screen integration incl. save UX polish (047), sharing (048).

**Dependencies:** LAKE-043 (wrapper), LAKE-031 (picker), LAKE-029/040 (button surfaces). **Files:** plan store module, `components/plan/**`, My Day route, add-buttons wiring.

**Domain rules:** plan shape identical to server model (share-ready); stop = attraction ID + overrides only.
**API changes:** none. **DB changes:** none.
**UI states:** empty plan (educational: "find attractions" CTA); cap reached; unpublished stop renders disabled (excluded from future totals), removable.
**DE/EN:** all strings localized; date formats per locale.
**A11y:** reorder fully keyboard/SR operable via buttons (focus retention after move, position announced "Stopp 2 von 4"); drag is enhancement only; toasts announced politely.
**Privacy/security:** local-only until share; "current position" start point stored rounded even locally (consistency).

**Acceptance criteria:**
- [ ] Add/remove/reorder/date/start-point all function and persist across reloads offline
- [ ] Keyboard-only reorder passes (explicit e2e); drag works on touch + pointer
- [ ] Badge counts correctly; duplicate add hints; cap enforced at 20
- [ ] Zero network traffic for plan operations (assertion)

**Tests:** Unit: store operations, reorder logic. E2E: assemble-a-plan flow incl. keyboard reorder + offline persistence.
**Manual validation:** device drag ergonomics check.
**Commands:** `pnpm test:e2e -g plan-store`. **Rollback:** revert; local data ignored by absent UI.

---

## LAKE-046 — Plan validation engine

**Status:** done · **Phase:** MVP/M4 · **Parallel:** no (after 045)

**Objective:** REQ-PLAN-06/07: the pure `validatePlan` engine — timeline computation, travel-time heuristic, total duration, and the five conflict checks — shared verbatim by client and server.

**User story:** As a planner, I want honest arithmetic ("you'd arrive 20 minutes before closing") so my plan survives contact with reality.

**Context:** [manual-planner.md#conflict-detection](../../planning/manual-planner.md#conflict-detection-req-plan-07) (checks + severities are binding), [#duration-estimation](../../planning/manual-planner.md#duration-estimation) (heuristic constants = config).

**In scope:** `validatePlan(plan, attractions, date?, holidayCalendars) → PlanValidation` in `packages/domain`: timeline from day start (default 09:00, adjustable) through stops (visit durations + `TravelTimeEstimator` heuristic per mode); conflicts: closed-on-date (rules or closure, incl. next-open-day computation where cheap), arrival-after-closing−30 min, visit-exceeds-closing, hours-unknown/stale info, >12 h span; totals (visit/travel/overall); no-date mode (typical-hours basis, flagged); `TravelTimeEstimator` interface + heuristic implementation (detour factor, mode speeds, PT wait penalty — all config).
**Out of scope:** UI (047), real routing (phase 2 LAKE-073 swaps the estimator), server endpoint use (LAKE-048/049 import it).

**Dependencies:** LAKE-012 (hours engine), LAKE-009. **Files:** `packages/domain/src/plan/{validate,travel}.ts`.

**Domain rules:** conflicts never block (annotations only); UNKNOWN hours produce info-level honesty, not fake confidence; deterministic output.
**API/DB/UI:** none (pure). **DE/EN:** results carry stable codes + parameters; localization at UI.
**A11y/Privacy:** n/a.

**Acceptance criteria:**
- [ ] Golden tests per conflict type incl. the P3 scenario ("closes 17:00, arrive 16:40" warning) and CH-holiday closure case
- [ ] Property tests: monotonicity (adding a stop never shortens totals); determinism; conflicts sorted by timeline
- [ ] Heuristic constants swappable via config (test with alternate factors); estimator interface ready for phase-2 swap
- [ ] Same results in Node and browser bundles (shared-code smoke)

**Tests:** Unit: golden + property suites ([testing-strategy](../../quality/testing-strategy.md) opening-hours/planner areas). **Manual validation:** hand-check one fixture plan's arithmetic.
**Commands:** `pnpm --filter domain test plan`. **Rollback:** pure code.

---

## LAKE-047 — Plan screen integration

**Status:** open · **Phase:** MVP/M4 · **Parallel:** no (after 046)

**Objective:** REQ-PLAN-06/07/08 UI: the complete My Day screen — timeline with arrival estimates, inline conflict warnings with reorder suggestions, total-duration bar, and save/snapshot management.

**User story:** As a planner, I want conflicts visible on the exact stop with a suggested fix so repairing the plan is one interaction.

**Context:** [core-user-flows.md F3](../../ux/core-user-flows.md#f3-plan-a-day), [manual-planner.md](../../planning/manual-planner.md) (severity → presentation mapping).

**In scope:** client-side validate-on-change (LAKE-046, debounced); per-stop arrival/departure estimates with "~" approximation markers + honesty copy (ferries/traffic unmodeled); inline conflict rendering per severity (error-styled warning/warning/info) with `aria-describedby` linkage; simple reorder suggestion ("swap with stop 2 avoids the conflict" — computed by trying adjacent swaps only, no optimizer); total bar (visit/travel split); day-start time adjuster; save → named snapshot in "My plans" list (restore/delete/duplicate); localized conflict messages from validation codes.
**Out of scope:** share (048), print (050), auto-repair beyond adjacent-swap hints.

**Dependencies:** LAKE-045, LAKE-046. **Files:** My Day screen completion, `components/plan/{timeline,conflicts,totals,snapshots}.tsx`.

**Domain rules:** UI renders validation output only — no duplicated logic (lint-guard import direction).
**API changes:** none. **DB changes:** none.
**UI states:** validating (subtle); conflict states per severity; no-date mode banner ("typical hours — pick a date for exact checks"); unpublished-stop handling (from 045) integrated into totals messaging; save success/failure (storage errors).
**DE/EN:** every conflict template localized with parameters (times locale-formatted); approximation language honest in both.
**A11y:** conflicts programmatically associated with stops; total bar has text equivalent; suggestion buttons labelled with outcome; timeline readable in SR order.
**Privacy/security:** still fully local.

**Acceptance criteria:**
- [ ] F3 e2e passes: build → date → conflict appears → apply suggestion → conflict clears → save snapshot → restore
- [ ] All severities visually and programmatically distinct (not color-only)
- [ ] No-date mode honest; date change revalidates; totals match engine output exactly
- [ ] axe clean; SR run-through of a conflicted plan makes sense

**Tests:** E2E: F3 incl. suggestion application (fixture plan with known conflict). Unit: suggestion (adjacent-swap) logic. Visual: conflicted-plan screenshot both locales.
**Manual validation:** device planning session for a real fixture day.
**Commands:** `pnpm test:e2e -g plan-screen`. **Rollback:** screen revert; store/engine stand alone.
