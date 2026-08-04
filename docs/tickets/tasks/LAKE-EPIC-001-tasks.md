# LAKE-EPIC-001 — Tasks: Repository foundation

Epic: [LAKE-EPIC-001](../epics/LAKE-EPIC-001-repository-foundation.md). All tickets: the global [definition of done](../../agents/definition-of-done.md) applies in addition to per-ticket criteria; work per the [implementation guide](../../agents/implementation-guide.md); status is tracked inline (`Status: open`).

---

## LAKE-001 — Monorepo scaffolding

**Status:** done · **Phase:** MVP/M0 · **Parallel:** no — first ticket, everything depends on it

**Objective:** Create the pnpm-workspace monorepo with the Next.js app, empty domain/db packages, shared tooling config, and environment-variable conventions.

**User story:** As an implementation agent, I want a consistently structured, strictly typed workspace so that every later ticket has an unambiguous place for its code.

**Context:** [system-architecture.md](../../architecture/system-architecture.md#repository-layout-proposed) (layout), [ADR-009](../../adr/ADR-009-technology-stack.md) (stack incl. Tailwind confirmation).

**In scope:** pnpm workspaces (`apps/web`, `packages/domain`, `packages/db`, `packages/config`); Next.js (App Router, TypeScript strict) in `apps/web`; ESLint + Prettier shared config incl. the layering lint rules (no I/O imports in `packages/domain`); `.env.example` with all documented variables; root `package.json` scripts (`dev`, `build`, `lint`, `typecheck`, `test` placeholders); `.gitignore`, git init, initial commit.
**Out of scope:** CI (LAKE-003), database (LAKE-004/006), any feature code, styling system beyond Tailwind installation.

**Dependencies:** none. **Files:** entire initial tree per the layout spec.

**Approach:** 1) `pnpm init` workspace + packages; 2) `create-next-app` into `apps/web`, strip demo content; 3) shared `tsconfig`/`eslint` in `packages/config`; 4) lint rule: `packages/domain` may not import from `next`, `@prisma/*`, `node:fs` etc.; 5) `.env.example` from the [env table](../../architecture/system-architecture.md#environment-variables); 6) README quick-start section update.

**Domain rules:** none. **API changes:** none. **DB changes/migration:** none.
**UI states:** n/a (no UI beyond default page rendering "app shell pending").
**DE/EN:** none yet (no user-facing strings). **A11y:** n/a. **Privacy/security:** `.env` gitignored; no secrets committed.

**Acceptance criteria:**

- [ ] `pnpm install && pnpm -r build` and `pnpm lint && pnpm typecheck` succeed from a clean clone
- [ ] `pnpm dev` serves a page from `apps/web`
- [ ] Importing `next` from `packages/domain` fails lint (prove with a temporary test)
- [ ] `.env.example` lists every variable from the architecture doc with a comment each

**Tests:** Unit: none required. Integration: none. E2E: none. (Tooling ticket — CI in LAKE-003 becomes the regression net.)
**Manual validation:** clean clone → quick-start commands from README work on Windows + Linux shells.
**Commands:** `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`.
**Rollback:** delete and re-scaffold; no data involved.

---

## LAKE-002 — Hosting selection and staging deployment

**Status:** open · **Phase:** MVP/M0 · **Parallel:** yes (after LAKE-001; parallel to LAKE-003/004)

**Objective:** Select the hosting provider against the binding requirements, provision staging (app + managed Postgres/PostGIS + scheduler), and deploy `main` automatically.

**User story:** As the team, we want every merged change visible on a staging URL so that reviews validate real behaviour, not local claims.

**Context:** [deployment.md](../../operations/deployment.md) — requirements list is binding; provider comparison happens inside this ticket and is recorded there.

**In scope:** provider comparison (≥2 candidates) documented in deployment.md; staging app + EU Postgres with PostGIS; deploy-on-merge for `main`; preview deployments if the provider supports them; secrets configured in the host store; `/api/health` endpoint.
**Out of scope:** production environment (LAKE-068 promotes), scheduler job definitions (LAKE-051), custom domain (OQ-1).

**Dependencies:** LAKE-001. **Files:** `docs/operations/deployment.md` (decision record), host config files (e.g. `Dockerfile`/`fly.toml`/provider config), `apps/web/app/api/health/route.ts`.

**Approach:** 1) evaluate candidates on the six binding requirements + price; 2) update deployment.md with the decision + rationale; 3) provision staging DB (verify `CREATE EXTENSION postgis`); 4) wire deploy-on-merge; 5) smoke-verify health endpoint.

