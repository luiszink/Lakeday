# Geographic scope

Status: **confirmed requirement** with one **architectural decision** (the configurable inclusion rule, [ADR-001](../adr/ADR-001-shoreline-scope.md)).

## Scope statement

The product covers the shoreline around the **entire Lake Constance region**:

- **Obersee** (main basin),
- **Überlinger See**,
- **Untersee** (including Zeller See and Gnadensee),
- the **Rhine connection around Konstanz** (Seerhein),
- the corridor toward **Stein am Rhein** (Hochrhein down to and including Stein am Rhein).

This spans shoreline areas of **Germany, Switzerland, and Austria**. **Liechtenstein is not part of the initial scope.**

> ⚠️ The scope is explicitly **not** the Bodenseekreis and **not** only the Landkreis Konstanz. Political districts must never appear as scope boundaries in code, data, or copy.

Out of initial scope (do not silently expand): wider Allgäu, Schaffhausen beyond Stein am Rhein, St. Gallen inland, the Vorarlberg mountains beyond the shoreline band, and other inland regions.

## Region model (decision)

Regions are a **product-owned geographic model independent of political districts and national borders**. Attractions carry `country` and `municipality` as descriptive attributes (needed for currency, holidays, transit), but scope membership is decided by the product region model, never by district membership.

### Product regions

| Code | Product region | Anchor places (non-exhaustive) |
|---|---|---|
| `UEBERLINGER_SEE` | Überlinger See | Überlingen, Meersburg, Unteruhldingen, Sipplingen, Bodman-Ludwigshafen |
| `OBERSEE_NORD` | Northern Obersee | Friedrichshafen, Immenstaad, Hagnau, Langenargen, Kressbronn |
| `BAYERN_UFER` | Bavarian shore | Lindau, Wasserburg, Nonnenhorn |
| `VORARLBERG_UFER` | Austrian shore | Bregenz, Hard, Lochau, Höchst |
| `OBERSEE_SUED` | Swiss Obersee shore | Rorschach, Arbon, Romanshorn, Rheineck |
| `THURGAU_UFER` | Thurgau shore & Kreuzlingen | Kreuzlingen, Münsterlingen, Güttingen |
| `KONSTANZ_SEERHEIN` | Konstanz & Seerhein | Konstanz, Mainau, Wollmatingen |
| `UNTERSEE_NORD` | Northern Untersee | Radolfzell, Allensbach, Reichenau, Moos |
| `UNTERSEE_SUED` | Southern Untersee & Hochrhein | Steckborn, Berlingen, Ermatingen, Stein am Rhein, Öhningen, Gaienhofen (Höri) |

Notes:

- Region codes are stable identifiers stored in the database ([../architecture/domain-model.md](../architecture/domain-model.md)).
- Regions are user-facing filter values with localized display names (e.g. `UNTERSEE_NORD` → DE "Untersee Nord / Höri & Reichenau", EN "Northern Untersee").
- The anchor-place lists are illustrative; membership of an attraction is determined by coordinates + inclusion rule, then assigned to the nearest region polygon. Region polygons are seed data maintained in the repository (GeoJSON), editable without migration.
- Boundary refinements (e.g., splitting `OBERSEE_NORD`) are content changes, not schema changes.

## Inclusion rule (decision, configurable)

An attraction is in scope when **any** of the following holds:

1. **Shoreline band:** its coordinates lie within **5 km** of the Lake Constance shoreline (including the Seerhein and the Hochrhein down to Stein am Rhein). The distance is computed against a shoreline geometry stored in the database; the threshold is a configuration value (`SCOPE_SHORELINE_BAND_KM`, default `5`), not a hard-coded constant.
2. **Shoreline municipality:** it lies inside an official shoreline municipality (a municipality whose territory touches the lake/Seerhein/Hochrhein-to-Stein-am-Rhein) **and** is rated highly relevant by editorial review (`relevance >= HIGH`).
3. **Marked exception:** it is individually approved as an exception. Every exception **must** carry `scopeException = true` plus a mandatory human-readable justification (`scopeExceptionReason`), and exceptions are listed in the admin UI for periodic review.

Everything else is out of scope. The rule is enforced at ingestion time ([../data/research-workflow.md](../data/research-workflow.md)) and re-checked by a data-quality job ([../quality/data-quality-strategy.md](../quality/data-quality-strategy.md)).

Rationale, alternatives, and consequences: [ADR-001](../adr/ADR-001-shoreline-scope.md).

### Examples

