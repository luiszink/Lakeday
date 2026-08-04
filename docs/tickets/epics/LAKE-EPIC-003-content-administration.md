# LAKE-EPIC-003 — Content administration

**Phase:** MVP (M1, review queue M3) · **Status:** open

## Goal
The protected admin interface: authentication with 2FA and roles, attraction CRUD with publish workflow, the change-proposal review queue, and the source & licence registry (REQ-DATA-09).

## Success criteria
- An editor signs in with TOTP, creates a bilingual draft, and publishes it only when invariants pass; a reviewer processes change proposals with full evidence; every licence/attribution is registry-backed and the public licences page generates from it.

## Tickets
[LAKE-013](../tasks/LAKE-EPIC-003-tasks.md#lake-013--admin-area-scaffolding) scaffold · [LAKE-014](../tasks/LAKE-EPIC-003-tasks.md#lake-014--admin-authentication) auth · [LAKE-015](../tasks/LAKE-EPIC-003-tasks.md#lake-015--attraction-editor) editor · [LAKE-016](../tasks/LAKE-EPIC-003-tasks.md#lake-016--review-queue) review queue · [LAKE-017](../tasks/LAKE-EPIC-003-tasks.md#lake-017--source-and-licence-registry) registries

## Dependencies
LAKE-006…009 (schema + domain). LAKE-016 also needs LAKE-019 or LAKE-052 to have real proposals (fixtures suffice for development).

## Key specs
[auth-and-anonymous-usage.md](../../architecture/auth-and-anonymous-usage.md#admin-authentication) · [core-user-flows.md F7](../../ux/core-user-flows.md#f7-editor-reviews-a-change-proposal-admin) · [provenance-and-licensing.md](../../data/provenance-and-licensing.md)
