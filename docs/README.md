# Documentation index

Complete planning and architecture documentation for the Lake Constance discovery and day-planning platform (codename **LAKE**). Technical documentation is written in English; customer-facing content examples appear in German **and** English.

## Reading order for newcomers

1. [product/vision.md](product/vision.md) — what we are building and why
2. [product/geographic-scope.md](product/geographic-scope.md) — the exact region model
3. [product/mvp-scope.md](product/mvp-scope.md) — the numbered MVP requirements (`REQ-*`)
4. [architecture/system-architecture.md](architecture/system-architecture.md) — how it is built
5. [tickets/README.md](tickets/README.md) — the implementation backlog and traceability matrix

## Document map

### Product
| File | Contents |
|---|---|
| [product/vision.md](product/vision.md) | Product vision, positioning, monetization outlook |
| [product/geographic-scope.md](product/geographic-scope.md) | Region model, inclusion rule, research sectors |
| [product/personas-and-user-journeys.md](product/personas-and-user-journeys.md) | Personas, journeys, international-visitor needs |
| [product/mvp-scope.md](product/mvp-scope.md) | Authoritative MVP requirement list (`REQ-*` IDs) |
| [product/later-phases.md](product/later-phases.md) | Explicit exclusions and phase 2/3 outlook |
| [product/success-metrics.md](product/success-metrics.md) | Privacy-conscious metrics and phase gates |

### UX
| File | Contents |
|---|---|
| [ux/information-architecture.md](ux/information-architecture.md) | Screens, navigation, URL structure |
| [ux/core-user-flows.md](ux/core-user-flows.md) | End-to-end flows with diagrams |
| [ux/filter-and-search-behaviour.md](ux/filter-and-search-behaviour.md) | Filter semantics, search, sorting, zero-result handling |
| [ux/map-and-list-behaviour.md](ux/map-and-list-behaviour.md) | Map/list interplay, clustering, mobile behaviour |
| [ux/favorites-and-plans.md](ux/favorites-and-plans.md) | Favorites and manual day-plan UX |

### Architecture
| File | Contents |
|---|---|
| [architecture/system-architecture.md](architecture/system-architecture.md) | System context, components, environment, deployment overview |
| [architecture/domain-model.md](architecture/domain-model.md) | Entities, aggregates, invariants, ER diagram |
| [architecture/database-schema.md](architecture/database-schema.md) | PostgreSQL/Prisma schema plan, indexing, migrations |
| [architecture/api-contracts.md](architecture/api-contracts.md) | Public and admin API contracts |
| [architecture/i18n.md](architecture/i18n.md) | Locale routing, content localization model |
| [architecture/pwa-strategy.md](architecture/pwa-strategy.md) | PWA scope, caching, offline behaviour, native-app gates |
| [architecture/auth-and-anonymous-usage.md](architecture/auth-and-anonymous-usage.md) | Anonymous-first model, admin auth, future accounts |
| [architecture/external-services.md](architecture/external-services.md) | Provider abstractions and third-party service evaluation |

### Data
| File | Contents |
|---|---|
| [data/tag-and-filter-taxonomy.md](data/tag-and-filter-taxonomy.md) | Normalized enums and controlled vocabularies for all filters |
| [data/data-source-policy.md](data/data-source-policy.md) | Source priority, per-source licence evaluation |
| [data/research-workflow.md](data/research-workflow.md) | AI-assisted research pipeline and pilot procedure |
| [data/research-output-schema.md](data/research-output-schema.md) | JSON Schema contract for research output |
| [data/refresh-and-review-pipeline.md](data/refresh-and-review-pipeline.md) | Freshness policy, scheduled refresh, review queue |
| [data/provenance-and-licensing.md](data/provenance-and-licensing.md) | Per-fact provenance, content and image licensing |

### Planning features
| File | Contents |
|---|---|
| [planning/manual-planner.md](planning/manual-planner.md) | MVP "My Day" manual planner specification |
| [planning/deterministic-planner.md](planning/deterministic-planner.md) | Phase-2 rule-based automatic planner |
| [planning/ai-travel-assistant.md](planning/ai-travel-assistant.md) | Phase-3 AI assistant architecture and guardrails |

