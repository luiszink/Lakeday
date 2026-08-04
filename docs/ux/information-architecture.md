# Information architecture

Status: **recommendation** (structure), **architectural decision** (URL scheme, locale routing).

## Screen inventory (MVP)

| Screen | Purpose | Requirements |
|---|---|---|
| Discover (list) | Default entry; filterable, sortable attraction list | REQ-DISC-01/04/05/06/07 |
| Discover (map) | Same result set on a map; toggle with list | REQ-DISC-02 |
| Attraction detail | All published fields, freshness, official links, add-to-favorites/plan | REQ-DISC-03/10/11 |
| Filters panel | Full filter UI (sheet on mobile, sidebar on desktop) | REQ-FILT-* |
| Favorites | Locally saved attractions | REQ-FAV-* |
| My Day (plan) | Current plan: stops, reorder, date, start point, conflicts, share, print | REQ-PLAN-* |
| Shared plan view | Read-only plan via token link, copy-to-my-day | REQ-PLAN-09 |
| Guides (static) | "Getting around", "Money & borders", "Sundays & holidays", "Guest cards" | Persona needs (J4) |
| About/Legal | Imprint, privacy policy, licenses & attribution | REQ-SEC-01, OSM attribution |
| Report issue | Per-attraction incorrect-info report | REQ-REP-01 |
| Admin (protected) | Content administration, review queue | REQ-DATA-09 |

## Navigation model

Mobile (primary): bottom tab bar with 4 tabs — **Discover**, **Favorites**, **My Day**, **More** (guides, language, about). The list/map toggle lives inside Discover as a persistent segmented control ([map-and-list-behaviour.md](map-and-list-behaviour.md)).

Desktop: top navigation with the same four sections; filters as left sidebar; map and list side by side ≥1024 px.

## URL structure (decision)

Locale-prefixed, human-readable, stable, indexable ([../architecture/i18n.md](../architecture/i18n.md), [../operations/analytics-and-seo.md](../operations/analytics-and-seo.md)):

```
/de, /en                                    → Discover (list)
/{locale}/karte | /{locale}/map             → Discover (map view)
/{locale}/orte/{slug} | /{locale}/places/{slug}   → Attraction detail
/{locale}/favoriten | /{locale}/favorites
/{locale}/mein-tag | /{locale}/my-day
/{locale}/plan/{shareToken}                 → Shared plan (read-only)
/{locale}/guides/{guide-slug}
/{locale}/ueber | /{locale}/about, …/datenschutz | …/privacy, …/impressum | …/legal-notice
/admin/…                                    → protected, not localized (English UI), noindex
```

Rules:

- Slugs are localized (`/de/orte/insel-mainau`, `/en/places/mainau-island`), generated from the localized name, stable after publication; renames create redirects. Slug ↔ attraction mapping is stored per locale ([../architecture/database-schema.md](../architecture/database-schema.md)).
- Filter state is encoded in query parameters (shareable, back-button-safe): `?cat=museum&rain=good&open=now&near=47.66,9.17&r=10`. Parameter names are locale-independent and versioned in [../architecture/api-contracts.md](../architecture/api-contracts.md#get-apiattractions--listsearchfilter).
- `hreflang` alternates link DE/EN versions of every public page.

## Content hierarchy on the detail page

Order reflects decision-making priority (validated against personas):

1. Name, category, region + municipality, hero image (licensed, attributed)
2. **Decision block:** open now/today ▸ price level ▸ duration ▸ distance from selected location
3. Description (original summary, localized)
4. **Practical facts:** opening hours (with holiday handling), prices + currency, booking requirement, languages
5. **Getting there:** transport modes, nearest stop, parking, bicycle access
6. **Suitability:** audiences, child ages, weather suitability, accessibility, stroller, dogs, picnic, food/café, toilets
7. Freshness block: last verified, per-volatile-fact staleness warnings, "report an issue"
8. Official website + booking links (rel="noopener", tracked as outbound)
9. Nearby attractions (same region, distance-sorted)

## System states

Every screen defines loading / empty / error / stale states — specified per flow in [core-user-flows.md](core-user-flows.md) and enforced per ticket ([../agents/definition-of-done.md](../agents/definition-of-done.md)).
