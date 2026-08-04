# LAKE-EPIC-017 — Tasks: Analytics

Epic: [LAKE-EPIC-017](../epics/LAKE-EPIC-017-analytics.md). Global [definition of done](../../agents/definition-of-done.md) applies.

---

## LAKE-062 — Analytics integration and event plan

**Status:** open · **Phase:** MVP/M6 · **Parallel:** yes

**Objective:** REQ-SEC-01-compatible product measurement: cookieless analytics provider integrated behind an adapter, the full event plan wired, and the consent-free stance technically verified.

**User story:** As the product owner, I want gate-relevant usage signals without compromising the "no tracking" promise.

**Context:** [analytics-and-seo.md#analytics](../../operations/analytics-and-seo.md#analytics) (event plan binding), [security-and-privacy.md#cookies--consent](../../quality/security-and-privacy.md#cookies--consent); provider pick (Plausible default) + DPA verification (⚠️) executed here.

**In scope:** `Analytics` adapter interface + provider implementation + no-op fake (dev/test default); all events from the plan wired at their slots (built across earlier tickets — this ticket connects them): pageview, detail_view, filter_apply, search(zero flag), favorite_add, plan_* , shared_plan_open, map_list_toggle, official_link_click, report_submit, pwa_install, language_switch; return-usage bucket (local counter, no server ID); technical verification: zero cookies, zero persistent identifiers, EU endpoint (assert in e2e); provider outage = silent no-op (never blocks UX); documentation of the stance for the privacy policy (LAKE-068 input).
**Out of scope:** dashboards/gate reports (LAKE-063), consent banner (stance is banner-free pending OQ-5).

**Dependencies:** event-slot tickets merged (epics 6–14). **Files:** analytics adapter, slot wiring, e2e assertions.

**Domain rules:** event props low-cardinality only; no free text, no coordinates (lint-able constant list).
**API changes:** none (client → provider directly or proxied per provider guidance). **DB changes:** none.
**UI states:** none (invisible; failure silent).
**DE/EN:** locale is an event prop.
**A11y:** none. **Privacy/security:** the core concern — cookie/identifier absence tested; script CSP-allow-listed; DPA verified + recorded.

**Acceptance criteria:**
- [ ] All planned events fire with correct props on their flows (e2e with fake adapter assertions)
- [ ] Zero cookies/localStorage identifiers from analytics (storage assertion after full flow)
- [ ] Provider blocked ⇒ zero UX impact (e2e)
- [ ] DPA/EU verification recorded in external-services.md

**Tests:** E2E: event-firing matrix + absence assertions. Unit: adapter mapping.
**Manual validation:** verify live events in the provider dashboard from staging.
**Commands:** `pnpm test:e2e -g analytics`.
**Rollback:** adapter to no-op via env — instant kill switch.

---

## LAKE-063 — Zero-result logging and gate dashboards

**Status:** open · **Phase:** MVP/M6 · **Parallel:** yes (after 062)

**Objective:** The anonymized zero-result query log (data-gap discovery) and the metric views answering the phase gates (G1–G4 inputs) plus weekly data-quality report surfacing.

**User story:** As the team, we want "what did people search and not find?" and "are we ready for phase 2?" answerable from data, not anecdotes.

**Context:** [success-metrics.md](../../product/success-metrics.md) (metrics + gates), [data-quality-strategy.md#quality-metrics](../../quality/data-quality-strategy.md#quality-metrics).

**In scope:** zero-result batch log (server-side aggregation endpoint fed by the search path: query + filter-combo hash, counted, no session linkage; weekly digest view in admin); gate dashboard (admin page or provider dashboard config): plan-interaction rate, plans saved, median stops, coverage stats, official-link CTR, PWA installs, language split; weekly quality report page (sweep stats from LAKE-055, review latency, report rates); alert thresholds for quality regressions (stale % rising).
**Out of scope:** automated gate decisions (human calls with numbers), external BI tooling.

**Dependencies:** LAKE-062, LAKE-055 (sweep stats). **Files:** zero-result endpoint + admin views, dashboard page/config.

**Domain rules:** zero-result log stores no session/user linkage (aggregation-only schema).
**API changes:** internal aggregation endpoint (rate-limited, origin-checked). **DB changes:** small aggregate table (additive).
**UI states (admin):** report empty states early on ("collecting data since {date}").
**DE/EN:** admin English; logged queries kept verbatim (they are the signal).
**A11y:** admin tables/graphs with text equivalents.
**Privacy/security:** aggregation-only verified by schema; admin-gated views.

**Acceptance criteria:**
- [ ] Zero-result searches aggregate correctly (fixture flows); digest lists top misses
- [ ] Gate dashboard renders all G1–G4 input metrics from real staging events
- [ ] Quality report shows sweep + queue stats; regression alert fires on a contrived fixture

**Tests:** Integration: aggregation correctness, no-linkage schema proof. E2E: none beyond admin smoke.
**Manual validation:** review the dashboard after a staging usage session.
**Commands:** `pnpm test -g metrics`.
**Rollback:** additive; views removable.
