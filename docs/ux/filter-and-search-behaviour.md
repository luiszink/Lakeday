# Filter and search behaviour

Status: **architectural decision** (filter semantics, relevance formula v1), **recommendation** (UI arrangement).

Filter dimensions are fixed by REQ-FILT-01…23 ([../product/mvp-scope.md](../product/mvp-scope.md#2-filters)); vocabularies by [../data/tag-and-filter-taxonomy.md](../data/tag-and-filter-taxonomy.md).

## General semantics (decision)

1. **Across dimensions: AND.** `category=museum AND rain=good` narrows.
2. **Within a multi-value dimension: OR.** `category in (museum, castle)`.
3. **Unknown values are excluded by "must" filters, included by "nice" filters.** Safety- and accessibility-relevant dimensions (wheelchair accessibility, stroller, dogs, child age) are **must** filters: an attraction with `unknown` is *excluded* when the filter is active, because a wrong "yes" harms users (persona P5). Convenience dimensions (café, picnic, heat suitability) are **nice** filters: `unknown` items remain but rank lower. Each dimension's class is fixed in the taxonomy file.
4. **Filters never crash into empty silently** — see zero-results below.
5. Filter state lives in the URL (shareable, restorable) — [information-architecture.md](information-architecture.md#url-structure-decision).

## Dimension-specific behaviour

| Dimension | Type | Notes |
|---|---|---|
| Region | multi-select enum | Product regions from [../product/geographic-scope.md](../product/geographic-scope.md#product-regions) |
| Distance | single radius (1/2/5/10/25/50 km) | Requires a selected location; otherwise prompts for one |
| Category | multi-select, two-level | Primary + subcategories |
| Interests | multi-select enum | OR within |
| Audience | multi-select enum | OR within |
| Child age | age-band multi-select | Attraction matches if any selected band ∈ suitable bands; **must** semantics |
| Indoor/outdoor | tri-state enum | `MIXED` matches both indoor and outdoor selections |
| Rain suitability | ordinal ≥ threshold | UI: "rain-proof" toggle = `≥ GOOD` |
| Heat suitability | ordinal ≥ threshold | Shade/water/AC signal |
| Season | derived + explicit | Defaults to current season; explicit override in UI |
| Price level | multi-select ordinal (FREE…PREMIUM) | FREE is a promoted quick chip |
| Duration | band multi-select (<1 h, 1–2 h, 2–4 h, half day, full day) | |
| Open | `now` \| `date` (+ optional time window) | Evaluated against the opening-hours engine ([../architecture/domain-model.md](../architecture/domain-model.md#opening-hours)); attractions with unknown hours appear with an "hours unverified" badge but are **not** shown under "open now" |
| Reachability | multi-select mode | Matches attraction `transportModes`; PT reachability = has stop within 500 m walking |
| Food / café / picnic | boolean toggles | nice semantics |
| Reservation | `none required` toggle | must semantics |
| Wheelchair / stroller | toggles | **must** semantics, verified facts only |
| Dogs | toggle (allowed incl. restricted-leash) | must semantics |
| Visitor languages | multi-select | Matches available info languages |

## Quick filters (chips above list)

`Open now` · `Free` · `Rainy day ☔` · `With kids` (opens age picker) · `Accessible ♿`. Chips are pre-baked filter sets; applying one is one tap and is reflected in the full filter panel.

## Search (REQ-DISC-04)

- Full-text over localized name, summary, municipality, editorial tags — in the active locale plus name matches from the other locale (searching "Mainau Island" in DE UI still finds it).
- Diacritics- and case-insensitive (`ueberlingen` = `Überlingen`), prefix matching from 2 characters, typo tolerance of edit distance 1 from 5 characters.
- Implementation: PostgreSQL FTS + `pg_trgm` (no external search engine in MVP; revisit if p95 latency > 200 ms server-side — [../architecture/database-schema.md](../architecture/database-schema.md#search-indexes)).
- Search combines with active filters (AND).

## Sorting

### Distance (REQ-DISC-06)
Great-circle distance from the selected location (PostGIS). Requires a location; the sort option prompts for one if missing. Ties broken by relevance.

### Relevance (REQ-DISC-07) {#relevance}

Deterministic, explainable score — **no personalization, no ML in MVP**:

```
score = 0.35 * editorialImportance      // 0..1, editor-set per attraction
      + 0.20 * dataCompleteness          // fraction of key fields verified
      + 0.15 * freshness                 // 1 - normalized age vs. policy
      + 0.15 * seasonFit                 // current/selected season match
      + 0.15 * proximity                 // only when a location is selected, else redistributed
```

Weights are configuration, not code constants. The formula is documented publicly (trust; also prerequisite for any later sponsored-content transparency, see [../product/later-phases.md](../product/later-phases.md#3-monetization-outlook)). Sponsored placements, if ever introduced, are **never** blended into this score.

Default sort: relevance without location; distance once a location is selected (explicitly switchable).

## Zero results {#zero-results}

When a filter/search combination returns nothing:

1. Show which active filters are most restrictive (server returns per-filter "would-match" counts).
2. Offer one-tap relaxations: widen radius (next step up), drop the most restrictive nice filter, switch "open now" → "open today".
3. Never auto-relax **must** filters (accessibility, child age, dogs) — say honestly "No verified wheelchair-accessible attractions match; widen the radius?".
4. Log the combination (anonymized) as a zero-result event ([../product/success-metrics.md](../product/success-metrics.md)).

## Performance targets

Filter/search round trip p95 ≤ 300 ms server-side; UI responds optimistically with skeletons; filter counts may load progressively.
