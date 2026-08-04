# LAKE-EPIC-005 — Tasks: Bilingual content

Epic: [LAKE-EPIC-005](../epics/LAKE-EPIC-005-bilingual-content.md). Global [definition of done](../../agents/definition-of-done.md) applies.

---

## LAKE-024 — i18n foundation

**Status:** open · **Phase:** MVP/M1 · **Parallel:** no (shared foundation; LAKE-005 depends on it)

**Objective:** next-intl setup with `/de` + `/en` routing, typed message catalogs, locale negotiation/persistence, and the CI completeness check.

**User story:** As an English-speaking visitor, I want the entire UI in English from my first visit, negotiated automatically and switchable permanently.

**Context:** [i18n.md](../../architecture/i18n.md), [ADR-008](../../adr/ADR-008-i18n-from-start.md).

**In scope:** next-intl App-Router integration; middleware negotiation (`Accept-Language`, then persisted choice wins); `messages/de.json` + `messages/en.json` with typed keys; formatting helpers (dates 24 h/locale-aware, `Intl.NumberFormat` currency with ISO code, metric distances); CI script failing on missing/extra keys; lint rule against literal JSX strings.
**Out of scope:** localized slugs (LAKE-025), content translation states (LAKE-026).

**Dependencies:** LAKE-001. **Files:** `apps/web/src/i18n/*`, `apps/web/messages/*`, middleware, CI step.

**Approach:** per next-intl docs; catalog completeness as a small script comparing key trees.

**Domain rules:** none. **API changes:** none (locale param handling documented). **DB changes:** none.
**UI states:** missing-key fallback shows the key in dev, DE string in prod (never blank), with error-tracker event.
**DE/EN:** this ticket *is* DE/EN. **A11y:** `lang` attribute correct per page; switcher labels in target language.
**Privacy/security:** locale persisted in localStorage only, no cookie (consent stance).

**Acceptance criteria:**
- [ ] `/` negotiates locale and redirects; explicit choice survives revisits
- [ ] CI fails on a missing key (prove once); lint fails on literal strings
- [ ] Currency helper renders `12,50 €` (de) / `€12.50` (en) / `CHF 15.00` correctly in both locales

**Tests:** Unit: negotiation logic, formatting helpers. E2E: negotiation + switch persistence.
**Manual validation:** browser with `Accept-Language: en-IE` lands on `/en`.
**Commands:** `pnpm test -g i18n`, `pnpm i18n:check`.
**Rollback:** foundational; revert with LAKE-005.

---

## LAKE-025 — Localized slugs, redirects, hreflang

**Status:** open · **Phase:** MVP/M2 · **Parallel:** yes (lane A adjacent)

**Objective:** Localized attraction slugs with stability guarantees, redirect handling for renames/merges, localized route segments, and hreflang alternates.

