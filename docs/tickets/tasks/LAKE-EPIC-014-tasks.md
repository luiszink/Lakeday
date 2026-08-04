# LAKE-EPIC-014 — Tasks: PWA

Epic: [LAKE-EPIC-014](../epics/LAKE-EPIC-014-pwa.md). Global [definition of done](../../agents/definition-of-done.md) applies.

---

## LAKE-056 — Manifest and service worker

**Status:** open · **Phase:** MVP/M6 · **Parallel:** yes

**Objective:** REQ-PWA-01/02/04: web app manifest, service worker with the documented caching strategy, update flow, and the non-intrusive install hint (SW tooling decision made here).

**User story:** As a returning visitor, I want the app on my home screen starting instantly so it feels like my trip companion, not a website.

**Context:** [pwa-strategy.md](../../architecture/pwa-strategy.md) (strategy binding; tooling serwist-vs-workbox decided and recorded here; REQ-PWA-04 satisfied by verifying the native-gates section is complete and linked).

**In scope:** manifest (localized name/short_name via locale start URLs, maskable icons set, theme colors, display standalone); SW: precache app shell, runtime SWR caching for API/detail/list responses, update-on-navigation with "new version — reload" toast; install hint in More after second session (localStorage counter; never blocking; iOS manual-instructions page); PWA install analytics event slot; Lighthouse PWA checks green.
**Out of scope:** offline UX depth (LAKE-057), push (none in MVP).

**Dependencies:** LAKE-005 (shell), core surfaces stable. **Files:** manifest, SW config, `components/pwa/{install-hint,update-toast}.tsx`, icons.

**Domain rules:** none. **API changes:** none. **DB changes:** none.
**UI states:** update toast; install hint dismissible permanently.
**DE/EN:** manifest names + all prompts localized.
**A11y:** toast announced, keyboard-dismissable, not auto-focus-stealing; install instructions readable structure.
**Privacy/security:** SW scope limited to public app (never caches `/admin`); no background sync in MVP.

**Acceptance criteria:**
- [ ] Installable on Android (prompt) and iOS (instructions page); standalone launch works
- [ ] Update flow: deploy → toast on next navigation → reload gets new version (staging test)
- [ ] `/admin` never cached (test); Lighthouse PWA category passes
- [ ] Native-gates doc section verified current and linked from More/about (REQ-PWA-04)

**Tests:** E2E: SW registration, update toast (Playwright SW support), admin-cache exclusion. Unit: session counter.
**Manual validation:** install on real Android + iOS devices; offline launch of shell.
**Commands:** `pnpm test:e2e -g pwa`, Lighthouse run.
**Rollback:** SW kill-switch (self-unregistering SW deploy) documented in the ticket PR — mandatory rollback artifact.

---

## LAKE-057 — Offline behaviour

**Status:** open · **Phase:** MVP/M6 · **Parallel:** no (after 056)

**Objective:** REQ-PWA-03: honest offline UX — global banner, cached-content marking, tile-cache cap, action failure handling, and offline e2e coverage.

**User story:** As a visitor on the ferry with no signal, I want my favorites, plan, and recently viewed attractions readable — and clarity about what is unavailable.

**Context:** [pwa-strategy.md](../../architecture/pwa-strategy.md#scope-of-pwa-in-the-mvp-req-pwa-0103) (offline matrix binding).

**In scope:** connectivity detection + global offline banner; cached list/detail marked "possibly outdated — offline"; favorites/plan fully functional offline (verify — built local-first); network-requiring actions (share, report, geocode, search beyond cache) fail visibly with retry, no silent queues; map tile LRU cache cap (~50 MB) via SW routing; offline fallback page for uncached routes (with links to cached content); iOS storage-eviction resilience verified (IndexedDB persists when caches evicted).
**Out of scope:** full offline map/dataset (excluded by product decision), background sync.

**Dependencies:** LAKE-056, LAKE-043/045 (local features), LAKE-035 (map fallback integration). **Files:** SW routing config, offline banner/fallback components.

**Domain rules:** cached content honesty rule (marking mandatory).
**API changes:** none. **DB changes:** none.
**UI states:** the offline states across all surfaces — this ticket owns the "error/offline" quadrant globally.
**DE/EN:** all offline messaging localized.
**A11y:** banner announced on state change; fallback page navigable.
**Privacy/security:** cache respects no-store on any sensitive route (admin already excluded).

**Acceptance criteria:**
- [ ] Offline e2e: visited detail readable + marked; unvisited route → fallback page; favorites/plan operable; share fails honestly with retry succeeding on reconnect
- [ ] Tile cache stays under cap after extended map browsing (test harness)
- [ ] Reconnection clears banners and refreshes stale views (SWR revalidate)

**Tests:** E2E offline suite (Playwright offline mode) — the [testing-strategy](../../quality/testing-strategy.md) offline scenarios. Unit: LRU logic if custom.
**Manual validation:** airplane-mode walk-through on device (the ferry test).
**Commands:** `pnpm test:e2e -g offline`.
**Rollback:** SW kill-switch from LAKE-056.
