# ADR-001: Shoreline-band geographic scope, independent of political districts

**Status:** Accepted · 2026-08 · **Deciders:** product owner + architecture

## Context

The product must cover the *entire* Lake Constance shoreline across Germany, Switzerland, and Austria (Obersee, Überlinger See, Untersee, Seerhein, corridor to Stein am Rhein). Early drafts of the idea were misframed around German districts (Bodenseekreis / Landkreis Konstanz), which cover only fragments of the lake and would exclude Bregenz, Lindau (Bavaria), Rorschach, Kreuzlingen, Stein am Rhein, and more. Political districts also differ structurally per country (Kreis vs. Kanton vs. Bezirk), making them useless as a unified scope model. At the same time, an unbounded "Lake Constance region" would creep into Allgäu, Schaffhausen, St. Gallen inland, and the Vorarlberg mountains.

## Decision

1. Scope is defined by a **product-owned geographic model**: a shoreline geometry (lake + Seerhein + Hochrhein to Stein am Rhein) and nine product regions with polygon boundaries — never by political districts ([../product/geographic-scope.md](../product/geographic-scope.md)).
2. Inclusion rule (configurable): within **5 km** of the shoreline (`SCOPE_SHORELINE_BAND_KM`, config not constant) **or** inside an official shoreline municipality with high editorial relevance **or** an explicitly marked exception with mandatory justification (`scopeException` + `scopeExceptionReason`).
3. Liechtenstein and inland regions are out of the initial scope; expansions require a superseding ADR.
4. Country and municipality remain descriptive attributes (currency, holidays, transit context), never scope criteria.

## Alternatives considered

- **Political districts as scope** — rejected: excludes most of the lake, three incompatible admin systems, wrong mental model for tourists.
- **Fixed radius around the lake centroid** — rejected: the lake is elongated; a centroid radius either cuts Stein am Rhein or includes half the Allgäu.
- **Hard 5 km rule without exceptions** — rejected: a handful of defining regional attractions (e.g. Affenberg Salem) sit slightly beyond; a marked-exception mechanism is more honest than either excluding them or stretching the band to 8–10 km (which would pull in far more noise).
- **Unlimited editorial discretion** — rejected: scope would erode silently; exceptions must be visible and reviewable.

## Consequences

- Requires shoreline geometry + region polygons as versioned seed data and a `shorelineDistanceM` computation (PostGIS) — small one-time cost.
- Every attraction is scope-checkable automatically at ingestion and in nightly data-quality sweeps; exceptions are auditable.
- The band threshold can be tuned without migration; changing it re-triggers scope checks.
- Cross-border correctness (CHF vs EUR, holiday calendars) is handled by country attributes, cleanly separated from scope.
- Research sectors (BS-01…BS-15) and product regions stay stable even if administrative boundaries change.