**Context:** [information-architecture.md#url-structure](../../ux/information-architecture.md#url-structure-decision), OQ-12 (localized segments — default confirmed here unless overturned).

**In scope:** slug generation (from localized name; collision suffixing; stable after publish); slug-history table → 301 redirects; alias redirects for merged attractions (LAKE-011 protocol); localized segments (`/de/orte/…`, `/en/places/…`); `hreflang` (`de`, `en`, `x-default`) on all public pages; language switch mapping slugs across locales.
**Out of scope:** sitemaps (LAKE-061), detail page itself (LAKE-040).

**Dependencies:** LAKE-024, LAKE-006. **Files:** `packages/domain/src/slug.ts`, slug-history migration (additive), routing config, `apps/web/src/i18n/slug-map.ts`.

**Domain rules:** slugs unique per locale; regeneration only pre-publication; post-publication rename = new slug + 301 history row.
**API changes:** detail endpoint accepts id or current-or-historic slug. **DB changes:** `slug_history` (additive).
**UI states:** historic slug → 301; unknown slug → localized 404 with search CTA.
**DE/EN:** umlaut transliteration (`ü`→`ue`) per German convention; EN slugs from EN names.
**A11y:** n/a. **Privacy/security:** no user data.

**Acceptance criteria:**
- [ ] Fixture slugs generate per convention (`insel-mainau` / `mainau-island`); collisions suffixed deterministically
- [ ] Rename after publish 301s from the old slug; merge alias 301s to the survivor
- [ ] Every public page emits correct hreflang triple; switch lands on the translated slug

**Tests:** Unit: generation/transliteration/collision. Integration: redirect chains. E2E: language switch on a detail page.
**Manual validation:** curl redirect chains.
**Commands:** `pnpm test -g slug`. **Rollback:** additive; keep history table on revert.

---

## LAKE-026 — Translation state machine

**Status:** open · **Phase:** MVP/M1 · **Parallel:** yes (lane B adjacent)

**Objective:** Implement `translationState` (SOURCE/TRANSLATED/NEEDS_REVIEW/STALE) with automatic invalidation on source-text change and the admin translation work queue.

**Context:** [i18n.md#translation-invalidation](../../architecture/i18n.md#translation-invalidation), [domain-model.md#attractionlocalization](../../architecture/domain-model.md#attractionlocalization).

**In scope:** state transitions as domain functions; invalidation triggered by editor saves (LAKE-015 hooks) and approved textual proposals (LAKE-016 hooks); publish invariant already blocks STALE (LAKE-009 — verify integration); admin work-queue view (localizations needing attention, sorted by published-first); manual state transitions for editors (mark reviewed).
**Out of scope:** machine-translation integration (research pipeline owns translation), notification emails.

**Dependencies:** LAKE-009, LAKE-015 (hooks land where the editor exists — coordinate; may merge as follow-up wiring PR). **Files:** `packages/domain/src/i18n/translation-state.ts`, admin queue page, hook wiring.

**Domain rules:** DE edit ⇒ EN STALE (and vice versa if EN were source); STALE blocks (re-)publication of affected texts, not the whole attraction record's other fields.
**API changes:** work-queue endpoint. **DB changes:** none (field exists).
**UI states:** queue empty = positive; stale item shows the source diff since last translation.
**DE/EN:** the feature manages both; admin UI English.
**A11y:** queue table semantics. **Privacy/security:** editor-role gated.

**Acceptance criteria:**
- [ ] Editing a published DE summary flips EN to STALE and appears in the queue with diff
- [ ] Publishing with a STALE localization fails the invariant (integration proof)
- [ ] Marking reviewed transitions state and clears the queue entry

**Tests:** Unit: transition matrix. Integration: hook chain editor-save→state→queue.
**Manual validation:** walkthrough in admin.
**Commands:** `pnpm test -g translation-state`. **Rollback:** states are data; revert logic safely.

---

## LAKE-027 — Static guide pages

**Status:** open · **Phase:** MVP/M2 · **Parallel:** yes

**Objective:** Four bilingual static guides answering international-visitor needs: "Getting around" (transit, ferries, no-car), "Money & borders" (EUR/CHF, cards, crossings), "Sundays & holidays", "Guest cards" — plus About/Legal page shells.

**User story:** As Claire (P2), I want the practical basics explained in English before my trip so the region isn't confusing on arrival.

**Context:** [personas-and-user-journeys.md#international-visitor-information-needs](../../product/personas-and-user-journeys.md#international-visitor-information-needs-confirmed-requirement); border/legal content flagged ⚠️ for review (LAKE-068 verifies).

**In scope:** MDX-or-similar content structure under `/{locale}/guides/{slug}`; the four guides written in DE **and** EN (original content, factual, sourced where specific — e.g. ferry operators linked officially); guides index page; legal page shells (impressum/privacy placeholders clearly marked "draft pending legal review" and noindexed until LAKE-068).
**Out of scope:** final legal texts (LAKE-068), guest-card structured data (OQ-6/phase 1.5), CMS for guides (files in repo are fine).

**Dependencies:** LAKE-005, LAKE-024. **Files:** `apps/web/content/guides/*.{de,en}.mdx`, guide route.

**UI states:** static content — loading trivial; 404 for unknown slug.
**DE/EN:** full parity required; EN is not a translation afterthought — write for the international reader (glossing per [translation prompt](../../research/prompts/translation.md) rules).
**A11y:** heading hierarchy, plain language (B1), tables for currency/holiday facts with headers.
**Privacy/security:** no scripts/embeds in guide content; legal placeholders noindex.

**Acceptance criteria:**
- [ ] Four guides render bilingually with parity of substance; hreflang correct
- [ ] Content passes review checklist (no district-based scope language; borders/currency facts sourced)
- [ ] Legal shells render with visible draft banner and noindex

**Tests:** E2E: guides render both locales; snapshot of index. Unit: none.
**Manual validation:** bilingual read-through; fact spot-check against official transit/customs sources.
**Commands:** `pnpm test:e2e -g guides`. **Rollback:** content-only.
