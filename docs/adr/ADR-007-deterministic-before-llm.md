# ADR-007: Deterministic planning before LLM planning

**Status:** Accepted · 2026-08 · **Deciders:** product owner + architecture

## Context

Automatic day planning is a headline future feature, and the temptation is to jump straight to an LLM ("plan my day in Konstanz"). But itinerary construction is fundamentally a constraint problem — opening hours, travel times, visit durations, accessibility, budget — where LLMs are unreliable and unauditable, while rule-based algorithms are cheap, testable, and explainable. An LLM without a deterministic backbone hallucinates feasibility; an LLM *on top of* a deterministic planner only has to do what LLMs are good at: conversation.

## Decision

1. **Phase 2 builds a rule-based deterministic planner first** ([../planning/deterministic-planner.md](../planning/deterministic-planner.md)): structured preferences in → candidate selection → **hard constraints before preferences** → transparent scoring → time-window construction with breaks → validation by the same `validatePlan` engine the manual planner uses. Fully unit-testable, zero marginal cost per plan, explainable via reason codes.
2. **Phase 3 wraps the planner with an LLM assistant** ([../planning/ai-travel-assistant.md](../planning/ai-travel-assistant.md)) that translates conversation into planner/tool calls and explains results — it never constructs feasibility itself, never invents attractions, and every AI-proposed plan passes the deterministic validator before display.
3. Both phases are gated on measured demand (G1, G2 — [../product/success-metrics.md](../product/success-metrics.md#phase-gates)); neither is MVP.
4. The MVP invests only in the shared foundations both need anyway: stable IDs, verified structured data, the pure-domain validation engine, and API contracts.

## Alternatives considered

- **LLM-first planning** — rejected: hallucinated hours/feasibility, per-request cost, untestable regressions, and no fallback when the model misbehaves; also the eval story is far weaker without a deterministic reference.
- **Skip phase 2 entirely if AI matures** — rejected: even with perfect LLMs, the deterministic validator/repair engine remains the guardrail and the cheap default path; the work is not throwaway.
- **Classical OR solver (full optimization / orienteering problem)** — rejected as premature: greedy insertion with constraints is sufficient for 2–6 stop tourist days; a solver can replace the construction step behind the same contract if quality demands it.

## Consequences

- Plan quality is debuggable (reason codes, golden tests per persona) and free of inference costs in phase 2.
- The AI phase inherits a validator, a repair loop target, and a graceful fallback — hallucination prevention by architecture rather than prompt hope.
- Cost: two-phase build takes longer than "just add GPT" demos; the gates keep the investment demand-driven.
- MVP schema/API decisions (taxonomy reuse, `PlanDraft` shape, `TravelTimeEstimator` interface) were made with this path in mind — documented forward-compatibility only, no speculative code.
