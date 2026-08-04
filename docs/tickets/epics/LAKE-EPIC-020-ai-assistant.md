# LAKE-EPIC-020 — AI travel assistant

**Phase:** Phase 3 · **Status:** blocked (Gate G2, [success-metrics.md](../../product/success-metrics.md#g2--build-the-ai-travel-assistant-phase-3)) · Tickets are **planning-ready**, refined when the gate opens.

## Goal
Conversational planning per [ai-travel-assistant.md](../../planning/ai-travel-assistant.md): an LLM orchestrator over verified tools with structured output, a deterministic validation gate, evaluation suite, and strict cost controls. The LLM never becomes a source of truth.

## Success criteria
- Validator pass rate ≥ 95 % pre-repair on the eval set; zero invented attraction IDs; trap prompts refused correctly; cost per conversation within the G2 budget; kill switch reverts to the deterministic planner.

## Tickets
[LAKE-074](../tasks/LAKE-EPIC-020-tasks.md#lake-074--tool-interface-layer) tools · [LAKE-075](../tasks/LAKE-EPIC-020-tasks.md#lake-075--orchestrator-and-validation-gate) orchestrator · [LAKE-076](../tasks/LAKE-EPIC-020-tasks.md#lake-076--evaluation-suite) evals · [LAKE-077](../tasks/LAKE-EPIC-020-tasks.md#lake-077--assistant-ui-and-cost-controls) UI+cost

## Dependencies
LAKE-EPIC-019 shipped; Gate G2 met; LLM provider selection with EU/DPA requirements (074).