**Domain rules:** none. **API changes:** adds `GET /api/health` (shallow: process + DB ping). **DB changes:** none (instance provisioning only).
**UI states:** n/a. **DE/EN:** n/a. **A11y:** n/a.
**Privacy/security:** EU region verified; DB not publicly reachable (private networking or IP allow-list); secrets only in host store.

**Acceptance criteria:**

- [ ] Staging URL serves the app; `/api/health` returns 200 with DB connectivity confirmed
- [ ] `SELECT postgis_version()` works on the staging DB
- [ ] Merge to `main` deploys automatically; failed builds do not deploy
- [ ] deployment.md records provider, region, and rationale

**Tests:** Unit: none. Integration: health-endpoint test (DB up/down cases, fake). E2E: none.
**Manual validation:** merge a trivial change; watch it appear on staging.
**Commands:** provider CLI per decision; `curl https://<staging>/api/health`.
**Rollback:** hosting is disposable pre-launch; re-provision. Keep provider choice reversible (no proprietary APIs outside config).

---

## LAKE-003 — CI pipeline

**Status:** done · **Phase:** MVP/M0 · **Parallel:** yes (after LAKE-001)

**Objective:** GitHub Actions pipeline gating every PR: lint, typecheck, unit, integration (Testcontainers PG+PostGIS), build, gitleaks, `prisma migrate diff` cleanliness; e2e smoke + Lighthouse once those exist.

**User story:** As a reviewer, I want CI to prove mechanical correctness so review can focus on design and product rules.

