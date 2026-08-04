# Success metrics

Status: **recommendation** (metric definitions), **architectural decision** (privacy constraints on measurement).

All metrics must be collectable with **privacy-friendly, cookieless analytics** (no cross-site tracking, no persistent user IDs, EU-hosted; see [../operations/analytics-and-seo.md](../operations/analytics-and-seo.md) and [../quality/security-and-privacy.md](../quality/security-and-privacy.md)). Where a metric would require invasive tracking, we accept lower precision.

## Product metrics (MVP)

| Metric | Definition | Signal for |
|---|---|---|
| Attraction detail views | Views per attraction per day | Content demand, ranking quality |
| Filter usage | Which filters are applied, combination counts | Filter relevance; unused filters are candidates for removal |
| Zero-result searches | Search/filter combinations returning 0 results (query text logged only aggregated/anonymized) | Data gaps, taxonomy gaps |
| Favorites created | Count per day (event only, no content) | Engagement |
| Attractions added to plans | Count per day | Planning adoption |
| Plans saved | Count per day | Planning adoption |
| Plans shared | Share-link creations per day | Organic spread, B2B seed |
| Shared-plan opens | Opens per created link | Viral coefficient proxy |
| Language split | Sessions DE vs EN | International reach |
| Map/list switching | Toggle events per session | UI balance |
| Official-link clicks | Outbound clicks per attraction | Trust, later affiliate potential |
| Return usage during the same trip | Sessions per anonymous device within 14 days (local-only counter reported as a bucket, no server-side device ID) | Retention within trip |
| Stale-data reports | User reports per week | Data quality perception |
| Incorrect-information reports | User reports per week per attraction | Data quality, review-queue input |
| PWA installs | Install events | Native-app gate input |

Data-quality metrics (internal): verification coverage, average fact age vs. freshness policy, review-queue latency — defined in [../quality/data-quality-strategy.md](../quality/data-quality-strategy.md#quality-metrics).

## Phase gates

Gates are **decision triggers, not automatic approvals** — they start a product discussion with real numbers. Thresholds are initial recommendations; revisit after 3 months of data.

### G1 — Build the deterministic automatic planner (phase 2)
Build when, over a rolling 4-week season-representative window:
- ≥ 25 % of active sessions interact with plans (add/reorder/save), **and**
- ≥ 200 plans saved, **and**
- median plan contains ≥ 3 stops (signals real day planning, not bookmarking), **and**
- verified attraction coverage ≥ 80 % of checklist localities with ≥ 10 published attractions each.

### G2 — Build the AI travel assistant (phase 3)
Build when:
- G1 shipped and ≥ 30 % of generated plans are accepted with ≤ 2 manual edits, **and**
- structured planner inputs demonstrably fail user needs (e.g. ≥ 15 % of planner sessions abandon at the preference form), **and**
- unit economics estimated: projected LLM cost per active planning session ≤ agreed budget ([../planning/ai-travel-assistant.md](../planning/ai-travel-assistant.md#cost-controls)).

### G3 — Build native applications
Build when at least two of:
- ≥ 30 % of returning users have installed the PWA and request app-store presence (survey/report signal),
- a required capability is demonstrably blocked on PWA for target devices (documented in [../architecture/pwa-strategy.md](../architecture/pwa-strategy.md#native-app-gates)),
- ≥ 50k monthly active devices (store presence becomes an acquisition channel),
- push-notification-driven features (phase 1.5 events) show >20 % opt-in intent but iOS web push proves insufficient.

### G4 — Introduce monetization
Discuss when:
- ≥ 20k monthly active devices during season, **and**
- official-link CTR ≥ 15 % (proves referral value), **and**
- data quality metrics stable (stale-data reports < 2/week per 1k sessions).

## Anti-metrics (things we deliberately do not optimize)

- Session duration (a fast successful visit is *good*).
- Notification engagement (MVP has none).
- Raw attraction count (quality over quantity, see [vision.md](vision.md#guiding-principles)).
