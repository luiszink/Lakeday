# ADR-005: Map, geocoding, and routing provider abstraction

**Status:** Accepted · 2026-08 · **Deciders:** architecture

## Context

The map is core UX, but the provider landscape is volatile: free tiers change, community OSM services (tile.openstreetmap.org, public Nominatim, Komoot Photon) explicitly do not offer production SLAs, and commercial providers (MapTiler, Stadia, OpenCage, Google) differ in licensing, attribution, and cost curves. Phase 2 adds routing with its own provider question. Binding feature code to any one SDK would make every provider change a rewrite; treating community services as production infrastructure would be irresponsible.

## Decision

1. All geo capabilities are consumed through **interfaces owned by us**: `MapProvider` (tiles/style/markers/clustering), `Geocoder`, `TravelTimeEstimator` (heuristic in MVP, routing provider in phase 2) — feature code never imports provider SDKs ([../architecture/external-services.md](../architecture/external-services.md#abstraction-pattern-decision)).
2. MVP adapters: **MapLibre GL JS** (BSD renderer, itself provider-neutral) + a commercial OSM-based vector-tile provider configured via `MAP_TILE_URL`/key; geocoding via a commercial OSM-based geocoder proxied server-side (keys never reach the client).
3. **No public community OSM infrastructure in production paths.** Overpass/Nominatim-class services are research-time tools only.
4. Every adapter implements the failure contract: timeout, circuit breaker, typed `ProviderUnavailable`, documented degradation (map → list fallback; geocoder → region picker).
5. Provider swaps are config + adapter changes; the domain layer and UI components are untouched by them.

## Alternatives considered

- **Direct MapLibre + hardcoded tile URLs in components** — rejected: every provider/pricing change becomes a scattered refactor; untestable failure behaviour.
- **Google Maps SDK** — rejected: cost model, licensing coupling (data display tied to Google map), conflicts with ADR-003 constraints.
- **Self-hosted tiles/geocoder from day one** — rejected for MVP: real ops burden (planet extracts, updates, capacity) before product validation; retained as documented fallback.
- **Leaflet instead of MapLibre** — considered acceptable; MapLibre chosen for first-class vector tiles (smaller payloads, better mobile perf, style control). The abstraction makes this reversible.

## Consequences

- Small upfront interface cost; large option value (provider negotiation leverage, seasonal-cost control — risk R-06).
- Fake adapters make map/geocoding behaviour unit- and e2e-testable without network (provider-failure test suite).
- Attribution requirements are rendered via the abstraction's metadata, keeping OSM/provider credits correct across swaps ([../data/provenance-and-licensing.md](../data/provenance-and-licensing.md#openstreetmap)).
- Discipline required: PR review guards against SDK imports outside adapters ([../agents/review-checklist.md](../agents/review-checklist.md)).
