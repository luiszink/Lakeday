# External services

Status: **architectural decision** (abstraction pattern, [ADR-005](../adr/ADR-005-map-provider-abstraction.md)); provider picks are **recommendations** with explicit verification flags. Data-source licensing detail: [../data/data-source-policy.md](../data/data-source-policy.md).

## Abstraction pattern (decision)

Every external capability is consumed through an interface in `packages/domain` (or an infra package) with exactly one production adapter + one fake for tests. Feature code imports the interface, never a provider SDK. This applies to: map tiles/styles, geocoding, routing (phase 2), weather, holiday data, LLM (phase 3), email, analytics.

**Do not assume community-hosted OSM infrastructure provides a production SLA.** The public tile.openstreetmap.org servers and public Nominatim explicitly disallow/discourage heavy production use. MVP uses commercial OSM-based providers with free tiers, with self-hosting as documented fallback.

## Service evaluation

Legend: ✅ verified against public docs at planning time · ⚠️ **verification required** before implementation (policies change; confirm in the ticket that introduces the dependency).

### Map tiles {#map-tiles}

| Aspect | Assessment |
|---|---|
| Recommendation | **MapTiler** (or OpenFreeMap) vector tiles rendered by **MapLibre GL JS** (BSD, no vendor lock) |
| Data provided | OSM-based vector tiles + styles |
| Licence / attribution | Tiles © provider + © OpenStreetMap contributors — **both attributions mandatory, always visible** ⚠️ verify exact wording per provider plan |
| Storage/caching restrictions | Browser caching allowed; bulk tile download/redistribution prohibited on free tiers ⚠️ verify — affects the offline tile-cache cap ([pwa-strategy.md](pwa-strategy.md)) |
| Commercial use | MapTiler free tier allows it with attribution ⚠️ verify current terms |
| API limits | Free tier ~100k tile requests/month ⚠️ verify; seasonal traffic spikes must be monitored |
| Reliability | Commercial CDN; no formal SLA on free tier |
| Fallback | Second provider config (OpenFreeMap ↔ MapTiler swap via `MAP_TILE_URL`); worst case self-hosted tiles (Planetiler + tileserver); UI degrades to list-only ([../ux/map-and-list-behaviour.md](../ux/map-and-list-behaviour.md#offline--degraded-behaviour)) |
| Estimated future cost | 0 € MVP; ~50–200 €/mo at strong seasonal traffic |
| Manual approval needed | Account signup only |

### Geocoding {#geocoding}

| Aspect | Assessment |
|---|---|
| Recommendation | Commercial OSM-based geocoder (Photon-as-a-service via Komoot public instance is **not** production-SLA; prefer MapTiler Geocoding or OpenCage) ⚠️ verify result-storage terms — some geocoders prohibit storing results, which matters for plan start-point labels |
| Use | Place/accommodation search for location + plan start point, constrained to scope bbox |
| Fallback | Degrade to region picker + attraction-name search (no external dependency) |
| Cost | Free tier sufficient for MVP ⚠️ verify limits |

LAKE-031 adds an abstracted HTTP adapter and a fake; the adapter stays unavailable when
`GEOCODER_URL` is not configured, so local development and provider outages degrade to
the in-app region picker. Before staging or production, verify the selected provider's
current rate limits and result-storage terms, record the provider and plan here, and
complete the legal review. Results are not persisted by the geocoder proxy.

### Routing (phase 2 only)
Coarse travel-time estimates in MVP are **heuristics** (straight-line distance × mode factor — [../planning/manual-planner.md](../planning/manual-planner.md#duration-estimation)), deliberately requiring **no** external routing provider. Phase 2 evaluates OSRM/Valhalla/openrouteservice self-host vs. hosted ⚠️ full evaluation deferred to phase-2 tickets.

### Weather {#weather}

| Aspect | Assessment |
|---|---|
| Recommendation | **Open-Meteo** (free for non-commercial; commercial plan available and cheap) ⚠️ verify current commercial terms before any monetization |
| Data | Forecast per lake sub-area (3–4 sample points around the lake), cached 1–3 h ([../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md#weather)) |
| Licence | Open-Meteo data CC BY 4.0 — attribution required ✅ |
| Fallback | Hide weather hints entirely (weather is an enhancement, never a blocker); DWD/MeteoSwiss open data as alternates |
| Cost | 0 € MVP |

### Public holidays
Seeded static data (DE-BW, CH-TG/SH, AT-VBG) maintained in-repo with a yearly refresh task ([../operations/maintenance.md](../operations/maintenance.md)); optionally cross-checked against OpenHolidays API ⚠️ verify licence. No runtime dependency.

### OpenStreetMap data (POI discovery)
Overpass API for research-phase candidate discovery — rate-limited community service, used **offline in the research workflow only**, never at runtime. ODbL obligations: [../data/data-source-policy.md](../data/data-source-policy.md#openstreetmap). ✅

### Wikidata / Wikipedia
Research-phase cross-checking and external IDs. CC0 (Wikidata) ✅ / CC BY-SA (Wikipedia text — **must not be copied into our summaries**, REQ-DATA-05). 

### Google Places
**Not used in MVP.** Must not become the persistent master database without full licensing analysis — see [../data/data-source-policy.md](../data/data-source-policy.md#google-places). ⚠️

### Transactional email
Admin-only (password reset, review notifications): **Scaleway TEM** is the selected adapter target for LAKE-014 because it supports EU-region delivery. Production use remains blocked until the current DPA, retention, and sender-verification terms are checked; the adapter uses `ADMIN_EMAIL_ENDPOINT`, `ADMIN_EMAIL_API_KEY`, and `ADMIN_EMAIL_FROM` so the provider can be replaced without feature-code changes. No tourist-facing email exists in MVP.

### Analytics
Privacy-first, cookieless, EU-hosted (Plausible self-host/cloud recommendation): [../operations/analytics-and-seo.md](../operations/analytics-and-seo.md#analytics). ⚠️ verify DPA availability for cloud variant.

### LLM (research workflow now; phase 3 runtime later)
Research workflow uses interactive agents with web access (operated by humans, output validated against [../data/research-output-schema.md](../data/research-output-schema.md)) — no runtime dependency. Phase-3 runtime LLM requirements (structured output, EU processing option, fallback across ≥2 providers): [../planning/ai-travel-assistant.md](../planning/ai-travel-assistant.md#model-strategy).

## Provider-failure policy (summary)

Every adapter: timeouts (2 s public-path, 30 s jobs), circuit breaker, typed `ProviderUnavailable` result (no thrown-through provider errors), degradation path documented above, failure metrics ([../operations/observability.md](../operations/observability.md)). Tested via fakes: [../quality/testing-strategy.md](../quality/testing-strategy.md) (external-provider failure suite).
