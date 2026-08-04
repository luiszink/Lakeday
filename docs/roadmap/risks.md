# Risks

Status: risk register — **recommendations** with owners assigned at kickoff. Reviewed monthly ([../operations/maintenance.md](../operations/maintenance.md)).

Scoring: likelihood × impact, H/M/L.

| ID | Risk | L | I | Mitigation | Trigger to act |
|---|---|---|---|---|---|
| R-01 | **Content coverage too thin at launch** — discovery product with too few verified attractions fails on first impression | M | H | Pilot early (M3); parallel research operation; launch gate REQ-DATA-10; quality-over-quantity messaging; region-by-region "coming soon" honesty | <10 published attractions in any checklist locality 4 weeks before target launch |
| R-02 | **Research effort per attraction exceeds estimate** (>45 min), making full-shoreline coverage unaffordable | M | H | Pilot measures effort; prompts/schema iterated before scale; prioritized sector order; acceptable to launch with partial sector depth | Pilot retro misses exit criteria |
| R-03 | **Source scraping fragility** — official sites change, refresh pipeline degrades into permanent review-queue noise | H | M | Per-source health tracking; content-hash fast path; asymmetric auto-apply rules; queue-size anomaly alerts; editors can switch a fact to manual cadence | >100 queued proposals/run or >20 % SOURCE_UNAVAILABLE |
| R-04 | **ODbL / database-rights exposure** — share-alike claim against our DB, or database-rights complaint from a crawled source | L | H | Per-fact sourcing (no bulk OSM import); official-source verification; ⚠️ legal review before launch; source registry with approval step | Legal review outcome; any complaint |
| R-05 | **GDPR/consent misstep** (analytics stance, localStorage interpretation) | L | H | Cookieless architecture; data minimization by design; ⚠️ legal review of banner-free stance (OQ-5); EU hosting | Legal review outcome |
| R-06 | **Free-tier provider limits blown in season** (tiles/geocoding) — spike in August traffic | M | M | Usage monitoring vs. quota (monthly check); provider swap via config (ADR-005); budget pre-approved for paid tiers | 70 % of monthly quota reached |
| R-07 | **Accessibility data wrong** — wheelchair user harmed by incorrect FULL rating | L | H | Verified-only policy for accessibility fields; UNKNOWN excluded from must-filters; review priority for accessibility changes; report flow prominent | Any user report on accessibility fields |
| R-08 | **Opening-hours engine complexity underestimated** (three countries, holidays, seasons, exceptions) | M | M | Engine is a pure, heavily-tested domain package (LAKE-012); explicit UNKNOWN state; golden tests per country/holiday; scope limited to weekly+seasonal+exceptions (no minute-level event hours) | LAKE-012 estimate overrun |
| R-09 | **Prisma+PostGIS friction** (raw SQL escape hatches proliferate) | M | L | Geometry access confined to typed helpers in `packages/db`; integration tests on Testcontainers; fallback: view-based mapping | Helpers leaking into feature code in review |
| R-10 | **Seasonality mismatch** — launching after the season wastes the year's acquisition window | M | M | No-calendar roadmap but content track started early; soft-launch acceptable (subset of regions) in-season rather than full launch off-season | Product decision at M4 |
| R-11 | **Scope creep into inland regions / feature creep toward phase 2-3** | M | M | ADR-001 configurable rule + marked exceptions; phase gates; open-questions discipline; AGENTS.md hard rules | Any PR adding out-of-scope data or unguarded AI features |
| R-12 | **Single-maintainer bus factor** (small team, agent-driven development) | M | M | Docs-as-code discipline; tickets self-contained; ADRs capture rationale; standard stack with wide agent/community knowledge | — |
| R-13 | **Shared-plan abuse** (spam storage, link farms) | L | L | Rate limits, size caps, retention expiry, noindex; tokens unguessable | Abuse observed in logs |
| R-14 | **iOS PWA storage eviction** loses local favorites/plans | M | M | IndexedDB (persistent-storage API request); in-app warning about clearing data; share-link as manual backup; accounts in phase 1.5 solve properly | User reports of data loss |

Top three to watch: **R-01, R-02, R-03** — all content-related. The product's moat and its riskiest dependency are the same thing: the verified database.
