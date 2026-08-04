# Geographic seed data

`shoreline.geojson` is derived from the OpenStreetMap Bodensee relation [1156846](https://www.openstreetmap.org/relation/1156846), retrieved on 2026-08-04 through Nominatim. The outer shoreline and the Mainau shoreline ring use a Douglas-Peucker simplification tolerance of approximately 50 m. The Seerhein and Hochrhein corridor to Stein am Rhein is manually traced from the same OSM base geometry.

The product-region polygons under `regions/` are product-owned boundaries, manually traced against the OSM base geometry. They are deliberately independent of political districts and may be refined without a schema migration. All files are derived from OpenStreetMap data and require the attribution recorded in their GeoJSON properties: `© OpenStreetMap contributors`, ODbL 1.0.

Load the data locally with:

```bash
pnpm db:seed --only geo
```
