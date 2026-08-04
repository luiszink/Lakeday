# Open questions

Status: living document — questions that did **not** block planning. Each has a **recommended default** which the plan assumes; changing a default requires updating the referencing docs. Review monthly ([../operations/maintenance.md](../operations/maintenance.md#documentation-maintenance)).

| ID | Question | Recommended default (assumed by plan) | Consequences of alternatives | Owner / when |
|---|---|---|---|---|
| OQ-1 | Product name and domain? "BodenseeGuide" is a working title. | Keep working title; register a neutral domain before M6 (SEO/OG/share links need it). | Late rename = slug/OG/brand rework; before M6 it's cheap. | Product, before LAKE-060 |
| OQ-2 | Include Ravensburger Spieleland (~15 km inland) and similar major inland family attractions as marked exceptions? | **Not** in the initial dataset; revisit with zero-result/search analytics after launch. | Including: dilutes shoreline identity but serves families (P3/P4); would use scopeException machinery, no schema change either way. | Product, post-launch |
| OQ-3 | Accommodation entry: free-text label + geocode only, or structured hotel picker? | Free-text + geocode (MVP). | Structured picker needs an accommodation dataset — new data domain; only relevant for B2B guest-guide phase. | Product, phase 1.5 |
| OQ-4 | ODbL share-alike + database-rights stance (see [../data/data-source-policy.md](../data/data-source-policy.md#openstreetmap)) | Per-fact sourcing discipline as designed; formal legal review before launch. | If review finds exposure: reduce OSM-derived fields or open the DB under ODbL (viable but strategic). | Legal, before LAKE-068 |
| OQ-5 | Is the consent-banner-free stance (cookieless analytics + functional localStorage) legally solid in DE/AT/CH? | Assume yes, build cookieless ([../quality/security-and-privacy.md](../quality/security-and-privacy.md#cookies--consent)). | If no: add a minimal consent layer — isolated component, no architectural impact. | Legal, before LAKE-068 |
| OQ-6 | Guest cards (Bodensee Card PLUS etc.): structured field or prose note? | MVP: localized `practicalNotes` prose + static guide page. | Structured guest-card relation enables "included with card X" filter — valuable but needs its own small data model; phase 1.5 candidate. | Product, phase 1.5 |
| OQ-7 | FTS dictionary: `simple`+unaccent vs. language stemmers per locale? | `simple`+unaccent ([../architecture/database-schema.md](../architecture/database-schema.md#search-indexes)). | Stemmers improve recall ("Schlösser"→"Schloss") but complicate symmetric DE/EN behaviour; measure zero-result rate first. | Eng, post-launch |
| OQ-8 | Git hosting/CI = GitHub? (assumed for Actions-based CI plan) | GitHub. | Any host works; CI config is the only affected artifact (LAKE-003). | Team, LAKE-001 |
| OQ-9 | Image storage: host object storage vs. Cloudinary-class service? | Host/S3-compatible object storage + Next.js image optimization. | Media service adds cost + DPA; revisit if editorial image volume grows. | Eng, LAKE-042 |
| OQ-10 | Multiple named saved plans in MVP UI, or single "My Day" + snapshots? | Single active plan + saved snapshots ([../ux/favorites-and-plans.md](../ux/favorites-and-plans.md#my-day-manual-plan)). | Full multi-plan management = more UI surface; metrics will show demand (plans saved/user). | Product, post-launch |
| OQ-11 | Do we show any weather UI in MVP (hints/rainy-chip prefill), or keep weather purely internal until phase 2? | Minimal: rainy-day chip prefill from forecast + small "rain expected" hint; no forecast panel. | Full weather UI = scope creep; none at all = misses J2 value. | Product, LAKE-054 |
| OQ-12 | English URL segment style: `/en/places/...` translated segments (as planned) vs. shared German segments? | Localized segments ([../ux/information-architecture.md](../ux/information-architecture.md#url-structure-decision)). | Shared segments simplify routing slightly, worse EN SEO/UX. | Eng, LAKE-025 |

## Resolved questions

(Move entries here with resolution + date + affected docs.)