| Attraction | Rule applied | In scope? |
|---|---|---|
| Mainau Island (Konstanz) | Rule 1 (on the lake) | Yes |
| Burg Meersburg | Rule 1 | Yes |
| Pfahlbauten Unteruhldingen | Rule 1 | Yes |
| Museum Lindwurm, Stein am Rhein | Rule 1 (Hochrhein corridor endpoint) | Yes |
| Zeppelin Museum Friedrichshafen | Rule 1 | Yes |
| Pfänder cable car, Bregenz | Rule 1 (valley station ~1 km from shore) | Yes — summit region reached from a shoreline entry point |
| Affenberg Salem (~7 km inland) | Rule 3 candidate — major family attraction of the region | Yes, **only** as a marked exception with justification |
| Rheinfall (Schaffhausen) | None — beyond Stein am Rhein | No (candidate for a later scope extension, see [later-phases.md](later-phases.md)) |
| Säntis | None — Alpstein, inland | No |
| Ravensburger Spieleland (~15 km inland) | Rule 3 candidate | Decision deferred — recorded in [../roadmap/open-questions.md](../roadmap/open-questions.md) (OQ-2) |

## Important localities (checklist)

The first complete dataset must cover at least: Konstanz, Meersburg, Überlingen, Friedrichshafen, Langenargen, Kressbronn, Lindau, Bregenz, Hard, Rorschach, Romanshorn, Kreuzlingen, Steckborn, Stein am Rhein, Reichenau, Radolfzell, Bodman-Ludwigshafen. This list is a coverage checklist, not a boundary.

## Research sectors

The shoreline is divided into **15 research sectors** for the attraction-research workflow ([../data/research-workflow.md](../data/research-workflow.md)). Sectors are operational units for research work; product regions are user-facing. A sector maps to exactly one product region except where noted.

| Sector | Name | Product region | Coverage |
|---|---|---|---|
| BS-01 | Konstanz city & Seerhein | KONSTANZ_SEERHEIN | Konstanz old town, harbour, Seerhein banks |
| BS-02 | Mainau & Bodanrück shore | KONSTANZ_SEERHEIN | Mainau, Litzelstetten, Dingelsdorf, Wallhausen |
| BS-03 | Reichenau & Untersee north-east | UNTERSEE_NORD | Reichenau island, Allensbach, Hegne |
| BS-04 | Radolfzell & Mettnau | UNTERSEE_NORD | Radolfzell, Mettnau, Moos, Iznang |
| BS-05 | Höri & Öhningen | UNTERSEE_SUED | Gaienhofen, Wangen, Öhningen |
| BS-06 | Stein am Rhein & Hochrhein | UNTERSEE_SUED | Stein am Rhein, Eschenz, Wagenhausen |
| BS-07 | Swiss Untersee south shore | UNTERSEE_SUED | Steckborn, Berlingen, Mannenbach, Ermatingen, Gottlieben |
| BS-08 | Kreuzlingen & Thurgau shore | THURGAU_UFER | Kreuzlingen, Bottighofen, Münsterlingen, Güttingen |
| BS-09 | Romanshorn & Arbon | OBERSEE_SUED | Romanshorn, Uttwil, Arbon, Steinach |
| BS-10 | Rorschach & Rheineck | OBERSEE_SUED | Rorschach, Rorschacherberg, Staad, Rheineck, Altenrhein |
| BS-11 | Bregenz & Austrian shore | VORARLBERG_UFER | Bregenz, Hard, Lochau, Höchst, Gaißau, Rheindelta |
| BS-12 | Lindau & Bavarian shore | BAYERN_UFER | Lindau, Wasserburg, Nonnenhorn, Bodolz |
| BS-13 | Langenargen–Friedrichshafen | OBERSEE_NORD | Kressbronn, Langenargen, Eriskirch, Friedrichshafen |
| BS-14 | Immenstaad–Meersburg | OBERSEE_NORD + UEBERLINGER_SEE | Immenstaad, Hagnau, Meersburg, Unteruhldingen, Daisendorf |
| BS-15 | Überlingen & western tip | UEBERLINGER_SEE | Überlingen, Sipplingen, Bodman-Ludwigshafen, Marienschlucht area |

Pilot sectors for the research-workflow pilot: **BS-01 (Konstanz), BS-14 (Meersburg), BS-06 (Stein am Rhein)** — see [../data/research-workflow.md](../data/research-workflow.md#pilot-procedure).

## Consequences for the domain model

- `Attraction` stores: `countryCode` (`DE`/`CH`/`AT`), `municipality`, `regionCode`, `shorelineDistanceM` (computed), `scopeException` + `scopeExceptionReason`.
- The shoreline geometry and region polygons are versioned seed data (GeoJSON in the repo, loaded into PostGIS).
- Cross-border practicalities (currency, holidays, transit operators) hang off `countryCode`, never off region.
