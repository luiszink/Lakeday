# Product vision

Status: **confirmed requirement** (from product owner brief, 2026-08).

## One-sentence vision

A mobile-first companion that lets any Lake Constance visitor answer, in under a minute, *"What can we do today, near us, that fits our group, the weather, and our budget — and how do we plan the day?"*

## What the product is

- A **structured, verified attraction database** for the entire Lake Constance shoreline (Germany, Switzerland, Austria), exposed through a fast bilingual web app.
- A **discovery tool**: list + map + full-text search + rich structured filters + distance/relevance sorting.
- A **day-planning tool**: favorites and a manual "My Day" plan that can be reordered, checked for opening-hour conflicts, saved, shared, and printed — without an account.
- A **foundation for automation**: the same verified data later powers a deterministic itinerary generator (phase 2) and a conversational AI travel assistant (phase 3).

## What the product is not

- Not a traditional editorial travel guide or blog. Content is generated from verified facts, not copied editorial prose.
- Not a booking platform (MVP links out to official sites).
- Not a review or social platform.
- Not a restaurant directory (food data exists only as attraction attributes such as "café on site").

## Why this can win

| Problem today | Our answer |
|---|---|
| Information is fragmented across DE/CH/AT municipal sites, mostly German-only | One bilingual database across all three countries |
| Guides answer "what exists", not "what fits *us*, *now*" | Structured filters: weather, child age, accessibility, budget, transport mode, open-now |
| International visitors struggle with borders, currencies, Sunday closures, guest cards | First-class practical fields and localized explanations |
| Listings are stale and unverified | Per-fact provenance, freshness policy, visible "last verified" dates, links to official sources |

## Target users (initial)

Families with children, couples, and solo travellers; German-speaking tourists and English-speaking international tourists. Detailed personas: [personas-and-user-journeys.md](personas-and-user-journeys.md).

## Business model

The initial product is **free** and optimized for user acquisition and trust. Monetization is explicitly out of MVP scope and will be evaluated against the gates in [success-metrics.md](success-metrics.md#phase-gates).

Options preserved for later (architectural compatibility only — see [later-phases.md](later-phases.md#3-monetization-outlook)):

- affiliate links and ticket referrals (requires per-attraction outbound-link infrastructure — already in the domain model as `bookingUrl`);
- accommodation partnerships;
- clearly labelled sponsored placements (requires a `sponsored` flag and ranking transparency — reserved, not implemented);
- premium AI planning;
- B2B guest guides for hotels and holiday apartments (requires shareable, brandable plan/collection links — the share-token model in the MVP is the seed for this).

**Architectural consequence (decision):** nothing in the MVP may assume permanent free access to third-party data that would prohibit later commercial use. See [../data/data-source-policy.md](../data/data-source-policy.md).

## Guiding principles

1. **Data quality over data quantity.** 150 verified attractions beat 1,500 scraped ones.
2. **Anonymous-first.** No forced accounts, minimal data collection ([../quality/security-and-privacy.md](../quality/security-and-privacy.md)).
3. **The database is the source of truth.** Every later feature — ranking, deterministic planning, AI chat — consumes it and never overrides it.
4. **Bilingual is not a feature, it's the baseline.**
5. **Smallest coherent architecture.** Every abstraction must serve the MVP or a concretely planned phase.
