# Quick handoff check

Use this file for a low-cost follow-up agent. Do not re-plan the product.

## Current state

- Greenfield repository; documentation only, no product implementation.
- Planning set is complete under `docs/`.
- Backlog: 20 epics and 77 tickets (`LAKE-001` through `LAKE-077`).
- Start implementation with `LAKE-001` in `docs/tickets/tasks/LAKE-EPIC-001-tasks.md`.

## Read first

1. `AGENTS.md`
2. `docs/agents/implementation-guide.md`
3. `docs/roadmap/dependencies.md`
4. The selected ticket only, plus its linked specifications

## Cheap validation

Run from repository root:

```bash
find docs -type f -name '*.md' | wc -l
find docs/tickets/epics -type f -name '*.md' | wc -l
find docs/tickets/tasks -type f -name '*.md' | wc -l
grep -rho 'REQ-[A-Z0-9-]*' docs/product/mvp-scope.md | sort -u
grep -rn 'Bodenseekreis\|Landkreis Konstanz' --include='*.md' .
```

Expected counts: `100` docs Markdown files, `20` epic files, `20` grouped task files. District references must only state that scope is not limited to those districts.

## Guardrails

- Entire Lake Constance shoreline: Germany, Switzerland, Austria, through Stein am Rhein.
- Verified attraction database is the source of truth; preserve provenance.
- German and English from day one.
- No mandatory tourist accounts in the MVP.
- Provider SDKs stay behind map/geocoding/routing abstractions.
- Do not implement phase-2 planner or phase-3 AI before their metric gates.
