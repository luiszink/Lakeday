# LAKE-EPIC-003 — Tasks: Content administration

Epic: [LAKE-EPIC-003](../epics/LAKE-EPIC-003-content-administration.md). Global [definition of done](../../agents/definition-of-done.md) applies. Admin UI language is **English** (staff-facing); admin routes are `noindex` and CSRF-protected throughout.

---

## LAKE-013 — Admin area scaffolding

**Status:** done · **Phase:** MVP/M1 · **Parallel:** no (before other admin tickets)

**Objective:** The protected `/admin` route group: layout, navigation (Attractions, Review queue, Import, Registries, Reports), route-level auth guard wiring (guard logic from LAKE-014), and admin-specific error/empty patterns.

**User story:** As an editor, I want a coherent admin workspace so content work doesn't happen in database clients.

**Context:** [system-architecture.md](../../architecture/system-architecture.md#component-responsibilities), [auth-and-anonymous-usage.md](../../architecture/auth-and-anonymous-usage.md#admin-authentication).

**In scope:** `/admin` layout + nav; middleware returning 404 for unauthenticated page requests (except `/admin/login`); placeholder pages per section; `X-Robots-Tag: noindex` on all admin responses; exclusion from sitemaps (guard test).
**Out of scope:** actual auth (LAKE-014), section features (LAKE-015–017, 022).

**Dependencies:** LAKE-005. **Files:** `apps/web/app/admin/**`, middleware.

**Approach:** separate route group without public locale routing; server-side guard in layout; deny-by-default.

**Domain rules:** none. **API changes:** none. **DB changes:** none.
**UI states:** unauthenticated → 404; each placeholder states its pending ticket.
**DE/EN:** admin is English-only (decision, [i18n.md](../../architecture/i18n.md) — content it *edits* is bilingual).
**A11y:** keyboard + labels per DoD (pragmatic AA).
**Privacy/security:** 404 cloaking, noindex, no admin links from public UI.

**Acceptance criteria:**
- [ ] Unauthenticated requests to any `/admin` page (except login) return 404
- [ ] Admin pages send noindex headers; sitemap excludes `/admin` (test)
- [ ] Nav reaches all five sections; placeholders render

**Tests:** Integration: guard behaviour, headers. E2E: unauthenticated 404 smoke.
**Manual validation:** curl headers; navigate as authenticated user (after LAKE-014).
**Commands:** `pnpm test:e2e -g admin`. **Rollback:** revert; self-contained.

---

## LAKE-014 — Admin authentication

**Status:** done · **Phase:** MVP/M1 · **Parallel:** no (LAKE-013 successor)

**Objective:** Credentials + mandatory TOTP authentication with role-based access (EDITOR/REVIEWER/ADMIN), session management, brute-force protection, and the transactional-email provider decision for reset flows.

**User story:** As the operator, I want admin access to be phishing-resistant enough for a small team guarding the core asset.

**Context:** [auth-and-anonymous-usage.md#admin-authentication](../../architecture/auth-and-anonymous-usage.md#admin-authentication) (argon2id, TOTP mandatory, cookie policy, backoff); the library decision is recorded below; email provider decision (⚠️ EU region + DPA verified) is recorded in [external-services.md](../../architecture/external-services.md#transactional-email).

**In scope:** login (email+password+TOTP), TOTP enrolment on first login, session cookies (HTTP-only, SameSite=Strict, signed, 12 h absolute), role checks as server-side helpers (`requireRole('REVIEWER')`), per-account backoff + per-IP limits, login audit log, password reset via email, admin-user management page (ADMIN role; create/deactivate users, assign roles), seed admin from env.
**Out of scope:** SSO/passkeys (later idea), tourist accounts (phase 1.5).

**Dependencies:** LAKE-013, LAKE-006 (admin_user table). **Files:** `apps/web/app/admin/login/*`, `apps/web/src/auth/*`, `apps/web/app/admin/users/*`.

**Approach:** Decision: use a small in-repository Node/App-Router auth service instead of Auth.js/Lucia. The fixed staff scope needs only credentials, TOTP, signed absolute-expiry sessions, and server-side role checks; keeping these operations in the existing route/runtime boundary avoids a second session adapter and makes the Origin-based CSRF check explicit. Passwords use argon2id, TOTP uses otplib, QR enrolment uses qrcode, audit and rate-limit state use Postgres, and email is isolated behind the configured EU provider adapter.

**Domain rules:** role hierarchy EDITOR < REVIEWER < ADMIN.
**API changes:** auth endpoints under `/api/admin/auth/*`. **DB changes:** additive: recovery-code hashes, login_audit table.
**UI states:** login error states never reveal which factor failed; lockout state with retry-after.
**DE/EN:** English only. **A11y:** login form fully labelled, error association, no CAPTCHA (backoff instead).
**Privacy/security:** the core of this ticket — see context spec; secrets via env; CSRF on all mutations; audit log immutable.

**Acceptance criteria:**
- [ ] Login requires all three factors (email, password, TOTP); recovery codes work once each
- [ ] 5 failed attempts trigger backoff (test with clock control); audit rows written
- [ ] Role guard: EDITOR blocked from review-queue decisions and user management (403)
- [ ] Session expires at 12 h absolute; cookie flags verified

**Tests:** Unit: backoff logic, role hierarchy. Integration: full login flow, guard matrix. E2E: login + TOTP happy path (test secret).
**Manual validation:** enrol a real authenticator app against staging.
**Commands:** `pnpm test -g auth`. **Rollback:** feature-flag login enforcement during rollout on staging only; revert restores 404-everything.

---

## LAKE-015 — Attraction editor

**Status:** open · **Phase:** MVP/M1 · **Parallel:** yes after 014 (lane B)

**Objective:** Full attraction CRUD for editors: bilingual form sections for all editorial fields, draft lifecycle, publish action running `publishAttraction()` with violation display, and status management (draft/in-review/published/unpublished/archived).

**User story:** As an editor, I want to maintain every field of an attraction with inline validation so published records are complete and consistent by construction.

**Context:** [domain-model.md](../../architecture/domain-model.md#attraction-aggregate-root--stable-editorial-data) (fields), [information-architecture.md](../../ux/information-architecture.md#content-hierarchy-on-the-detail-page) (field grouping mirrors public order), F7 flow.

**In scope:** list view with status/search/region filters; editor form (sections: identity & location w/ map-pin picker + computed shoreline distance + scope verdict; classification; suitability; practical incl. opening rules editor + closures + prices; transport; media hook (LAKE-042); localizations DE/EN side-by-side); publish/unpublish with invariant results rendered as actionable list; audit trail of edits (as SourceRecords type `other`); admin API routes per [api-contracts.md](../../architecture/api-contracts.md#admin-api-apiadmin-session--role-guarded-noindex-csrf-protected).
**Out of scope:** review queue (LAKE-016), import (LAKE-022), image upload internals (LAKE-042), vocabulary editing (PR-based by governance).

**Dependencies:** LAKE-009, LAKE-014. **Files:** `apps/web/app/admin/attractions/**`, `apps/web/app/api/admin/attractions/*`.

**Approach:** zod-schema-driven forms (schemas from `packages/domain`); opening-rules sub-editor as structured rows (day set, times, holiday behaviour, validity window) — no free-text hours; scope verdict recomputed on coordinate change.

**Domain rules:** all writes through domain validation; publish only via `publishAttraction()`; editors can save invalid *drafts* (drafts are workspaces), never invalid published states.
**API changes:** admin attraction CRUD endpoints. **DB changes:** none (schema exists).
**UI states:** list loading/empty ("create your first attraction")/error; form dirty-state guard; publish-violation panel; save-conflict detection (updatedAt optimistic lock).
**DE/EN:** the *form* is English; localization fields explicitly labelled DE/EN with completeness indicators.
**A11y:** section landmarks, error association, keyboard-completable including the map-pin picker (coordinate inputs as fallback).
**Privacy/security:** REVIEWER role required for publish transition; EDITOR can draft; CSRF; input validation server-side.

**Acceptance criteria:**
- [ ] Create → edit → publish flow works on a fixture-grade record; violations block publish with actionable messages
- [ ] Opening rules editable structurally and round-trip through the hours engine correctly
- [ ] Coordinate change updates shoreline distance + scope verdict; out-of-scope save requires exception + justification
- [ ] Optimistic-lock conflict shows a merge-safe warning

**Tests:** Unit: form-schema edge cases. Integration: CRUD API incl. role matrix + publish invariants. E2E: create-and-publish happy path.
**Manual validation:** editor walkthrough creating a real-shaped record (e.g. a Meersburg-like fixture) in both localizations.
**Commands:** `pnpm test:e2e -g admin-editor`. **Rollback:** admin-only surface; revert safe.

---

## LAKE-016 — Review queue

**Status:** open · **Phase:** MVP/M3 · **Parallel:** yes (lane B)

**Objective:** The change-proposal review queue: impact-ordered listing, evidence-rich detail (field diff, source snippet, confidence, history), and approve/reject/edit decisions with full audit stamping.

**User story:** As a reviewer, I want to process uncertain changes quickly with the evidence in front of me so data quality scales beyond manual re-research.

**Context:** [refresh-and-review-pipeline.md#review-queue](../../data/refresh-and-review-pipeline.md#review-queue), F7 flow, `ChangeProposal` model.

**In scope:** queue list (filters: origin, fact class, attraction status; safety-first ordering); proposal detail with current→proposed diff rendering per fact type (hours diff as weekly grid, price as before/after, text as inline diff); decisions approve/reject/edit-then-approve; decision writes: fact update + provenance stamp + `reviewerDecision` + translation invalidation when textual; queue SLA metrics surfaced (age, depth); duplicate-merge review UI (side-by-side, uses LAKE-011 scores + `mergeHints`).
**Out of scope:** proposal *creation* (LAKE-019 import, LAKE-052/053 refresh, LAKE-041 reports feed it), notification emails (later).

**Dependencies:** LAKE-014, LAKE-009; realistic data via LAKE-010 fixtures (seeded proposals). **Files:** `apps/web/app/admin/review/**`, `apps/web/app/api/admin/review-queue/*`.

**Approach:** decision handler is a domain service (`applyProposalDecision`) reused by tests; merge protocol per [data-quality-strategy.md](../../quality/data-quality-strategy.md#duplicate-detection).

**Domain rules:** REVIEWER role; approval of textual DE change flips EN `translationState=STALE`; merge keeps older ID + alias row.
**API changes:** review-queue endpoints. **DB changes:** none.
**UI states:** empty queue (positive state — "all caught up"); stale proposal (superseded by newer) marked; decision-conflict (already decided) handled.
**DE/EN:** admin English; diffs render localized *content* faithfully.
**A11y:** diff colors paired with +/− symbols (no color-only); keyboard decision shortcuts documented.
**Privacy/security:** decisions audited immutably; no mass-approve endpoint (deliberate friction).

**Acceptance criteria:**
- [ ] Seeded proposals of each origin/class render with correct diff visualization and evidence links
- [ ] Approve updates the fact + provenance and flips translation state when applicable (verify chain)
- [ ] Reject records decision without touching the fact; superseded proposals auto-close
- [ ] Merge review: approving a duplicate merges per protocol and creates the alias

**Tests:** Unit: `applyProposalDecision` matrix. Integration: decision endpoints + chain effects. E2E: review one proposal end-to-end.
**Manual validation:** process 5 seeded proposals; check provenance rows.
**Commands:** `pnpm test -g review`. **Rollback:** decisions are auditable; wrong decisions corrected via new proposals — no destructive rollback needed.

---

## LAKE-017 — Source and licence registry

**Status:** open · **Phase:** MVP/M3 · **Parallel:** yes (lane B)

**Objective:** Admin registries for data sources (origins, type, licence, cadence, health, approval) and licences (terms, attribution, permissions evidence), plus the public licences/attribution page generated from the registry.

**User story:** As the operator, I want every source and licence machine-recorded so attribution is complete, verifiable, and testable — not tribal knowledge.

**Context:** [data-source-policy.md#source-registry](../../data/data-source-policy.md#source-registry), [provenance-and-licensing.md#licence-registry](../../data/provenance-and-licensing.md#licence-registry).

**In scope:** CRUD for source origins (ADMIN approval for new source classes) and licences; health status display (fed by LAKE-052+); public page `/{locale}/licences` generated from registry (OSM, tile provider, weather, image licences, data sources) — bilingual; attribution completeness test (every image/source licence referenced exists and renders).
**Out of scope:** automated licence verification (manual ⚠️ process by policy), image upload (LAKE-042).

**Dependencies:** LAKE-014, LAKE-006. **Files:** `apps/web/app/admin/registries/**`, `apps/web/app/[locale]/licences/page.tsx`.

**Approach:** registry rows drive both admin views and the public page from one query; seed the known baseline rows (OSM ODbL, Open-Meteo CC BY, geometry attribution from LAKE-007).

**Domain rules:** new source class requires ADMIN approval flag before the import/refresh pipelines accept it.
**API changes:** registry endpoints. **DB changes:** none (tables exist).
**UI states:** public page renders even with minimal registry (baseline rows).
**DE/EN:** public licences page bilingual; legal names untranslated.
**A11y:** plain document structure.
**Privacy/security:** permission evidence may contain contact data → admin-only visibility, public page shows attribution text only.

**Acceptance criteria:**
- [ ] Public licences page lists OSM, tiles, weather, and geometry attributions in both locales
- [ ] Import/refresh reject origins lacking approval (integration test with LAKE-019 once merged, else contract test)
- [ ] Attribution completeness test passes against fixtures

**Tests:** Unit: none significant. Integration: approval gate, page generation. E2E: public page renders bilingually.
**Manual validation:** compare rendered attributions against provider requirements (⚠️ wording check).
**Commands:** `pnpm test -g registry`. **Rollback:** additive; revert safe.
