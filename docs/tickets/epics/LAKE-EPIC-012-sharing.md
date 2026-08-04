# LAKE-EPIC-012 — Sharing

**Phase:** MVP (M4) · **Status:** open

## Goal
Plan sharing and export: the share API with unguessable tokens, rate limits and retention; the read-only shared view with copy-to-my-day; and print/export (REQ-PLAN-08/09/10).

## Success criteria
- Journey J6 works: share creates an immutable snapshot behind a ≥128-bit token; recipients view it in their locale and copy it locally; printing produces a usable one-page day sheet.

## Tickets
[LAKE-048](../tasks/LAKE-EPIC-012-tasks.md#lake-048--plan-share-api) share API · [LAKE-049](../tasks/LAKE-EPIC-012-tasks.md#lake-049--shared-plan-view-and-copy) shared view · [LAKE-050](../tasks/LAKE-EPIC-012-tasks.md#lake-050--print-and-export) print

## Dependencies
LAKE-045…047 (plan model + validation). Sequential after epic 11.

## Key specs
[favorites-and-plans.md](../../ux/favorites-and-plans.md#shared-plans) · [api-contracts.md](../../architecture/api-contracts.md#plans) · [auth-and-anonymous-usage.md](../../architecture/auth-and-anonymous-usage.md#share-tokens)
