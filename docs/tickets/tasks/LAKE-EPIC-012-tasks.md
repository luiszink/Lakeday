# LAKE-EPIC-012 — Tasks: Sharing

Epic: [LAKE-EPIC-012](../epics/LAKE-EPIC-012-sharing.md). Global [definition of done](../../agents/definition-of-done.md) applies. Order: 048 → 049/050 (parallel).

---

## LAKE-048 — Plan share API

**Status:** done · **Phase:** MVP/M4 · **Parallel:** no

**Objective:** REQ-PLAN-08/09 + REQ-SEC-02: `POST /api/plans` creating immutable server snapshots behind ≥128-bit tokens, with validation, rate limiting, retention, and `GET /api/plans/{token}` with server-side revalidation.

**User story:** As a planner, I want a link that shows my plan to anyone — without either of us having an account.

**Context:** [api-contracts.md#plans](../../architecture/api-contracts.md#plans), [auth-and-anonymous-usage.md#share-tokens](../../architecture/auth-and-anonymous-usage.md#share-tokens), [favorites-and-plans.md#shared-plans](../../ux/favorites-and-plans.md#shared-plans).

**In scope:** POST (zod validation: ≤20 stops, published attraction IDs verified, start point pre-rounded — server re-rounds defensively, label length-capped 80 chars; token `crypto.randomBytes(16)` base64url; returns token+URL); GET (constant-time lookup, 404 on miss, bumps `lastAccessedAt`, recomputes validation via LAKE-046 against **current** data, resolves current attraction cards); re-share = new snapshot; rate limits (POST 10/h/IP, GET 60/h/IP) + payload cap 32 KB; retention job function (12-month idle deletion — scheduled via LAKE-051; function + test here); share button in My Day wiring (loading/success-with-copy-link/failure states).
**Out of scope:** shared-plan page (049), plan editing via API (immutable by design).

**Dependencies:** LAKE-046/047. **Files:** `apps/web/app/api/plans/*`, share-button component, retention function in `packages/db`.

**Domain rules:** snapshots immutable; validation always recomputed (plans never freeze facts); unpublished stops at read time render as unavailable entries, not errors.
**API changes:** both endpoints. **DB changes:** none (tables exist). **Migration:** none.
**UI states (share button):** creating / created (copy-to-clipboard + native share sheet where available) / failed (retry, plan stays local) / rate-limited (honest message).
**DE/EN:** share URL locale-prefixed by creator's locale (recipient can switch); button strings localized.
**A11y:** share dialog focus management; copy confirmation announced.
**Privacy/security:** token entropy test; no enumeration; start-point rounding server-verified; label sanitized (length + control chars); `X-Robots-Tag: noindex` on GET; logs scrub tokens; rate limits tested; documented retention.

**Acceptance criteria:**
- [ ] Round-trip: share → GET returns snapshot with recomputed validation; unknown token → 404
- [ ] Server rejects >20 stops, unpublished IDs, unrounded coords (re-rounds), oversized payloads
- [ ] Re-share creates a new token; old link unchanged; retention function deletes idle fixtures
- [ ] Rate limits + token entropy verified by tests

**Tests:** Unit: token gen, rounding. Integration: full endpoint matrix incl. abuse cases. E2E: share-button flow (049 completes the journey).
**Manual validation:** share from staging to a second device.
**Commands:** `pnpm test -g plan-share`. **Rollback:** endpoints removable; local plans unaffected; existing tokens 404 gracefully.

---

## LAKE-049 — Shared plan view and copy

**Status:** done · **Phase:** MVP/M4 · **Parallel:** yes (after 048)

**Objective:** REQ-PLAN-09 (consumption side): the read-only `/{locale}/plan/{token}` page with current-data validation display, map overview, and "Copy to My Day".

**User story:** As the grandparents receiving the link (J6), we want to see tomorrow's plan in our language and — if we join — copy it into our own device.

**Context:** [core-user-flows.md F4](../../ux/core-user-flows.md#f4-open-a-shared-plan).

**In scope:** shared-plan page (stops in order with cards + arrival estimates, date, start label, conflicts as recomputed, static map overview of stops — provider abstraction, list fallback); locale switch on the page (content re-renders, token stable); "Copy to My Day" (clones stops+date+start into local store; if a local plan exists → replace/merge choice dialog); invalid/expired token → friendly localized 404 with Discover CTA; noindex verified.
**Out of scope:** editing shared plans (immutable), commenting (no social features).

**Dependencies:** LAKE-048, LAKE-045 (local store), LAKE-032 (map abstraction). **Files:** shared-plan route + components.

**Domain rules:** view is read-only; copy creates an independent local plan.
**API changes:** none. **DB changes:** none.
**UI states:** loading; 404; stale/changed data notes from recomputed validation ("this attraction is currently closed on the planned date"); unavailable (unpublished) stops rendered honestly; map fallback.
**DE/EN:** full page localized; recipient locale independent of creator's.
**A11y:** document structure; conflicts associated; copy dialog focus-managed.
**Privacy/security:** token treated as capability (no logging); page noindexed; no creator information displayed beyond the plan content itself.

**Acceptance criteria:**
- [ ] F4 e2e: open link → view in other locale → copy → edit local copy independently
- [ ] Post-share data changes reflect on the shared view (unpublish fixture case)
- [ ] Replace/merge dialog behaves correctly with an existing local plan
- [ ] 404 friendly; noindex header present

**Tests:** E2E: F4 both locales incl. unpublish scenario. Integration: none new. Unit: merge/replace logic.
**Manual validation:** cross-device open + copy.
**Commands:** `pnpm test:e2e -g shared-plan`. **Rollback:** page revert; API stands alone.

---

## LAKE-050 — Print and export

**Status:** open · **Phase:** MVP/M4 · **Parallel:** yes (after 047; independent of 048/049 for local plans)

**Objective:** REQ-PLAN-10: print stylesheet producing a usable one-page day sheet (browser print-to-PDF as export), for local and shared plans.

**User story:** As a visitor wary of dead batteries, I want the plan on paper: stops, times, addresses, hours, URLs.

**Context:** [favorites-and-plans.md#print--export](../../ux/favorites-and-plans.md#print--export-req-plan-10).

**In scope:** print stylesheet for My Day + shared-plan pages (plan date, ordered stops with name, municipality, planned arrival, visit duration, that-date opening hours, address, official URL as visible text); static overview map image via abstraction (graceful stop-list-only fallback); print button (window.print) with print-preview-safe layout; page-break control for long plans; no-color-dependence in print (B/W friendly).
**Out of scope:** server-side PDF generation (deliberately not built), calendar export (later idea).

**Dependencies:** LAKE-047 (049 for shared variant). **Files:** print styles, print button, static-map component.

**Domain rules:** printed hours are for the chosen date, labelled with the print timestamp ("Stand: {date}") — honesty on paper too.
**API changes:** none. **DB changes:** none.
**UI states:** print of empty plan disabled with hint; static-map-unavailable fallback automatic.
**DE/EN:** printed output fully localized (the version printed is the current locale's).
**A11y:** print button labelled; on-screen preview accessible (print CSS doesn't affect screen a11y).
**Privacy/security:** printed start point shows the user's own label (their choice), nothing else.

**Acceptance criteria:**
- [ ] Print preview (Chromium + Firefox) renders the complete one-pager for a 4-stop fixture plan in both locales
- [ ] URLs visible as text; hours match the chosen date; timestamp present
- [ ] Map absent → clean list-only layout; long plan breaks pages sensibly

**Tests:** E2E: print-media emulation screenshot assertions. Unit: none.
**Manual validation:** actually print one (or PDF) from a device.
**Commands:** `pnpm test:e2e -g print`. **Rollback:** stylesheet revert.
