# Data quality strategy

Status: **architectural decision**. Data quality is the product's core moat ([../product/vision.md](../product/vision.md#guiding-principles)) — it gets first-class machinery, not good intentions.

## Quality dimensions & rules

| Dimension | Rule | Enforcement |
|---|---|---|
| Completeness | Published attractions have all invariant fields ([../architecture/domain-model.md](../architecture/domain-model.md)); "key fields" set defines `dataCompleteness` score used in relevance | Publish transition + nightly sweep |
| Verification | Critical facts (existence, name, coordinates, hours, prices, accessibility) verified against priority-1/2 sources | Research workflow + refresh pipeline |
| Freshness | Facts within policy age ([../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md#freshness-policy-decision-cadences-configurable-per-source-in-the-registry)) | `nextRefreshAt` scheduling + staleness badges |
| Consistency | Cross-field sanity: `audiences` contains `families` ⇒ `childAgeBands` non-empty · `indoorOutdoor=INDOOR` ⇒ `rainSuitability ≥ GOOD` · `priceLevel=FREE` ⇒ no `PriceInfo` amounts > 0 · `wheelchairAccess=FULL` ⇒ `wheelchairToilet` not null · CH ⇒ CHF prices | Nightly sweep → quality report |
| Scope | Every attraction passes the inclusion rule; exceptions justified and periodically re-reviewed | Import gate + sweep (recompute `shorelineDistanceM` on geometry updates) |
| Uniqueness | No undetected duplicates | Scorer below |
| Accuracy honesty | `UNKNOWN` is stored when unverified — never guessed defaults | Research/refresh contracts; import validation |

## Duplicate detection {#duplicate-detection}

Scorer defined in [../architecture/domain-model.md](../architecture/domain-model.md#duplicate-detection-req-data-04) (external IDs > official URL > coordinates > normalized names). Operational integration:

- **At import:** every incoming record scored against the full DB + its own batch; certain duplicates auto-link to the existing record (update-not-create), strong candidates block import into the review queue with a side-by-side comparison.
- **Nightly sweep:** full pairwise scan within region buckets (cheap at our scale) catches drift (e.g. coordinate corrections revealing duplicates).
- **Merge protocol:** keep the older `id` · union external IDs · prefer higher-confidence facts per field · record loser ID in `attraction_alias` (301s + stable references for plans/favorites) · merges are reviewer-approved, never automatic.
- Test fixtures with seeded duplicates keep precision/recall measurable ([testing-strategy.md](testing-strategy.md)).

## Quality metrics {#quality-metrics}

Weekly internal report (admin dashboard + logged for trends):

| Metric | Target (post-launch) |
|---|---|
| Verification coverage (critical facts verified, published set) | ≥ 95 % |
| Facts within freshness policy | ≥ 90 % |
| Attractions with ≥ 1 STALE critical fact | < 5 % |
| Review-queue median latency | < 2 working days (safety), < 7 (rest) |
| User incorrect-info reports per 1k detail views | < 1, trending down |
| Consistency-rule violations | 0 published |
| Vocabulary distribution outliers (>80 % or <2 % usage) | reviewed quarterly ([../data/tag-and-filter-taxonomy.md](../data/tag-and-filter-taxonomy.md#governance)) |
| Duplicate pairs discovered post-publication | ~0; each one triggers a scorer retro |

## Stale-data handling (user-facing summary)

Defined in [../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md#staleness-presentation-req-data-07): quiet "verified" dates when fresh · per-fact warnings + official-link prominence when stale · exclusion from "open now" when critically stale · sources unavailable never blank a page.

## Feedback loops

1. **User reports** (F6) → triage → ChangeProposal → review ([../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md#user-reports)). Report rate per attraction is a quality smell ranking input for editorial attention.
2. **Zero-result analytics** → taxonomy/data gaps ([../product/success-metrics.md](../product/success-metrics.md)).
3. **Refresh failures per source** → source-registry health; persistently failing sources get editorial re-sourcing.
4. **Pilot retro** → prompt/schema revisions before scale-up ([../data/research-workflow.md](../data/research-workflow.md#pilot-procedure)).
