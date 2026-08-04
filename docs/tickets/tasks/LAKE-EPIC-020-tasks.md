# LAKE-EPIC-020 — Tasks: AI travel assistant (phase 3)

Epic: [LAKE-EPIC-020](../epics/LAKE-EPIC-020-ai-assistant.md). **Planning-ready tickets** — do not start before Gate G2 ([success-metrics.md](../../product/success-metrics.md#g2--build-the-ai-travel-assistant-phase-3)); each requires refinement against then-current code and a fresh LLM-market review. Spec: [ai-travel-assistant.md](../../planning/ai-travel-assistant.md) (binding architecture — the LLM is never a source of truth).

---

## LAKE-074 — Tool interface layer

**Status:** blocked (Gate G2) · **Phase:** 3 · **Parallel:** no (foundation)

**Objective:** The verified-tools layer: `searchAttractions`, `getAttractionDetails`, `generatePlan`, `modifyPlan`, `getWeather` as thin, token-budgeted wrappers over existing APIs, plus the `LlmProvider` abstraction with two provider adapters (⚠️ selection: structured output, tool calling, DE/EN quality, EU processing/DPA, no-training agreement) and fakes.

**Key points:** tool results are the only factual context; payload trimming (planner-relevant fields only) with measured token budgets; per-call timeouts/caps.
**Dependencies:** phase-2 planner shipped. **Files:** `packages/assistant/{tools,llm}/*`, provider decision recorded in external-services.md.
**Tests:** tool contract tests (results ≡ API responses); provider adapter fakes; token-budget assertions.
**Acceptance:** tools consumable by an orchestrator stub; both providers swappable by config.
**Rollback:** package addition; nothing user-facing yet.

---

## LAKE-075 — Orchestrator and validation gate

**Status:** blocked (Gate G2) · **Phase:** 3 · **Parallel:** no (after 074)

**Objective:** The conversation orchestrator: versioned system prompt (hard prohibitions per spec), tool-call loop, structured `AssistantResponse` output, and the deterministic validation gate (schema → ID existence/published → `validatePlan` → hard-constraint recheck → message-consistency spot check) with ≤2-retry repair loop and deterministic fallback.

**Key points:** every displayed plan passed the validator — no exceptions; injection resistance by architecture (fixed tool schemas, no mutating tools beyond the user's draft, output filter); conversation context truncation policy; refusal behaviour for off-topic/trap inputs.
**Dependencies:** LAKE-074. **Files:** orchestrator, prompt (versioned file), validator gate, repair loop.
**Tests:** unit: gate matrix (invented ID, stale-hours claim, constraint violation, malformed output → repair/fallback paths); integration with fake LLM scripting failure modes.
**Acceptance:** fallback demonstrably graceful; zero paths render unvalidated plans.
**Rollback:** feature stays dark until 077 exposes it.

---

## LAKE-076 — Evaluation suite

**Status:** blocked (Gate G2) · **Phase:** 3 · **Parallel:** yes (grows alongside 075)

**Objective:** The ~100-conversation eval dataset (persona creations, modification requests, trap prompts: nonexistent attractions, out-of-scope regions, closed-day requests, injection attempts — both locales) with metric harness (validator pass rate ≥95 % pre-repair, zero invented IDs hard-fail, modification accuracy, refusal correctness, cost per conversation) wired into CI for the assistant package on every prompt/model change.

**Dependencies:** LAKE-075. **Files:** eval dataset (versioned), harness, CI job (budget-capped scheduled runs).
**Acceptance:** baseline metrics recorded; regression gate active; dataset covers every spec category.
**Rollback:** n/a (evals).

---

## LAKE-077 — Assistant UI and cost controls

**Status:** blocked (Gate G2) · **Phase:** 3 · **Parallel:** no (final exposure)

**Objective:** The user-facing assistant: opt-in chat surface rendering validated plan structures (never raw LLM text as plan), change summaries, clarifying questions; rate limits (per-session/day caps, per-IP), cost telemetry with alert thresholds, and the kill switch reverting to the deterministic planner form.

**Key points:** conversations ephemeral by default (privacy per spec); message text clearly styled as commentary vs. the validated plan; all standard localization/a11y/state requirements; G2 cost budget enforced by telemetry alerts + automatic throttling.
**Dependencies:** LAKE-075/076 green. **Files:** assistant route/components, limits middleware, telemetry, kill-switch flag.
**Tests:** e2e conversation flows (fake LLM scripts) incl. trap handling and kill-switch; limit enforcement.
**Acceptance:** full journey (converse → validated plan → edit manually) works both locales; kill switch verified; cost dashboard live.
**Rollback:** kill switch = designed rollback; feature flag dark-launches.
