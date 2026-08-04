# Data source policy

Status: **architectural decision** (priority order, hard rules); per-source licence facts marked ✅ verified-at-planning-time or ⚠️ **verification required** (do not treat ⚠️ rows as settled — re-verify in the introducing ticket).

## Source priority (decision, binding for research & refresh)

1. **Official attraction website** — canonical for hours, prices, closures, booking, accessibility.
2. **Official municipality or regional tourism organization** (e.g. city tourism offices, regional marketing orgs).
3. **Official public data feed or API** (open-data portals, GTFS feeds).
4. **OpenStreetMap** — coordinates, geometry, practical POI attributes.
5. **Wikidata / Wikipedia** — discovery, cross-checking, external IDs; never copied prose.
6. **Other trustworthy sources** — only when 1–5 fail, flagged for review.

Hard rules:

- **User reviews and social media are never canonical** for operational facts (may inspire research questions at most).
- Conflicts resolve upward: a lower-priority source never overrides a higher-priority one with a fresher timestamp alone; conflicting facts go to review ([refresh-and-review-pipeline.md](refresh-and-review-pipeline.md)).
- **No copied editorial prose from any source** (REQ-DATA-05): summaries are original text generated from verified facts. This is both a licensing and a product-quality rule.
- Every stored fact links a `SourceRecord` ([provenance-and-licensing.md](provenance-and-licensing.md)).

## Per-source evaluation

### Official websites & tourism organizations
| Aspect | Notes |
|---|---|
| Data | Hours, prices, closures, accessibility, booking |
| Licence | Facts are not copyrightable in DE/CH/AT as such, but database rights (EU sui generis) and site terms vary; we extract *individual facts*, never substantial parts of a source database ⚠️ blanket assessment needs legal review before large-scale automated crawling — until then, research is human/agent-paced, small-volume per site |
| Attribution | Link to the official site on every detail page (REQ-DISC-11) — good practice regardless of obligation |
| Storage/caching | Raw snapshots stored as `SourceRecord` for provenance (internal evidence, never republished) |
| API limits / reliability | Scraping fragility → per-source health tracked; robots.txt respected; polite fetch rates |
| Fallback | Mark facts `SOURCE_UNAVAILABLE`, keep last-verified values with stale badge |
| Cost | 0 € |
| Manual approval | None (public information), but robots/ToS respected per site |

### Open-data portals & feeds (DE/CH/AT, e.g. mobility open data, city portals)
Licences typically DL-DE/BY-2.0, CC BY 4.0, or CC0 ⚠️ verify **per dataset** at adoption; attribution recorded in the Licence registry; each adopted feed gets its own entry in the source registry with refresh cadence. GTFS feeds relevant only in phase 1.5+ (nearest-stop enrichment) — the stop names in MVP come from research + OSM.

### OpenStreetMap {#openstreetmap}
| Aspect | Notes |
|---|---|
| Data | Coordinates, POI presence, amenity attributes, stop locations |
| Licence | **ODbL 1.0** ✅ — attribution "© OpenStreetMap contributors" required wherever OSM-derived data is displayed; share-alike applies to *derivative databases* |
| Share-alike consequence (decision) | Our attraction DB uses OSM as **one input among several for individual facts** (coordinates, stop distances). To stay safely outside a "derivative database" claim we (a) record OSM as source per fact, (b) do not bulk-import OSM POIs as attraction records, (c) get coordinates verified against official sources where possible. ⚠️ A focused legal review of ODbL share-alike exposure is required before launch — tracked as risk R-04 and OQ-4 |
| Storage/caching | Extracts stored as SourceRecords — fine under ODbL with attribution |
| API limits | Overpass: community service, strict politeness, research-time only, never runtime |
| Fallback | Self-hosted Overpass on planet extract if research volume grows |
| Cost | 0 € (donation recommended) |

### Wikidata / Wikipedia
Wikidata: CC0 ✅ — IDs, coordinates, official-website claims freely usable; store QIDs as `ExternalIdentifier`. Wikipedia: CC BY-SA ✅ — **text must never enter our summaries** (share-alike + copied-prose rule); usable for discovery and existence cross-checks only.

### Google Places {#google-places}
**Decision: not used in MVP; never the persistent master database.** Reasons (⚠️ re-verify current Google Maps Platform ToS if ever reconsidered): historic ToS prohibit caching/storing most Places content beyond short windows except `place_id`; display typically requires a Google map; scraping-style bulk use prohibited; costs scale badly. If a future need arises (e.g. popularity signals), a dedicated analysis of storage, attribution, caching, display, and licensing restrictions must be completed **before** any integration — recorded as a standing constraint in [../adr/ADR-003-master-attraction-database.md](../adr/ADR-003-master-attraction-database.md).

### Weather (Open-Meteo), map tiles, geocoding
Evaluated in [../architecture/external-services.md](../architecture/external-services.md) (runtime services rather than content sources).

## Source registry

The admin interface maintains a **source registry** (`SourceRecord` types + a per-origin `sources` table implied by the registry UI): origin URL/domain, type, licence FK, refresh cadence, health status, notes, approval state. Adding a *new class* of source (e.g. a new open-data portal) requires an ADMIN-role approval in the registry — this operationalizes "manual approval needed" per source.

## What "verification required" means operationally

Rows marked ⚠️ get a checklist item in the introducing ticket: read current terms; record licence, attribution wording, storage limits, and commercial-use status in the Licence registry; link the terms snapshot as a SourceRecord. Unverifiable claims are treated as **prohibited by default**.