### Quality
| File | Contents |
|---|---|
| [quality/testing-strategy.md](quality/testing-strategy.md) | Test pyramid, test personas, tooling |
| [quality/data-quality-strategy.md](quality/data-quality-strategy.md) | Data quality rules, duplicate detection, stale-data handling |
| [quality/accessibility.md](quality/accessibility.md) | WCAG 2.2 AA plan, map alternatives |
| [quality/security-and-privacy.md](quality/security-and-privacy.md) | GDPR, consent, abuse protection, secret management |

### Operations
| File | Contents |
|---|---|
| [operations/deployment.md](operations/deployment.md) | Hosting, environments, CI/CD |
| [operations/observability.md](operations/observability.md) | Logging, metrics, alerting |
| [operations/analytics-and-seo.md](operations/analytics-and-seo.md) | Privacy-friendly analytics, SEO strategy |
| [operations/maintenance.md](operations/maintenance.md) | Routine operations, data stewardship |

### Roadmap
| File | Contents |
|---|---|
| [roadmap/implementation-roadmap.md](roadmap/implementation-roadmap.md) | Phased delivery plan |
| [roadmap/dependencies.md](roadmap/dependencies.md) | Cross-epic dependency graph, parallelization |
| [roadmap/risks.md](roadmap/risks.md) | Risk register with mitigations |
| [roadmap/open-questions.md](roadmap/open-questions.md) | Unresolved questions with recommended defaults |

### Agents
| File | Contents |
|---|---|
| [agents/implementation-guide.md](agents/implementation-guide.md) | How implementation agents work in this repo |
| [agents/definition-of-done.md](agents/definition-of-done.md) | Global definition of done |
| [agents/review-checklist.md](agents/review-checklist.md) | Review checklist per change |

### Research prompts
Reusable prompts for the AI-assisted research workflow, in [research/prompts/](research/prompts/attraction-discovery.md): discovery, details, verification, duplicate resolution, translation, data refresh. The change-review step is covered inside [data/refresh-and-review-pipeline.md](data/refresh-and-review-pipeline.md) and [research/prompts/data-refresh.md](research/prompts/data-refresh.md) rather than a separate prompt file, because review is a human-in-the-loop step driven by the pipeline, not a standalone LLM prompt (see note below).

### Architecture decision records
In [adr/](adr/ADR-001-shoreline-scope.md):

| ADR | Decision |
|---|---|
| [ADR-001](adr/ADR-001-shoreline-scope.md) | Shoreline-band geographic scope, independent of political districts |
| [ADR-002](adr/ADR-002-pwa-before-native.md) | PWA before native apps |
| [ADR-003](adr/ADR-003-master-attraction-database.md) | Own verified master attraction database |
| [ADR-004](adr/ADR-004-anonymous-favorites.md) | Anonymous, local-first favorites and plans |
| [ADR-005](adr/ADR-005-map-provider-abstraction.md) | Map/geocoding/routing provider abstraction |
| [ADR-006](adr/ADR-006-periodic-data-refresh.md) | Periodic refresh with review queue instead of live queries |
| [ADR-007](adr/ADR-007-deterministic-before-llm.md) | Deterministic planner before LLM planning |
| [ADR-008](adr/ADR-008-i18n-from-start.md) | Internationalization from the beginning |
| [ADR-009](adr/ADR-009-technology-stack.md) | Greenfield technology stack |

### Tickets
| File | Contents |
|---|---|
| [tickets/README.md](tickets/README.md) | Backlog overview, status, traceability matrix |
| [tickets/epics/](tickets/epics/LAKE-EPIC-001-repository-foundation.md) | 20 epics `LAKE-EPIC-001` … `LAKE-EPIC-020` |
| [tickets/tasks/](tickets/tasks/LAKE-EPIC-001-tasks.md) | Implementation tickets `LAKE-001` … grouped per epic |

## Deviations from the originally requested file structure

1. **Tickets are grouped per epic** in `docs/tickets/tasks/LAKE-EPIC-0NN-tasks.md` files instead of one file per ticket. Every ticket keeps its stable `LAKE-###` ID and a linkable heading anchor. Rationale: ~60 tickets in one-file-per-ticket form would make dependency review and cross-epic consistency much harder to maintain, with no benefit for implementation agents, who consume tickets by ID.
2. **No separate `change-review` prompt file** was created. Change review is a human decision step in the refresh pipeline; the machine-facing part (structured change proposals) is fully specified in [research/prompts/data-refresh.md](research/prompts/data-refresh.md) and the review rules in [data/refresh-and-review-pipeline.md](data/refresh-and-review-pipeline.md). A duplicate prompt file would have restated that content.
3. All other requested files exist at the requested paths.
