# LAKE-EPIC-001 — Repository foundation

**Phase:** MVP (M0/M1) · **Status:** open

## Goal
A working monorepo with CI, local development environment, hosting/staging, and the localized app shell — the platform every other epic builds on.

## Success criteria
- `pnpm dev` serves the app against a seeded local database; CI (lint, typecheck, tests, build) gates every PR; merges to main deploy to staging; the app shell renders localized navigation on mobile.

## Tickets
[LAKE-001](../tasks/LAKE-EPIC-001-tasks.md#lake-001--monorepo-scaffolding) scaffolding · [LAKE-002](../tasks/LAKE-EPIC-001-tasks.md#lake-002--hosting-selection-and-staging-deployment) hosting/staging · [LAKE-003](../tasks/LAKE-EPIC-001-tasks.md#lake-003--ci-pipeline) CI · [LAKE-004](../tasks/LAKE-EPIC-001-tasks.md#lake-004--local-development-environment) local dev · [LAKE-005](../tasks/LAKE-EPIC-001-tasks.md#lake-005--app-shell-and-navigation) app shell

## Dependencies
None (first epic). LAKE-005 additionally needs LAKE-024 (i18n foundation).

## Key specs
[system-architecture.md](../../architecture/system-architecture.md) · [ADR-009](../../adr/ADR-009-technology-stack.md) · [deployment.md](../../operations/deployment.md)
