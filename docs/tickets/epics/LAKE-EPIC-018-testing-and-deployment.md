# LAKE-EPIC-018 — Testing and deployment hardening

**Phase:** MVP (M6, launch gate) · **Status:** open

## Goal
Launch readiness: the full e2e persona suite, performance budget enforcement, observability tooling, verified backup/restore, and the launch checklist including legal pages.

## Success criteria
- All seven test personas pass their e2e scenarios on mobile viewports in both locales; Lighthouse budgets enforced; error tracking + uptime + job monitoring live; a restore drill succeeded; launch checklist (incl. ⚠️ legal reviews) signed off.

## Tickets
[LAKE-064](../tasks/LAKE-EPIC-018-tasks.md#lake-064--e2e-persona-suite) e2e suite · [LAKE-065](../tasks/LAKE-EPIC-018-tasks.md#lake-065--performance-budgets) perf budgets · [LAKE-066](../tasks/LAKE-EPIC-018-tasks.md#lake-066--observability-tooling) observability · [LAKE-067](../tasks/LAKE-EPIC-018-tasks.md#lake-067--backup-verification-and-restore-drill) backup drill · [LAKE-068](../tasks/LAKE-EPIC-018-tasks.md#lake-068--launch-checklist-and-legal-pages) launch checklist

## Dependencies
All MVP epics. Final sequential gate before launch.

## Key specs
[testing-strategy.md](../../quality/testing-strategy.md) · [observability.md](../../operations/observability.md) · [maintenance.md](../../operations/maintenance.md#backup-and-restore) · [security-and-privacy.md](../../quality/security-and-privacy.md#legal-review-checklist)
