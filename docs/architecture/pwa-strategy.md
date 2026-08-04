# PWA strategy

Status: **architectural decision** ([ADR-002](../adr/ADR-002-pwa-before-native.md)): responsive PWA first; no native apps in MVP.

## Scope of "PWA" in the MVP (REQ-PWA-01…03)

| Capability | MVP behaviour |
|---|---|
| Responsive design | Mobile-first layouts; breakpoints ≥1024 px for split map/list |
| Installability | Web app manifest (localized name/description per start URL locale), maskable icons, install hint after second session (never a blocking prompt) |
| Offline: app shell | Precached by service worker (framework pages, fonts, core CSS/JS) |
| Offline: visited content | Runtime cache (stale-while-revalidate) for visited attraction details, list responses, and map tiles — short offline gaps (train, ferry, border dead zones) keep recently seen content usable |
| Offline: local data | Favorites and the current plan live in IndexedDB — fully offline-capable by construction |
| Offline: honesty | Global offline banner; cached content marked "possibly outdated"; actions needing the network (share, report, geocode) queue nothing in MVP — they fail visibly with retry |
| NOT offline | Full lake map download, full dataset download — explicitly excluded ([../product/later-phases.md](../product/later-phases.md)); tile cache capped (~50 MB LRU) |

Service-worker tooling: `serwist` (Workbox successor for Next.js) or Workbox directly — decided in ticket LAKE-056 after checking Next.js-version compatibility.

Update flow: SW updates on navigation with a "New version available – reload" toast (no silent mid-session swaps, avoids stale-code bugs).

## Performance budget {#performance-budget}

Enforced by Lighthouse CI on PRs ([../operations/deployment.md](../operations/deployment.md#ci-pipeline)):

| Metric (mid-range Android, 4G) | Budget |
|---|---|
| LCP list view | < 2.5 s |
| First map render | < 4 s (map bundle lazy-loaded) |
| JS initial route | < 200 KB gzip (excl. lazy map bundle) |
| CLS | < 0.1 |
| TBT | < 300 ms |

## iOS-specific constraints (accepted risks)

Safari PWA limitations: ~50 MB opaque cache eviction under pressure, no install prompt (manual "Add to Home Screen"), Web Push only from iOS 16.4+ with install. Consequences: favorites/plans must survive cache eviction (IndexedDB does), install instructions page for iOS in More tab, no MVP feature depends on push.

## Native app gates {#native-app-gates}

Native iOS/Android apps are justified only when **measured** conditions are met — Gate G3 in [../product/success-metrics.md](../product/success-metrics.md#g3--build-native-applications). Capability triggers that would independently reopen the decision:

1. A required feature is impossible/unreliable in PWA on target devices (e.g. reliable background geofencing for near-attraction hints, offline packs beyond browser storage limits).
2. iOS Web Push proves insufficient for a shipped phase-1.5 events feature (opt-in intent > 20 % but delivery failing).
3. App-store presence becomes a measurably needed acquisition channel (partner/B2B requirement, ≥ 50k MAD).

If gates trigger: the API-first architecture ([api-contracts.md](api-contracts.md)) means a native client consumes existing contracts; no server rewrite. Document the decision as a new ADR before starting.
