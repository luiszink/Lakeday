# ADR-004: Anonymous, local-first favorites and plans

**Status:** Accepted · 2026-08 · **Deciders:** product owner + architecture

## Context

Confirmed requirement: users must not be forced to create an account for any MVP feature, including favorites and day plans. Tourists are short-term users on vacation — account friction would gut adoption, and every stored profile creates GDPR surface. Yet favorites/plans need persistence, plans need shareability, and a later optional-account sync path must remain open (REQ-FAV-03).

## Decision

1. Favorites and plans are stored **locally on the device** (IndexedDB), containing only attraction IDs + metadata — no server round trips, no cookies, no anonymous server-side identity, no fingerprinting ([../architecture/auth-and-anonymous-usage.md](../architecture/auth-and-anonymous-usage.md)).
2. Server persistence happens **only** when a user shares a plan: an immutable snapshot behind an unguessable ≥128-bit capability token, with rounded start coordinates and a 12-month idle expiry.
3. Future optional accounts (phase 1.5+) sync by **merging local records upward** (union by `(attractionId, addedAt)`); local records carry a `syncState` placeholder now so no rewrite is needed.
4. Users are told plainly (More tab) that clearing browser data deletes local content.

## Alternatives considered

- **Anonymous server-side profiles (device ID cookie)** — rejected: creates exactly the tracking/GDPR surface we advertise not having, for marginal benefit; consent implications would force a banner.
- **Mandatory or soft-gated accounts** — rejected: confirmed requirement against; conversion killer for vacation-context usage.
- **localStorage instead of IndexedDB** — rejected: size limits and synchronous API; IndexedDB also survives better on iOS with persistent-storage requests.
- **Mutable shared plans (live-editing links)** — rejected for MVP: immutable snapshots are simpler, avoid concurrent-edit semantics, and match the "send the plan to grandparents" use case (J6).

## Consequences

- Privacy story is architectural, not policy prose: there is nothing server-side to breach for non-sharing users; likely no consent banner (OQ-5 pending legal confirmation).
- Accepted losses: no cross-device sync in MVP, data loss on browser-data clearing / iOS eviction (risk R-14; share links act as crude backups).
- Plan validation logic must run client-side too → pushed into the pure domain package (a quality win regardless).
- Analytics cannot rely on user IDs — metrics were designed accordingly ([../product/success-metrics.md](../product/success-metrics.md)).
