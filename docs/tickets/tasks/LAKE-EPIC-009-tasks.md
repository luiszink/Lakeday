# LAKE-EPIC-009 — Tasks: Attraction details

Epic: [LAKE-EPIC-009](../epics/LAKE-EPIC-009-attraction-details.md). Global [definition of done](../../agents/definition-of-done.md) applies.

---

## LAKE-040 — Detail API and page

**Status:** open · **Phase:** MVP/M2 · **Parallel:** no (core lane-A ticket)

**Objective:** REQ-DISC-03/11: the attraction detail endpoint and page rendering all published fields in the decision-priority hierarchy, with official links and nearby attractions.

**User story:** As Herr Schneider (P5), I want every practical fact — accessibility, hours, prices, arrival — on one page so I can decide without opening five municipal sites.

**Context:** [information-architecture.md#content-hierarchy](../../ux/information-architecture.md#content-hierarchy-on-the-detail-page) (order is binding), [api-contracts.md](../../architecture/api-contracts.md#get-apiattractionsidorslug--detail).

**In scope:** `GET /api/attractions/{idOrSlug}` (full published projection: localized texts, suitability, practical incl. structured hours + evaluated day summary for `?date=`, prices with currency, transport/parking/bicycle, images with attribution, official/booking links, per-fact freshness array, nearby cards, alias 301 hint); server-rendered page (ISR) with the 9-block hierarchy; decision block (open state ▸ price ▸ duration ▸ distance); opening-hours weekly rendering with holiday notes; UNKNOWN fields rendered as "not verified" (never hidden, never guessed); add-to-favorites/plan slots (wired by LAKE-043/045); outbound links `rel="noopener"` with click-event slot.
**Out of scope:** freshness badges + report flow (LAKE-041), image pipeline (LAKE-042), JSON-LD (LAKE-060).

**Dependencies:** LAKE-028, LAKE-025 (slugs), LAKE-012. **Files:** detail route + page, `components/detail/**`.

**Domain rules:** 404 for non-published (no draft leakage); merged alias redirects; UNKNOWN presentation rule.
**API changes:** detail endpoint. **DB changes:** none.
**UI states:** loading skeleton; 404 (friendly, search CTA); partial data (missing optional sections collapse cleanly); stale slots ready for 041.
**DE/EN:** entire page from localization rows + catalogs; currency displayed natively (CHF fixture case).
**A11y:** landmark structure; hours table with proper headers; suitability icons paired with text; skip-to-practical-facts link; images with editorial alt.
**Privacy/security:** no referrer leakage beyond `strict-origin-when-cross-origin`; draft-leak test.

**Acceptance criteria:**
- [ ] All fixture field variations render per hierarchy at 360 px in both locales; UNKNOWNs shown honestly
- [ ] `?date=` evaluates hours for that date incl. holiday case; decision block correct
- [ ] Draft/archived → 404; alias → 301; official links open correctly
- [ ] axe clean; view-source shows server-rendered content

**Tests:** Integration: projection completeness, 404/301 matrix. E2E: detail from list, both locales. Visual: full-page screenshots (DE/EN, wheelchair fixture).
**Manual validation:** read a CHF fixture page end-to-end as P2 would.
**Commands:** `pnpm test:e2e -g detail`. **Rollback:** page/endpoint revert; no data.

---

## LAKE-041 — Freshness display and issue reports

**Status:** open · **Phase:** MVP/M4 · **Parallel:** yes (after 040)

**Objective:** REQ-DISC-10 + REQ-REP-01: per-fact freshness rendering ("verified {date}", stale warnings) and the anonymous incorrect-information report flow feeding the review queue.

**User story:** As a visitor, I want to know how current the opening hours are — and a way to flag them when reality disagrees.

**Context:** [refresh-and-review-pipeline.md#staleness-presentation](../../data/refresh-and-review-pipeline.md#staleness-presentation-req-data-07) (badge thresholds — full activation with LAKE-055's status computation; render layer built here), [core-user-flows.md F6](../../ux/core-user-flows.md#f6-report-incorrect-information).

**In scope:** freshness block on detail (per-fact "last verified" with quiet/warning levels from provenance data); `POST /api/reports` (category enum, optional message ≤1000 chars, locale; zod; honeypot; rate limit 5/h/IP; no PII fields); report UI (sheet from detail; category picker; success state; abuse-safe failure states); reports → `UserReport` rows → admin triage list (LAKE-016 integration point — triage-to-proposal wiring in LAKE-053); analytics event slot.
**Out of scope:** refresh pipeline itself (epic 13), email notifications.

**Dependencies:** LAKE-040, LAKE-016 (triage surface). **Files:** report endpoint, `components/detail/freshness.tsx`, `components/report/**`, admin reports page.

**Domain rules:** report categories per [domain-model.md#userreport](../../architecture/domain-model.md#userreport); reports never mutate content directly.
**API changes:** reports endpoint. **DB changes:** none.
**UI states:** report sending/sent/failed(retry)/rate-limited (honest "try later"); freshness levels quiet/warning per thresholds.
**DE/EN:** report form + freshness strings localized; message free-text accepted in any language.
**A11y:** sheet focus management; category radio group labelled; success announced.
**Privacy/security:** the form requests no personal data (explicit note); honeypot + rate limit; message stored as-is flagged for triage-time PII scan (⚠️ process note); IP not stored with the report.

**Acceptance criteria:**
- [ ] Freshness renders correct levels from fixture provenance ages
- [ ] Report round-trip: submit → row → visible in admin triage; rate limit enforced
- [ ] No PII solicited or stored (schema proof); honeypot silently drops bots

**Tests:** Integration: endpoint validation/rate-limit/persistence. E2E: F6 flow. Unit: threshold-level mapping.
**Manual validation:** submit real reports on staging in both locales.
**Commands:** `pnpm test -g reports`. **Rollback:** report feature flag-off leaves detail intact.

---

## LAKE-042 — Image pipeline

**Status:** open · **Phase:** MVP/M2–M4 · **Parallel:** yes

**Objective:** Licensed attraction images end-to-end: admin upload with mandatory licence/attribution metadata, storage + responsive optimization, attribution rendering, and category placeholders.

**User story:** As an editor, I want image handling that makes licence violations structurally impossible — no metadata, no image.

**Context:** [provenance-and-licensing.md#images](../../data/provenance-and-licensing.md#images) (rules are binding), OQ-9 (storage default: S3-compatible object storage — decided here).

**In scope:** storage adapter (S3-compatible; env-configured); admin upload in the attraction editor (multi-image, sort order, per-image: licence from registry, attribution text, source URL, localized alt texts — all required); Next.js image optimization (responsive sizes, lazy); attribution rendering on hero + gallery (visible caption/expandable credit per licence requirement); category placeholder set (styled graphics, no licence burden) used when zero images; licences page integration (LAKE-017) listing image licences.
**Out of scope:** bulk import of images (research provides URLs/permissions, editors upload), AI-generated imagery (prohibited by policy).

**Dependencies:** LAKE-015, LAKE-017. **Files:** storage adapter, upload UI in editor, `components/detail/gallery.tsx`, placeholder assets.

**Domain rules:** publish invariant unaffected (images optional); but image-without-licence unsaveable (schema).
**API changes:** admin upload endpoints. **DB changes:** none (`attraction_image` exists).
**UI states:** upload progress/failure; gallery loading (LQIP or dominant color); zero-image placeholder.
**DE/EN:** alt texts localized (both required on upload); attribution text as legally required (untranslated).
**A11y:** meaningful alt required at upload (validation); gallery keyboard navigable; attribution readable contrast.
**Privacy/security:** upload restricted to editor roles; EXIF stripped (location metadata!) on ingest; file-type allow-list + size caps; storage bucket private with signed/proxied delivery.

**Acceptance criteria:**
- [ ] Upload without licence/attribution/alt fails validation; complete upload renders responsively with attribution
- [ ] EXIF (incl. GPS) stripped — verified by test asset
- [ ] Zero-image attraction shows category placeholder everywhere (card, detail, OG later)
- [ ] Licences page lists image licences from the registry

**Tests:** Integration: upload validation, EXIF strip, storage adapter with fake. E2E: editor upload → public rendering. Unit: none significant.
**Manual validation:** upload a CC BY test image; verify credit rendering against licence wording (⚠️ pattern check).
**Commands:** `pnpm test -g images`. **Rollback:** placeholders carry the UI; feature-flag uploads.
