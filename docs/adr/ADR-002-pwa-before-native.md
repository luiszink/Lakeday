# ADR-002: PWA before native apps

**Status:** Accepted · 2026-08 · **Deciders:** product owner + architecture

## Context

Tourists need the product on their phones, spontaneously, often on foreign SIMs — but the MVP's job is validating discovery + planning value, not maximizing device integration. Native apps double or triple frontend cost, add store-review latency to every iteration, and create an install barrier exactly where acquisition needs to be frictionless (a visitor googling "was tun in Meersburg" will not install an app first). The required MVP capabilities — geolocation, maps, local storage, installability, decent offline behaviour — are all available to a modern PWA; the notable platform risks are iOS storage eviction and weaker push support, neither of which the MVP depends on.

## Decision

Ship the MVP as a **responsive, installable Progressive Web App** ([../architecture/pwa-strategy.md](../architecture/pwa-strategy.md)). No native iOS/Android development in the MVP. Native apps are reconsidered only against the **measurable Gate G3** ([../product/success-metrics.md](../product/success-metrics.md#g3--build-native-applications)) or a hard capability blocker, documented in a superseding ADR.

## Alternatives considered

- **Native-first (Swift/Kotlin)** — rejected: 2–3× frontend effort, kills SEO acquisition (attraction pages must rank), slows iteration during the phase where learning speed matters most.
- **Cross-platform (React Native/Flutter/Capacitor) alongside web** — rejected for MVP: still a second codebase/build/review pipeline; Capacitor-wrapping the PWA later remains a cheap escape hatch precisely *because* we build web-first.
- **Responsive site without PWA features** — rejected: manifest + service worker are low-cost and directly serve the trip context (flaky connectivity, home-screen access).

## Consequences

- One codebase, instant deployment, full SEO — acquisition and iteration optimized.
- Accepted risks: iOS cache eviction (mitigated: IndexedDB + persistent-storage request, in-app warnings), no reliable push on iOS (no MVP feature uses push), no store presence (marketing channel deferred).
- The API-first architecture keeps a future native client cheap: it would consume the same contracts ([../architecture/api-contracts.md](../architecture/api-contracts.md)).
- Performance budgets must be enforced continuously (Lighthouse CI) — a slow PWA loses the argument against native by feel, not by feature list.
