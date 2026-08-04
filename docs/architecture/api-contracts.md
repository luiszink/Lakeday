# API contracts

Status: **architectural decision** (style, resources, filter parameters), **recommendation** (exact field lists — finalized in implementation tickets with zod schemas as the single source of truth).

Style: JSON REST via Next.js route handlers. All request/response shapes are defined as **zod schemas in `packages/domain`** and exported for client, server, and tests — the schemas, not this document, are authoritative once code exists. Versioning: URL prefix `/api/` unversioned for MVP (single first-party client); breaking changes require an `/api/v2/` split.

Conventions: `camelCase` JSON; errors as `{ error: { code, message, details? } }` with correct HTTP status; all public endpoints locale-aware via `?locale=de|en` (affects localized strings only, not structure); rate limits per [../quality/security-and-privacy.md](../quality/security-and-privacy.md#rate-limiting).

## Public read API

### `GET /api/attractions` — list/search/filter
Query parameters (= URL filter state, [../ux/information-architecture.md](../ux/information-architecture.md#url-structure-decision)):

| Param | Type | Meaning |
|---|---|---|
| `q` | string | Full-text search |
| `bbox` | `minLon,minLat,maxLon,maxLat` | Map viewport query |
| `near` | `lat,lon` (client-rounded ~100 m) | Distance context |
| `r` | km enum `1,2,5,10,25,50` | Radius (with `near`) |
| `region` | CSV of region codes | REQ-FILT-02 |
| `cat`, `interest`, `audience` | CSV of vocabulary codes | REQ-FILT-04/05/06 |
| `age` | CSV of age bands | REQ-FILT-07 |
| `io` | `indoor,outdoor,mixed` CSV | REQ-FILT-08 |
| `rain`, `heat` | min ordinal (`ok,good,excellent`) | REQ-FILT-09/10 |
| `season` | CSV | REQ-FILT-11 |
| `price` | CSV (`free,low,medium,high,premium`) | REQ-FILT-12 |
| `dur` | CSV of duration bands | REQ-FILT-13 |
| `open` | `now` \| `date:YYYY-MM-DD` | REQ-FILT-14 |
| `mode` | CSV (`walk,bike,pt,car`) | REQ-FILT-15 |
| `food`, `cafe`, `picnic` | `1` | REQ-FILT-16/17/18 |
| `noresv` | `1` | REQ-FILT-19 |
| `wheelchair`, `stroller`, `dogs` | `1` | REQ-FILT-20/21/22 |
| `lang` | CSV of visitor languages | REQ-FILT-23 |
| `sort` | `relevance` \| `distance` | REQ-DISC-06/07 |
| `cursor`, `limit` (≤50; bbox mode ≤200) | pagination | |
| `locale` | `de` \| `en` | |

Response: `{ items: AttractionCard[], nextCursor?, total, truncated?, zeroResultHints? }`. `AttractionCard` = id, slug, name, category, region, municipality, coordinates, priceLevel, openState (`OPEN/CLOSED/UNKNOWN`), typicalDuration, distanceM?, thumbnail (with attribution), freshness badge level. `zeroResultHints` (only when `total = 0`) = per-filter would-match counts ([../ux/filter-and-search-behaviour.md](../ux/filter-and-search-behaviour.md#zero-results)).

Caching: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`; `openState` computed from cached hours at render.

### `GET /api/attractions/{idOrSlug}` — detail
Full published record: all suitability/practical fields, localized texts, opening rules + exceptional closures (raw + evaluated for `?date=`), structured prices with currency, images with attribution, official links, per-fact freshness `{ factKey, lastCheckedAt, status }`, nearby attraction cards. 404 for non-published (no draft leakage); 301 JSON hint for merged aliases.

### `GET /api/geocode?q=…` — place search (start point / location picker)
Proxies the abstracted geocoding provider ([external-services.md](external-services.md#geocoding)), constrained to the scope bounding box, returns `{ label, lat, lon }[]`. Never exposes provider API keys to the client; cached aggressively; rate-limited.

### Plans
- `POST /api/plans` — share a plan. Body: `{ date?, startPoint? {lat, lon, label} (rounded client-side), locale, stops: [{attractionId, plannedDurationMin?}] }`. Validates: ≤ 20 stops, attraction IDs exist & published, token generated server-side. Returns `{ shareToken, url }`. Rate limit: 10/h per IP (REQ-SEC-02).
- `GET /api/plans/{shareToken}` — read shared plan; recomputes conflicts/durations server-side via the shared domain validator; bumps `lastAccessedAt`. Constant-time token lookup, 404 on miss.

### `POST /api/reports` — incorrect-information report
Body: `{ attractionId, category, message? (≤1000 chars), locale }`. No PII fields accepted. Rate limit 5/h per IP. → review queue (REQ-REP-01).

## Admin API (`/api/admin/*`, session + role guarded, noindex, CSRF-protected)

| Endpoint | Purpose |
|---|---|
| `GET/POST/PATCH /api/admin/attractions` | CRUD incl. draft/publish transitions (`publishAttraction()` enforces invariants) |
| `GET /api/admin/review-queue`, `POST …/{id}/decision` | ChangeProposal listing + approve/reject/edit (F7 in [../ux/core-user-flows.md](../ux/core-user-flows.md#f7-editor-reviews-a-change-proposal-admin)) |
| `POST /api/admin/import/research` | Upload research-output JSON; validated against [../data/research-output-schema.md](../data/research-output-schema.md); returns per-record accept/duplicate/error results |
| `GET/POST /api/admin/sources`, `/api/admin/licences` | Source & licence registries |
| `GET /api/admin/reports` | User-report triage |

## Job endpoints (`/api/jobs/*`, `Authorization: Bearer ${JOB_TRIGGER_SECRET}`)

`POST /api/jobs/refresh?type=weather|closures|hours|prices|seasonal` · `POST /api/jobs/data-quality` · `POST /api/jobs/sitemap`. Idempotent; safe to re-trigger; each returns a job-run summary that is also persisted for observability ([../operations/observability.md](../operations/observability.md#job-monitoring)). Semantics: [../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md).

## Future compatibility (documented, not built)

- Phase 2 planner: `POST /api/planner/generate` consuming the same filter vocabulary + returning `PlanDraft` referencing attraction IDs ([../planning/deterministic-planner.md](../planning/deterministic-planner.md#api)).
- Phase 3 assistant: tool-call endpoints wrapping search/detail/planner — the AI layer consumes **these same contracts**, never the DB ([../planning/ai-travel-assistant.md](../planning/ai-travel-assistant.md#tool-interfaces)).
- Optional accounts (phase 1.5): favorites sync endpoint merging local records ([auth-and-anonymous-usage.md](auth-and-anonymous-usage.md#future-optional-accounts)).
