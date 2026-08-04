# LAKE-EPIC-005 — Bilingual content

**Phase:** MVP (M1) · **Status:** open

## Goal
Full DE/EN internationalization: next-intl foundation with locale routing, localized slugs with redirects and hreflang, the translation-state machine with invalidation, and the four static guide pages for international visitors (REQ-I18N-01, REQ-DISC-09).

## Success criteria
- Every route exists under `/de` and `/en` with localized segments; catalog completeness enforced in CI; source-text changes flag translations STALE; guides published in both languages.

## Tickets
[LAKE-024](../tasks/LAKE-EPIC-005-tasks.md#lake-024--i18n-foundation) foundation · [LAKE-025](../tasks/LAKE-EPIC-005-tasks.md#lake-025--localized-slugs-redirects-hreflang) slugs · [LAKE-026](../tasks/LAKE-EPIC-005-tasks.md#lake-026--translation-state-machine) translation states · [LAKE-027](../tasks/LAKE-EPIC-005-tasks.md#lake-027--static-guide-pages) guide pages

## Dependencies
LAKE-001 (024); LAKE-006 (025/026 need localization tables); LAKE-005 (027 needs shell).

## Key specs
[i18n.md](../../architecture/i18n.md) · [ADR-008](../../adr/ADR-008-i18n-from-start.md) · [information-architecture.md](../../ux/information-architecture.md#url-structure-decision) · persona needs in [personas-and-user-journeys.md](../../product/personas-and-user-journeys.md#international-visitor-information-needs-confirmed-requirement)
