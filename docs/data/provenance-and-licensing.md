# Provenance and licensing

Status: **architectural decision** (provenance model), **legal-review-required** items explicitly flagged. This is architectural planning, **not legal advice** ([../quality/security-and-privacy.md](../quality/security-and-privacy.md#legal-review-checklist)).

## Provenance model

Two layers (defined in [../architecture/domain-model.md](../architecture/domain-model.md)):

1. **`SourceRecord`** — immutable raw evidence: URL, type, retrieval timestamp, content hash, raw payload, licence note. Written by research and refresh; never edited.
2. **`FactProvenance`** — per volatile fact: which SourceRecord backs the current value, when checked, when due, confidence, status, detected change, reviewer decision.

Rules:

- No published fact without a provenance chain ending in a SourceRecord.
- Editor manual edits create a SourceRecord of type `other` with the editor's justification (edits are evidence too).
- Provenance is internal by default; user-facing surfaces show only "last verified" + official links (raw source snapshots are evidence, not content to republish).

## Content licensing (our output)

- Attraction **summaries/descriptions are original works** created for this product (REQ-DATA-05) — we own them. The copied-prose guard (trigram similarity vs. evidence quotes) enforces this at import ([research-output-schema.md](research-output-schema.md#import-validation-beyond-schema)).
- Facts themselves (hours, prices, coordinates) are not copyrightable as individual facts, but see the ODbL and database-rights cautions in [data-source-policy.md](data-source-policy.md) — ⚠️ legal review before launch (risk R-04).
- Our own database: decide a public stance later (later idea: open non-commercial API); nothing in MVP publishes bulk data.

## Images {#images}

Strictest rules of any asset class:

| Rule | Detail |
|---|---|
| Allowed sources | Own photos · explicit written permission from attraction operators · genuinely free licences (CC0, CC BY, CC BY-SA) from Wikimedia Commons etc. |
| Prohibited | Scraped website images · social-media images · "found on Google" · AI-generated imagery presented as real place photos |
| Required metadata (per `AttractionImage`) | Licence (from Licence registry) · attribution text · source URL · author where required |
| Attribution rendering | CC BY/BY-SA: visible attribution on the image (caption or expandable credit) — not buried in a global page ⚠️ exact rendering pattern legal-review item |
| Share-alike caution | CC BY-SA images do not infect other content, but adaptations must stay BY-SA — we display, not adapt |
| No image | Perfectly acceptable: styled category-placeholder graphic; never a licensing shortcut |

Operator permissions are stored (contact, date, scope of permission) in the Licence registry — ⚠️ permission template needs legal review.

## OpenStreetMap attribution {#openstreetmap}

- Map views: "© OpenStreetMap contributors" + tile-provider credit, permanently visible, non-dismissable ([../ux/map-and-list-behaviour.md](../ux/map-and-list-behaviour.md#map-behaviour)), linked to openstreetmap.org/copyright.
- OSM-derived data displayed outside the map (e.g. nearest-stop distance sourced from OSM): covered by an attribution note on the About/Licences page listing OSM as a data source.
- ODbL share-alike exposure: see [data-source-policy.md](data-source-policy.md#openstreetmap) — ⚠️ legal review (OQ-4, risk R-04).

## Licence registry

`Licence` table ([../architecture/domain-model.md](../architecture/domain-model.md#licence)) is the single machine-readable place recording: SPDX/name, attribution required?, commercial use allowed?, share-alike?, notes, and — for negotiated permissions — the permission evidence. Every attraction (`dataLicence`), image, and source registry entry references it. The About/Licences public page is **generated from the registry** (attribution completeness is thereby testable — [../quality/testing-strategy.md](../quality/testing-strategy.md)).

## Weather & other runtime data
Open-Meteo (CC BY 4.0): attribution on surfaces showing weather hints + licences page ✅. Tile/geocoder providers: per-plan attribution wording ⚠️ verify at adoption ([../architecture/external-services.md](../architecture/external-services.md)).

## Legal-review items (consolidated)

⚠️ ODbL share-alike exposure of the attraction DB · automated-crawling/database-rights stance for official sites · image attribution rendering pattern · operator permission template · impressum/privacy policy texts ([../quality/security-and-privacy.md](../quality/security-and-privacy.md)). Tracked in [../roadmap/risks.md](../roadmap/risks.md) and [../roadmap/open-questions.md](../roadmap/open-questions.md).
