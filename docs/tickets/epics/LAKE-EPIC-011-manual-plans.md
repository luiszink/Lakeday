# LAKE-EPIC-011 — Manual plans

**Phase:** MVP (M4) · **Status:** open

## Goal
The "My Day" manual planner: local plan store with add/remove/reorder/date/start-point, the pure `validatePlan` engine (conflicts, totals, travel heuristics), and the integrated plan screen (REQ-PLAN-01…08, 11).

## Success criteria
- Journey J3 works end-to-end anonymously: build a plan, see honest duration totals and opening-hour conflicts for the chosen date, reorder accessibly, save locally.

## Tickets
[LAKE-045](../tasks/LAKE-EPIC-011-tasks.md#lake-045--plan-store-and-stop-management) store+UI · [LAKE-046](../tasks/LAKE-EPIC-011-tasks.md#lake-046--plan-validation-engine) validatePlan · [LAKE-047](../tasks/LAKE-EPIC-011-tasks.md#lake-047--plan-screen-integration) screen

## Dependencies
LAKE-043 (IndexedDB layer patterns), LAKE-012 (hours engine), LAKE-031 (start-point selection reuse). Internal chain 045→046→047.

## Key specs
[manual-planner.md](../../planning/manual-planner.md) · [favorites-and-plans.md](../../ux/favorites-and-plans.md#my-day-manual-plan) · [core-user-flows.md F3](../../ux/core-user-flows.md#f3-plan-a-day)
