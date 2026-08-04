# LAKE-EPIC-019 — Deterministic planner

**Phase:** Phase 2 · **Status:** blocked (Gate G1, [success-metrics.md](../../product/success-metrics.md#g1--build-the-deterministic-automatic-planner-phase-2)) · Tickets are **planning-ready**, refined when the gate opens.

## Goal
Rule-based automatic day planning per [deterministic-planner.md](../../planning/deterministic-planner.md): preferences in, feasible validated itinerary out — hard constraints before preferences, explainable scoring, no LLM.

## Success criteria
- Golden persona plans pass the feasibility suite; property tests hold (no closed stops, window respected, deterministic output); generated plans hand off into the manual planner for editing.

## Tickets
[LAKE-069](../tasks/LAKE-EPIC-019-tasks.md#lake-069--planner-contracts-and-hard-constraints) contracts+constraints · [LAKE-070](../tasks/LAKE-EPIC-019-tasks.md#lake-070--scoring-construction-breaks) construction · [LAKE-071](../tasks/LAKE-EPIC-019-tasks.md#lake-071--feasibility-test-suite) tests · [LAKE-072](../tasks/LAKE-EPIC-019-tasks.md#lake-072--planner-ui) UI · [LAKE-073](../tasks/LAKE-EPIC-019-tasks.md#lake-073--routing-provider-integration) routing

## Dependencies
MVP shipped; Gate G1 met; routing-provider evaluation (073, [external-services.md](../../architecture/external-services.md#routing-phase-2-only)).
