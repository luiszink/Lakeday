# Map and list behaviour

Status: **recommendation** (interaction design), **architectural decision** (viewport querying, marker limits).

## Relationship between map and list

Map and list are **two views of one result set**: same filters, same search, same sort context. Switching views never changes the result set (REQ-DISC-02, map/list switch metric in [../product/success-metrics.md](../product/success-metrics.md)).

- Mobile (<1024 px): segmented control List | Map at the top of Discover; full-screen map with a bottom result-card carousel synced to the visible markers.
- Desktop (≥1024 px): split view — list left, map right; hovering a list item highlights its marker and vice versa.

## Map behaviour

| Aspect | Behaviour |
|---|---|
| Initial viewport | Whole lake (bounding box covering Stein am Rhein ↔ Bregenz) when no location; otherwise centered on selected location at radius-appropriate zoom |
| Markers | Category-colored pins with category icon; selected pin enlarged |
| Clustering | Cluster from >50 visible markers; cluster tap zooms in; at max zoom a cluster expands into a spiderfied list |
| Viewport querying (decision) | The map queries by bounding box (`GET /api/attractions?bbox=…` + active filters), debounced 300 ms after move; max 200 markers per response, server prioritizes by relevance and returns `truncated: true` so the UI can show "zoom in to see all" |
| Marker tap | Bottom sheet mini-card: name, category, open state, distance → tap again for detail page |
| "Search this area" | Explicit button after pan (no surprise auto-reload of the list view) |
| User location | Blue dot only after explicit geolocation opt-in; never persisted |
| Attribution | OSM attribution permanently visible, non-dismissable ([../data/provenance-and-licensing.md](../data/provenance-and-licensing.md#openstreetmap)) |

## Provider abstraction

The map component consumes a `MapProvider` interface (tiles, markers, clustering, fit-bounds) — MapLibre GL is the MVP implementation behind it; see [ADR-005](../adr/ADR-005-map-provider-abstraction.md) and [../architecture/external-services.md](../architecture/external-services.md#map-tiles). Feature code never imports the MapLibre SDK directly.

## Offline / degraded behaviour

- Tiles unavailable (offline or provider outage): show cached tiles where present, otherwise a styled fallback panel "Map currently unavailable" with the full result **list** as automatic fallback — the product remains usable without the map (also the accessibility fallback, [../quality/accessibility.md](../quality/accessibility.md#map-alternative)).
- Tile requests use a distinct hostname/path so failures are detectable and reported ([../operations/observability.md](../operations/observability.md)).

## Accessibility

The map is **progressive enhancement, never the only path**: every map capability (browse results, locate an attraction, see distance) has a list equivalent. Map controls are keyboard-reachable (zoom, pan via arrow keys when focused); markers expose accessible names. Full requirements: [../quality/accessibility.md](../quality/accessibility.md#map-alternative).

## Performance

- Lazy-load the map bundle only when the map view is opened (list is the default view; keeps initial JS small — [../architecture/pwa-strategy.md](../architecture/pwa-strategy.md#performance-budget)).
- Vector tiles preferred; target <2.5 s LCP on mid-range mobile over 4G for the list view, <4 s for first map render.