**Context:** [deployment.md#ci-pipeline](../../operations/deployment.md#ci-pipeline), [testing-strategy.md](../../quality/testing-strategy.md). Assumes GitHub (OQ-8).

**In scope:** PR workflow with the stages above (test stages activate as suites appear — wire them now, allow empty); main workflow deploying staging (uses LAKE-002); pipeline caching (pnpm store); required-check branch protection documentation.
**Out of scope:** Lighthouse budgets tuning (LAKE-065), full e2e matrix (LAKE-064).

**Dependencies:** LAKE-001 (LAKE-002 for the deploy step — may land as follow-up commit). **Files:** `.github/workflows/pr.yml`, `.github/workflows/main.yml`.

**Approach:** standard pnpm+node matrix (single version), Testcontainers service via Docker-in-runner, gitleaks action, artifact upload for Playwright traces (future).

**Domain rules / API / DB / UI / DE-EN / A11y:** n/a.
**Privacy/security:** no secrets in PR workflows from forks; gitleaks blocking.

**Acceptance criteria:**

- [ ] A PR with a lint error, type error, failing test, or committed secret is blocked
- [ ] Green PR completes in < 10 min with caching
- [ ] Merge to main triggers staging deploy after checks

**Tests:** the pipeline is the test; include one deliberate failing-PR dry run.
**Manual validation:** open a draft PR with an injected fake secret → gitleaks fails.
**Commands:** `act` optional locally; otherwise GitHub UI.
**Rollback:** workflows are additive files; revert freely.

---

## LAKE-004 — Local development environment

**Status:** open · **Phase:** MVP/M0 · **Parallel:** yes (after LAKE-001)

**Objective:** One-command local stack: Docker Compose PostgreSQL+PostGIS, database scripts (`db:migrate`, `db:seed`, `db:reset`), and a documented quick start that works on Windows (primary dev OS), macOS, Linux.

**User story:** As an implementation agent, I want a reproducible local database so integration work never depends on shared infrastructure.

**Context:** [deployment.md#environments](../../operations/deployment.md#environments), [database-schema.md](../../architecture/database-schema.md).

**In scope:** `docker-compose.yml` (postgis image, volume, healthcheck); root scripts `db:migrate` / `db:seed` / `db:reset` (initially thin wrappers, filled by LAKE-006/008/010); `.env.example` defaults matching compose; README quick start verified end-to-end.
**Out of scope:** actual schema/seeds (LAKE-006/008/010).

**Dependencies:** LAKE-001. **Files:** `docker-compose.yml`, `package.json` scripts, README section.

**Approach:** `postgis/postgis:16` image; healthcheck gating `pnpm dev`; scripts idempotent.

**Domain rules / API / UI / DE-EN / A11y:** n/a. **DB changes:** infrastructure only.
**Privacy/security:** local DB credentials are non-secrets by convention (documented as local-only).

**Acceptance criteria:**

- [ ] `docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev` works from clean clone on Windows (PowerShell + Git Bash)
- [ ] `pnpm db:reset` returns to a clean seeded state
- [ ] `SELECT postgis_version()` succeeds in the container

**Tests:** none beyond CI integration jobs using the same image. **Manual validation:** clean-machine walkthrough of the README.
**Commands:** as above. **Rollback:** delete volume/container.

---

## LAKE-005 — App shell and navigation

**Status:** open · **Phase:** MVP/M1 · **Parallel:** no (shared foundation for all UI lanes)

**Objective:** The localized application shell: bottom tab bar (Discover, Favorites, My Day, More) on mobile, top navigation on desktop, header with language switch, and the More screen skeleton (language, install hint placeholder, about links).

**User story:** As a visitor, I want persistent, obvious navigation so I always know where I am and can switch language anywhere.

**Context:** [information-architecture.md](../../ux/information-architecture.md#navigation-model), [core-user-flows.md F5](../../ux/core-user-flows.md#f5-language-switch).

**In scope:** responsive shell layout (360 px first); tab bar with active states + badge slot (plan stop count wired later); locale-aware routing integration (needs LAKE-024); language switch preserving route + query; More screen with static links; placeholder Discover/Favorites/My-Day screens ("coming soon" pattern with honest copy); base design tokens (colors, spacing, focus rings meeting contrast budget).
**Out of scope:** any real feature content; PWA install logic (LAKE-056); dark mode (recommendation: ship with launch if cheap — decide in LAKE-059).

**Dependencies:** LAKE-001, LAKE-024. **Files:** `apps/web/app/[locale]/layout.tsx`, `components/shell/*`, `messages/de.json`, `messages/en.json`.

**Approach:** 1) layout with `next-intl` provider; 2) tab bar as a client component reading route; 3) language switch computing the alternate-locale URL (slug mapping hook, real slugs from LAKE-025); 4) tokens in Tailwind config.

**Domain rules:** none. **API changes:** none. **DB changes:** none.
**UI states:** navigation itself must render without any data (static); placeholder screens carry explicit "in development" copy in both locales.
**DE/EN:** all shell strings in catalogs; tab labels: Entdecken/Discover, Favoriten/Favorites, Mein Tag/My Day, Mehr/More.
**A11y:** tab bar as `nav` with `aria-current`; visible focus; touch targets ≥ 44 px; language switch announces the target language in its own language (`lang` attribute per option).
**Privacy/security:** locale persistence in localStorage only.

**Acceptance criteria:**

- [ ] Shell renders correctly at 360 px and ≥1024 px in both locales
- [ ] Language switch on any screen lands on the same screen in the other locale
- [ ] Keyboard-only navigation reaches every nav element with visible focus
- [ ] axe: zero violations on the shell

**Tests:** Unit: language-switch URL computation. Integration: none. E2E: shell navigation + language-switch smoke (both viewports).
**Manual validation:** mobile device (or emulation): tab navigation, focus order, screen-reader labels (VoiceOver/NVDA spot check).
**Commands:** `pnpm dev`, `pnpm test:e2e -g shell`.
**Rollback:** shell is self-contained; revert the PR.
