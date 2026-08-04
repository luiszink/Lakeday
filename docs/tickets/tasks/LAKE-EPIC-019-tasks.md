# LAKE-EPIC-019 — Tasks: Deterministic planner (phase 2)

Epic: [LAKE-EPIC-019](../epics/LAKE-EPIC-019-deterministic-planner.md). **Planning-ready tickets** — do not start before Gate G1 ([success-metrics.md](../../product/success-metrics.md#g1--build-the-deterministic-automatic-planner-phase-2)); refine each ticket against then-current code before implementation. Spec: [deterministic-planner.md](../../planning/deterministic-planner.md) (binding architecture).

---

## LAKE-069 — Planner contracts and hard constraints

**Status:** blocked (Gate G1) · **Phase:** 2 · **Parallel:** no (epic foundation)

**Objective:** `PlannerRequest`/`PlanDraft` zod contracts, candidate selection (mode-dependent radius, published-only, cap 200), and the hard-constraint stage (open-on-date/window, accessibility musts, child ages, budget, weather musts, dogs) — pure domain code.

**Key points:** contracts exactly per spec (taxonomy reuse, no planner-private enums); **hard constraints before preferences** is the binding rule; constraint results carry machine-readable exclusion reasons (feeds "why not X" explanations and infeasibility messages); `mustInclude` conflict reporting (never silently dropped).
**Dependencies:** MVP domain package, hours engine, filter vocabulary. **Files:** `packages/domain/src/planner/{contracts,candidates,constraints}.ts`.
**Tests:** unit constraint matrix per persona fixtures; property: no closed/inaccessible stop ever survives constraints.
**Acceptance:** constraint stage provably correct on the fixture personas; contracts stable for 070/072.
**Rollback:** pure package addition.

---

## LAKE-070 — Scoring, construction, breaks

**Status:** blocked (Gate G1) · **Phase:** 2 · **Parallel:** no (after 069)

**Objective:** Transparent scoring (config weights: interestFit/relevance/weatherFit/diversity/proximity), greedy best-insertion construction against the time window with pace buffers, lunch-break placement, `validatePlan` integration with ≤3 soft-retry construction loops, and partial-result reporting.

**Key points:** determinism (seeded tie-breaks); reason codes per stop (`INTEREST_MATCH_*`, `RAIN_SAFE`, `NEAR_ROUTE`…); infeasibility returns best partial + reasons; alternatives list (would-replace suggestions); `POST /api/planner/generate` endpoint (rate-limited) mapping contracts.
**Dependencies:** LAKE-069, LAKE-046 (validatePlan), travel estimator interface. **Files:** `packages/domain/src/planner/{score,construct,breaks}.ts`, API route.
**Tests:** golden persona plans (fixture dataset); property suite (window respected, no error-level conflicts, deterministic).
**Acceptance:** feasible plans for all four golden scenarios; infeasible cases explain themselves.
**Rollback:** endpoint feature-flagged.

---

## LAKE-071 — Feasibility test suite

**Status:** blocked (Gate G1) · **Phase:** 2 · **Parallel:** yes (with 070 iterations)

**Objective:** The dedicated feasibility suite as a permanent regression net: golden plans per test persona (rainy family Konstanz, wheelchair couple Überlingen, budget solo PT Bregenz, toddler half-day Radolfzell), property tests, and plan-quality snapshot reviews (human-readable plan dumps for PR review).

**Dependencies:** LAKE-069/070, fixture extensions for planner scenarios. **Files:** planner test suites + fixture additions.
**Acceptance:** suite green and wired into CI; snapshot-review process documented.
**Rollback:** n/a (tests).

---

## LAKE-072 — Planner UI

**Status:** blocked (Gate G1) · **Phase:** 2 · **Parallel:** yes (after 070 contracts stable)

**Objective:** The preference form (date, window, start, mode, group, ages, interests, budget, pace, meals, accessibility — prefilled from filter state and weather), result presentation with per-stop reasoning, and the handoff into the manual planner for edits (single editing surface).

**Key points:** form ≈ structured, low-friction (abandon-rate is a G2 metric input); generated plans carry `origin: GENERATED`; all localization/a11y/state standards apply (persona P5 keyboard run mandatory); infeasibility UX honest with relaxation suggestions mirroring zero-result patterns.
**Dependencies:** LAKE-070, manual planner (LAKE-047). **Files:** planner route + components.
**Tests:** e2e persona generation flows both locales; a11y checks.
**Acceptance:** generate→review→edit→save journey complete; abandon-tracking events wired.
**Rollback:** route feature-flagged.

---

## LAKE-073 — Routing provider integration

**Status:** blocked (Gate G1) · **Phase:** 2 · **Parallel:** yes

**Objective:** Replace the travel heuristic with real routing behind the existing `TravelTimeEstimator` interface: provider evaluation (OSRM/Valhalla/openrouteservice self-host vs hosted — ⚠️ full licence/cost analysis per [external-services.md](../../architecture/external-services.md#routing-phase-2-only)), adapter + fake, caching of route legs, and fallback to the heuristic on provider failure.

**Key points:** interface unchanged (manual planner benefits automatically); PT mode may remain heuristic if no viable PT-routing source (documented decision); cost ceiling defined before adoption.
**Dependencies:** LAKE-070 (consumer), provider decision. **Files:** routing adapter, cache, evaluation record in external-services.md.
**Tests:** adapter contract tests + failure fallback; plan-quality delta review on golden plans.
**Acceptance:** travel times within sanity bounds on known routes; heuristic fallback proven; costs recorded.
**Rollback:** config swap back to heuristic estimator.
