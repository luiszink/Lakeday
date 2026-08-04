# Later phases

Status: **confirmed exclusions** (section 1) plus **recommendations** for phasing (sections 2–4).

## 1. Explicitly excluded from the MVP

| Excluded feature | Why excluded | Architectural provision in MVP (kept deliberately minimal) |
|---|---|---|
| Unrestricted AI chat | Cost, hallucination risk, needs verified data + planner first | Stable attraction IDs; structured candidate API ([../planning/ai-travel-assistant.md](../planning/ai-travel-assistant.md)) |
| Fully AI-generated itineraries | Deterministic planner must exist first ([ADR-007](../adr/ADR-007-deterministic-before-llm.md)) | Plan model supports machine-generated origin flag |
| Native iOS/Android apps | PWA first ([ADR-002](../adr/ADR-002-pwa-before-native.md)) | API-first design; no web-only lock-in in domain layer |
| Complete live public-transport routing | Complex, provider-dependent; MVP uses static nearest-stop info + coarse travel estimates | Transport provider behind abstraction ([../architecture/external-services.md](../architecture/external-services.md)) |
| Public user reviews | Moderation cost; reviews are never canonical data anyway | None needed |
| Social network features | Not core to discovery/planning | Share tokens are the only social primitive |
| Complex gamification | Not core | None |
| Complete restaurant database | Different data domain; food exists only as attraction attributes | `foodOnSite`/`cafeOnSite` fields only |
| Paid subscriptions | Free MVP for acquisition | No paywall assumptions anywhere |
| Offline download of the entire map | Storage/licensing cost | Service-worker architecture allows later scoped offline packs |

## 2. Phase model

| Phase | Content | Entry gate (measured, see [success-metrics.md](success-metrics.md#phase-gates)) |
|---|---|---|
| **Phase 1 (MVP)** | Discovery, filters, favorites, manual plans, sharing, PWA, refresh pipeline | — |
| **Phase 1.5** | Events (daily refresh), guest-card structured data, more sectors verified, optional accounts + favorite sync | MVP stable; data pipeline proven in pilot sectors |
| **Phase 2** | Deterministic automatic day planner ([../planning/deterministic-planner.md](../planning/deterministic-planner.md)) | Gate G1 met |
| **Phase 3** | AI travel assistant on top of phase-2 planner ([../planning/ai-travel-assistant.md](../planning/ai-travel-assistant.md)) | Gate G2 met |
| **Later ideas** | Native apps (Gate G3), live transit routing, offline packs, scope extension (e.g. Rheinfall day-trip ring), monetization (Gate G4) | Respective gates |

## 3. Monetization outlook

**Later idea — not planned in detail.** Candidates, in rough order of fit:

1. Affiliate/ticket referral links (needs: outbound click tracking, partner link fields — `bookingUrl` exists; click tracking is a small analytics extension).
2. Accommodation partnerships (needs: nothing in MVP).
3. Clearly labelled sponsored placements (needs: `sponsored` flag + ranking transparency policy; **decision:** sponsored results must never be silently mixed into relevance ranking).
4. Premium AI planning (phase 3+; free tier remains).
5. B2B guest guides for hotels/holiday apartments (white-label plan/collection links; the share-token model is the seed).

**Rule:** no MVP work may be justified by monetization alone; only architectural compatibility (stable IDs, share tokens, outbound-link fields) is maintained.

## 4. Candidate scope extensions (later ideas)

- Day-trip ring outside the shoreline band (Rheinfall, Säntis, Ravensburger Spieleland) as a clearly labelled "Day trips" category — would use the existing `scopeException` machinery, but as a *category*, keeping the core scope honest.
- Liechtenstein and St. Gallen inland — only with evidence of demand.
- Restaurant/gastronomy directory — separate product decision.
