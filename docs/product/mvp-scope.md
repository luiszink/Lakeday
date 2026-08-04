# MVP scope

Status: **confirmed requirements**. This file is the authoritative requirement list. Every `REQ-*` ID below maps to at least one implementation ticket — see the traceability matrix in [../tickets/README.md](../tickets/README.md#traceability-matrix).

Not in the MVP: see [later-phases.md](later-phases.md). Anything not listed here or there is assumed out of scope until recorded in [../roadmap/open-questions.md](../roadmap/open-questions.md).

## 1. Attraction discovery

| ID | Requirement |
|---|---|
| REQ-DISC-01 | Public attraction list, no login, mobile-first, paginated/virtualized |
| REQ-DISC-02 | Interactive map with attraction markers and clustering |
| REQ-DISC-03 | Attraction detail pages with all published structured fields |
| REQ-DISC-04 | Full-text search across localized names, descriptions, municipality (DE and EN, diacritics-insensitive) |
| REQ-DISC-05 | Configurable structured filters (see section 2) |
| REQ-DISC-06 | Sorting by distance from the selected location |
| REQ-DISC-07 | Sorting by relevance (deterministic score, see [../ux/filter-and-search-behaviour.md](../ux/filter-and-search-behaviour.md#relevance)) |
| REQ-DISC-08 | Location selection: current position (optional geolocation) **or** a chosen place/accommodation address |
| REQ-DISC-09 | All content available in German and English |
| REQ-DISC-10 | Visible data-freshness information ("last verified", stale warnings) on detail pages |
| REQ-DISC-11 | Links to official sources (official website, booking URL) on every detail page |

## 2. Filters

REQ-FILT-01: the MVP ships structured filters for **all** dimensions below. Important behaviour never relies on uncontrolled free-form tags; each dimension is a normalized enum, relation, or dedicated field ([../data/tag-and-filter-taxonomy.md](../data/tag-and-filter-taxonomy.md)). Editorial tags may exist *in addition* for search/SEO only.

| ID | Filter dimension |
|---|---|
| REQ-FILT-02 | Geographic product region |
| REQ-FILT-03 | Distance (radius from selected location) |
| REQ-FILT-04 | Category |
| REQ-FILT-05 | Interests |
| REQ-FILT-06 | Suitable audiences (family, couple, solo, group) |
| REQ-FILT-07 | Child age suitability |
| REQ-FILT-08 | Indoor / outdoor / mixed |
| REQ-FILT-09 | Rain suitability |
| REQ-FILT-10 | Heat suitability |
| REQ-FILT-11 | Season |
| REQ-FILT-12 | Price level (incl. free) |
| REQ-FILT-13 | Expected visit duration |
| REQ-FILT-14 | Currently open, or open on a selected date |
| REQ-FILT-15 | Reachability: walking, bicycle, public transport, car |
| REQ-FILT-16 | Food availability on site |
| REQ-FILT-17 | Café availability |
| REQ-FILT-18 | Picnic suitability |
| REQ-FILT-19 | Reservation requirement |
| REQ-FILT-20 | Wheelchair accessibility |
| REQ-FILT-21 | Stroller suitability |
| REQ-FILT-22 | Dogs allowed |
| REQ-FILT-23 | Available visitor languages |

## 3. Favorites

| ID | Requirement |
|---|---|
| REQ-FAV-01 | No account required for favorites (confirmed; [ADR-004](../adr/ADR-004-anonymous-favorites.md)) |
| REQ-FAV-02 | Anonymous favorites stored locally on the device (IndexedDB/localStorage) |
| REQ-FAV-03 | Architecture allows optional account synchronization later without data-model rewrite |

## 4. Manual day plans ("My Day")

| ID | Requirement |
|---|---|
| REQ-PLAN-01 | Add an attraction to "My Day" from list, map, detail, favorites |
| REQ-PLAN-02 | Remove an attraction from the plan |
| REQ-PLAN-03 | Reorder stops (drag on desktop, accessible up/down controls on mobile) |
| REQ-PLAN-04 | Choose an intended date for the plan |
| REQ-PLAN-05 | Enter a starting point (current position, place search, or accommodation) |
| REQ-PLAN-06 | See estimated total duration (visit durations + coarse travel estimates) |
| REQ-PLAN-07 | Detect and display obvious opening-hour conflicts for the chosen date |
| REQ-PLAN-08 | Save the plan (locally; server-side persisted when shared) |
| REQ-PLAN-09 | Share the plan through an unguessable link (≥128-bit random token) |
| REQ-PLAN-10 | Print / export a simple plan (print stylesheet; PDF via browser print) |
| REQ-PLAN-11 | No mandatory account for any of the above |

Details: [../planning/manual-planner.md](../planning/manual-planner.md).

## 5. PWA

| ID | Requirement |
|---|---|
| REQ-PWA-01 | Responsive Progressive Web App; no native apps in MVP ([ADR-002](../adr/ADR-002-pwa-before-native.md)) |
| REQ-PWA-02 | Installable (manifest, icons, service worker) |
| REQ-PWA-03 | App shell and visited content usable during short offline gaps; graceful offline messaging (no full offline map, see [later-phases.md](later-phases.md)) |
| REQ-PWA-04 | Measurable conditions for a later native decision documented in [../architecture/pwa-strategy.md](../architecture/pwa-strategy.md#native-app-gates) |

## 6. Content and data

| ID | Requirement |
|---|---|
| REQ-DATA-01 | Verified master attraction database with the domain model in [../architecture/domain-model.md](../architecture/domain-model.md) |
| REQ-DATA-02 | Per-fact provenance: source, source type, last-checked, next-refresh, confidence, update status |
| REQ-DATA-03 | Scheduled refresh pipeline with review queue for uncertain changes ([../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md)) |
| REQ-DATA-04 | Duplicate detection on coordinates, normalized names, official URLs, external IDs |
| REQ-DATA-05 | Original summaries only — no copied third-party editorial descriptions |
| REQ-DATA-06 | Publication workflow: draft → review → published; only published attractions are public |
| REQ-DATA-07 | Safe degradation when external sources are unavailable; stale data visibly marked |
| REQ-DATA-08 | Geographic inclusion rule enforced and configurable ([ADR-001](../adr/ADR-001-shoreline-scope.md)) |
| REQ-DATA-09 | Protected content-administration interface for editors/reviewers |
| REQ-DATA-10 | MVP launch dataset: pilot sectors verified (BS-01, BS-14, BS-06) plus coverage of all checklist localities in [geographic-scope.md](geographic-scope.md#important-localities-checklist) |

## 7. Cross-cutting

| ID | Requirement |
|---|---|
| REQ-I18N-01 | Full DE/EN localization of UI and content from the start ([ADR-008](../adr/ADR-008-i18n-from-start.md)) |
| REQ-A11Y-01 | WCAG 2.2 AA target incl. keyboard navigation, screen readers, map alternative, reduced motion ([../quality/accessibility.md](../quality/accessibility.md)) |
| REQ-SEC-01 | GDPR-compliant, anonymous-first, minimal location collection, privacy-friendly analytics, consent handling ([../quality/security-and-privacy.md](../quality/security-and-privacy.md)) |
| REQ-SEC-02 | Rate limiting and abuse protection on all write endpoints (share, reports) |
| REQ-SEO-01 | Indexable localized attraction pages, sitemaps, structured data ([../operations/analytics-and-seo.md](../operations/analytics-and-seo.md)) |
| REQ-OBS-01 | Logging, error tracking, uptime and job monitoring ([../operations/observability.md](../operations/observability.md)) |
| REQ-REP-01 | Users can report incorrect/stale information from a detail page (feeds review queue) |

## Explicitly out of MVP

Unrestricted AI chat, AI-generated itineraries, native apps, live public-transport routing, public user reviews, social features, gamification, restaurant database, paid subscriptions, full offline map. Details and phase gates: [later-phases.md](later-phases.md).
