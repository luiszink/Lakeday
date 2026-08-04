# Tag and filter taxonomy

Status: **architectural decision** (structure, governance), **recommendation** (initial vocabulary values — extendable through governance below).

Principle (REQ-FILT-01): every filtering dimension is a **normalized enum, relation, or dedicated field**. Free-form editorial tags exist only for search/SEO and are banned from filter logic (lint-guarded in `packages/domain`).

## Dimension classes

- **must** — active filter *excludes* `UNKNOWN` values (safety/accessibility: wrong "yes" harms users).
- **nice** — active filter keeps `UNKNOWN` values, ranked lower.

See [../ux/filter-and-search-behaviour.md](../ux/filter-and-search-behaviour.md#general-semantics-decision).

## Vocabularies

### Categories (two-level, lookup table)

| Primary | Subcategories (initial) |
|---|---|
| `NATURE` | lakeside_beach, nature_reserve, island, gorge_waterfall, viewpoint, garden_park |
| `CULTURE_HISTORY` | castle_palace, church_monastery, museum, archaeological_site, old_town, monument |
| `FAMILY_ACTIVITY` | zoo_wildlife, theme_park, playground, adventure (climbing, summer toboggan), pool_lido, mini_golf |
| `WATER` | boat_trip, ferry_experience, swimming, watersports (SUP, sailing, diving), harbour |
| `ACTIVE` | hiking_trail, cycling_route, climbing, winter_activity |
| `EXPERIENCE` | cable_car, scenic_railway, observation_deck, thermal_spa, market, wine_tasting |
| `KNOWLEDGE` | science_center, industry_heritage (Zeppelin, Dornier), planetarium, guided_tour |

Values are `snake_case` codes with DE/EN labels; an attraction has exactly one primary and 0–3 subcategories.

### Interests (multi, nice)
`history` · `art` · `technology` · `nature` · `animals` · `water_fun` · `adventure` · `relaxation` · `food_wine` · `architecture` · `science` · `photography` · `local_traditions`

### Audiences (multi, nice)
`families` · `couples` · `solo` · `groups` · `seniors` — coarse fit signal; child-age bands are the precise family dimension.

### Child age bands (multi, **must**)
`0-2` (baby) · `3-5` (kindergarten) · `6-9` · `10-13` · `14+` — an attraction lists bands it genuinely suits (not merely tolerates). Empty + audience `families` is a data-quality error.

### Ordinal scales
- `rainSuitability` / `heatSuitability`: `POOR / OK / GOOD / EXCELLENT` (nice). Guidance: EXCELLENT rain = fully indoor experience; GOOD heat = shaded/water/AC most of the visit.
- `priceLevel`: `FREE / LOW (≤5€) / MEDIUM (≤15€) / HIGH (≤30€) / PREMIUM (>30€)` per adult, EUR-referenced; CHF prices classified by approximate value (bands are coarse by design) (nice).
- Duration bands (derived from `typicalDurationMin/Max`): `<1h / 1-2h / 2-4h / half_day / full_day` (nice).

### Binary / tri-state fields (dedicated columns)
`indoorOutdoor` (INDOOR/OUTDOOR/MIXED) · `foodOnSite` · `cafeOnSite` · `picnicAllowed` · `toilets` (nice) · `strollerSuitable` YES/PARTIAL/NO/UNKNOWN (**must**) · `wheelchairAccess` FULL/PARTIAL/NONE/UNKNOWN (**must**) · `wheelchairToilet` (**must**) · `dogPolicy` ALLOWED/LEASHED/NO/UNKNOWN (**must**) · `bookingRequirement` NONE/RECOMMENDED/REQUIRED (must when "no reservation needed" filter active).

### Seasons (multi)
`SPRING / SUMMER / AUTUMN / WINTER / ALL_YEAR` — `ALL_YEAR` is exclusive of others.

### Transport modes (multi, must-ish: filter matches only attested modes)
`WALK` (≤30 min from a town center) · `BICYCLE` (safe route + parking) · `PUBLIC_TRANSPORT` (stop ≤500 m walking) · `CAR` (parking exists). Plus `nearestStopName/DistanceM`, `parkingInfo`, `bicycleAccess` detail fields.

### Visitor languages (multi, nice)
ISO 639-1 codes; MVP UI exposes `de`, `en`, `fr`, `it`. Semantics: meaningful visitor information available in that language (signage, audio guide, tours, leaflets).

### Regions
Fixed list of 9 product-region codes — [../product/geographic-scope.md](../product/geographic-scope.md#product-regions).

## Editorial tags

Localized free-form strings (e.g. "Pfahlbauten", "UNESCO", "Zeppelin"), attached many-to-many, feeding search and SEO keywords only. No governance beyond editor common sense; deliberately unbounded.

## Governance {#governance}

1. Vocabulary values live in lookup tables, seeded from `packages/db/seed/vocabularies.ts` — the seed file is the reviewed source of truth (PR review = vocabulary governance).
2. Adding a value: PR with DE+EN labels + definition; renaming labels is free; **codes never change** once used (stable API/URL contract).
3. Removing a value requires a data migration reassigning existing attractions.
4. Every value must be *filterably meaningful*: if a value would apply to >80 % or <2 % of attractions, question it (data-quality report shows distribution — [../quality/data-quality-strategy.md](../quality/data-quality-strategy.md#quality-metrics)).
5. The research workflow maps evidence to these codes only; unknown concepts surface as `unmappedSignals` in research output ([research-output-schema.md](research-output-schema.md)) and become governance proposals, never silent new tags.
