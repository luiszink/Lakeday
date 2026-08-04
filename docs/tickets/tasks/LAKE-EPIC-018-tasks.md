# LAKE-EPIC-018 — Tasks: Testing and deployment hardening

Epic: [LAKE-EPIC-018](../epics/LAKE-EPIC-018-testing-and-deployment.md). Global [definition of done](../../agents/definition-of-done.md) applies. LAKE-068 is the final sequential launch gate.

---

## LAKE-064 — E2E persona suite

**Status:** open · **Phase:** MVP/M6 · **Parallel:** yes

**Objective:** The complete persona-based e2e suite: all seven test personas' scenarios on mobile viewports in both locales, consolidating and extending per-ticket e2e coverage into launch-critical journeys.

**User story:** As the team, we want every launch-critical journey provably working for every persona before and after every deploy.

**Context:** [testing-strategy.md#test-personas](../../quality/testing-strategy.md#test-personas) (scenario skeletons binding), fixture dataset (LAKE-010).

**In scope:** persona specs P1–P7 (PT-filter couple, EN solo with CHF/Sunday checks, toddler+stroller must-filters, older-kids multi-interest plan, wheelchair keyboard/SR run, rainy-day holiday date, budget zero-result relaxation); full-matrix run on main (2 viewports × 2 locales); staging smoke subset post-deploy; flake policy (retries=1, quarantine label with fix SLA); visual screenshot baseline set (key screens × locales × 360/768 px).
**Out of scope:** load testing (not MVP-scale-relevant), synthetic monitors (LAKE-066).

**Dependencies:** all feature epics; LAKE-058 (a11y specs referenced by P5). **Files:** `apps/web/e2e/personas/*.spec.ts`, baseline images, CI matrix config.

**Domain rules / API / DB:** none.
**UI states:** persona specs deliberately traverse loading/empty/error/stale states (scripted).
**DE/EN:** matrix covers both; P2 runs EN-only end-to-end.
**A11y:** P5 spec runs keyboard-only + axe assertions throughout.
**Privacy/security:** e2e asserts the no-network guarantees (favorites/plan) once more in journey context.

**Acceptance criteria:**
- [ ] All seven persona specs green on the full matrix; runtime < 15 min parallelized
- [ ] Post-deploy staging smoke wired into the main workflow
- [ ] Visual baselines committed; diff process documented

**Tests:** the suite is the deliverable.
**Manual validation:** watch one full matrix run; review videos of P5.
**Commands:** `pnpm test:e2e`, `pnpm test:e2e --grep @persona`.
**Rollback:** n/a (test assets).

---

## LAKE-065 — Performance budgets

**Status:** open · **Phase:** MVP/M6 · **Parallel:** yes

**Objective:** Enforce the performance budget: Lighthouse CI thresholds, bundle-size guards, and fixes to get core pages under budget on mid-range mobile.

**Context:** [pwa-strategy.md#performance-budget](../../architecture/pwa-strategy.md#performance-budget) (numbers binding).

**In scope:** Lighthouse CI on PRs (list, detail, map routes; mobile emulation; budgets: LCP 2.5 s list / 4 s map, CLS <0.1, TBT <300 ms); bundle-size assertions (initial route <200 KB gzip, map lazy chunk verified); remediation work to meet budgets (image sizing, font strategy, code splitting) within this ticket; server-timing p95 checks for API routes (<300 ms filter path) as integration assertions; budget-regression policy documented (fail = fix or explicit waiver in PR).
**Out of scope:** CDN tuning beyond host defaults, load testing.

**Dependencies:** core routes final (epics 6–9, 14). **Files:** lighthouse CI config, bundle guard, targeted perf fixes.

**Domain rules / API / DB:** none. **UI states:** skeletons must not regress CLS (explicit check).
**DE/EN:** budget runs on both locale routes (German text length affects layout).
**A11y:** perf fixes must not strip a11y (review-checklist reminder).
**Privacy/security:** none.

**Acceptance criteria:**
- [ ] Budgets enforced in CI and green on staging for all three route classes, both locales
- [ ] Bundle guards active; map chunk lazy-verified
- [ ] API p95 assertions green on fixture volume ×10

**Tests:** CI budgets are the tests.
**Manual validation:** WebPageTest (or dev-tools throttled) run on a real mid-range device.
**Commands:** `pnpm lighthouse:ci` (added here).
**Rollback:** budgets adjustable by config with documented waiver only.

---

## LAKE-066 — Observability tooling

**Status:** open · **Phase:** MVP/M6 · **Parallel:** yes

**Objective:** REQ-OBS-01 completion: error tracking (EU, PII-scrubbed), structured-log conventions verified, dashboards for the five signal groups, external uptime checks, and the alert set.

**User story:** As the operator, I want to learn about breakage from alerts, not tourists.

**Context:** [observability.md](../../operations/observability.md) (dashboards/alerts binding; tool pick ⚠️ DPA-checked here).

**In scope:** error-tracker integration (client+server, sourcemaps, release tags, scrub rules tested: coordinates, tokens, report text); log-scrub verification tests; dashboards: public health (latency/error/uptime), provider health (from adapter metrics), job health (job_run), data quality (LAKE-063 feeds), DB basics; external synthetic checks (list page content-match, detail page, health endpoint, 5-min interval, EU probe); alert wiring per the policy (site down, error spike, job alerts, storage, expiry) to team channel; runbook stubs per alert (what to check first).
**Out of scope:** APM/tracing depth (not MVP-scale), on-call rotation.

**Dependencies:** LAKE-051 (job_run), LAKE-062/063 (quality feeds), LAKE-002. **Files:** tracker config, scrub tests, dashboard configs, synthetic-check config, `docs/operations/observability.md` runbook additions.

**Domain rules / API / DB:** none. **UI states:** n/a. **DE/EN:** n/a.
**A11y:** n/a. **Privacy/security:** scrub rules are the core concern — tested; DPA recorded; EU region.

**Acceptance criteria:**
- [ ] Thrown test errors (client+server) arrive scrubbed with release tags
- [ ] All five dashboards populated from staging traffic; synthetic checks green + alerting on induced failure
- [ ] Each alert has a runbook stub; log-scrub tests cover coordinates/tokens/report-text

**Tests:** scrub-rule unit tests; induced-failure alert drill (documented).
**Manual validation:** the alert drill.
**Commands:** provider CLIs; `pnpm test -g scrub`.
**Rollback:** tooling detachable; keep scrub tests regardless.

---

## LAKE-067 — Backup verification and restore drill

**Status:** open · **Phase:** MVP/M6 · **Parallel:** yes

**Objective:** Verify the backup story end-to-end: snapshot + PITR configuration confirmed, a full restore drill executed into a scratch instance, and the quarterly drill procedure documented.

**User story:** As the owner of the core asset (the content database), I want proof — not assumption — that we can restore it.

**Context:** [maintenance.md#backup-and-restore](../../operations/maintenance.md#backup-and-restore), [database-schema.md#backup-and-recovery](../../architecture/database-schema.md#backup-and-recovery) (launch blocker).

**In scope:** confirm provider snapshot schedule + PITR retention meet policy; execute restore drill (restore latest snapshot → scratch instance → run data-quality sweep + row-count/invariant comparisons → record duration and result); verify git-versioned seeds (`data/geo`, `data/research`) restore path; document the quarterly drill procedure with checklists; backup-failure alert wired (provider webhook/check into LAKE-066 alerts).
**Out of scope:** multi-region DR (not MVP-appropriate).

**Dependencies:** LAKE-002, LAKE-066 (alert channel), meaningful staging data (post-pilot ideal). **Files:** drill procedure in maintenance.md, alert config.

**Domain rules / API / DB / UI / DE-EN / A11y:** n/a.
**Privacy/security:** scratch restore instance destroyed after drill (contains real-ish data); access logged.

**Acceptance criteria:**
- [ ] Restore drill completed: documented duration, integrity checks passed, scratch destroyed
- [ ] PITR verified by point-in-time restore of a known change
- [ ] Quarterly procedure documented; backup-failure alert tested

**Tests:** the drill is the test. **Manual validation:** the drill.
**Commands:** provider backup/restore CLI per host.
**Rollback:** n/a (verification activity).

---

## LAKE-068 — Launch checklist and legal pages

**Status:** open · **Phase:** MVP/M6 · **Parallel:** **no — final sequential gate**

**Objective:** Production launch: final legal texts in place (post-legal-review), security-header and privacy verification, production environment promotion, launch-day checks, and the go/no-go checklist executed.

**User story:** As the team, we want a single auditable gate confirming every launch requirement — technical, legal, content — before the public URL goes live.

**Context:** [security-and-privacy.md#legal-review-checklist](../../quality/security-and-privacy.md#legal-review-checklist) (⚠️ items must be resolved by professional review — external dependency), [deployment.md](../../operations/deployment.md), REQ-DATA-10 (content coverage check).

**In scope:** replace legal placeholders with reviewed texts (impressum, privacy policy DE/EN, licences page final review) and remove their noindex; verify consent stance outcome (OQ-5) and implement a minimal consent layer **only if** review requires it; security-header verification (CSP, HSTS, Permissions-Policy) against spec; rate-limit spot checks in production config; production environment promotion (env vars, secrets rotation, domain + TLS + HSTS, scheduler enabled); content-coverage check vs REQ-DATA-10 (go/no-go input, not this ticket's work); analytics/observability verified live; launch checklist document executed and archived (every item signed).
**Out of scope:** marketing/announcement, post-launch monitoring routine ([maintenance.md](../../operations/maintenance.md) owns it).

**Dependencies:** ALL MVP tickets; external legal review completed (risk R-04/R-05 resolution); OQ-1 domain decided. **Files:** legal content, production config, `docs/operations/launch-checklist.md` (created + executed here).

**Domain rules:** none new. **API changes:** none. **DB changes:** none.
**UI states:** legal pages standard static states.
**DE/EN:** legal texts bilingual (DE authoritative where law requires; EN informational note per legal advice).
**A11y:** legal pages pass the standard checks.
**Privacy/security:** this ticket is the final verification of the entire posture.

**Acceptance criteria:**
- [ ] All ⚠️ legal items resolved and texts live; noindex lifted only on approved pages
- [ ] Security headers + rate limits verified on production; secrets rotated for launch
- [ ] Full persona e2e green against production; synthetic checks + alerts live
- [ ] Launch checklist archived with sign-offs; go decision recorded

**Tests:** production smoke = persona subset + header assertions.
**Manual validation:** the checklist execution.
**Commands:** `pnpm test:e2e --grep @smoke -- --base-url=https://<prod>`.
**Rollback:** documented: DNS/host rollback to holding page; DB untouched by rollback.
