# LAKE-EPIC-017 — Analytics

**Phase:** MVP (M6) · **Status:** open

## Goal
Privacy-first product measurement: cookieless analytics integration with the defined event plan, zero-result logging, and metric dashboards feeding the phase gates.

## Success criteria
- All events from [analytics-and-seo.md](../../operations/analytics-and-seo.md#event-plan) fire without cookies or user IDs; zero-result queries logged anonymized; gate metrics (G1–G4 inputs) readable from dashboards.

## Tickets
[LAKE-062](../tasks/LAKE-EPIC-017-tasks.md#lake-062--analytics-integration-and-event-plan) integration+events · [LAKE-063](../tasks/LAKE-EPIC-017-tasks.md#lake-063--zero-result-logging-and-gate-dashboards) zero-result+dashboards

## Dependencies
Core UI epics (events need surfaces); DPA verification for the chosen provider (⚠️ [external-services.md](../../architecture/external-services.md#analytics)).

## Key specs
[success-metrics.md](../../product/success-metrics.md) · [security-and-privacy.md](../../quality/security-and-privacy.md#cookies--consent)
