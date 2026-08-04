# ADR-009: Greenfield technology stack

**Status:** Accepted · 2026-08 · **Deciders:** architecture

## Context

Repository inspection (2026-08-04) found a **completely empty workspace**: no code, no manifests, no git history, no conventions to preserve. The stack decision is therefore unconstrained by legacy. Requirements shaping it: a bilingual SEO-relevant PWA (server rendering), geospatial queries (distance sort, bbox, shoreline band), scheduled jobs, a protected admin area, strong typing for agent-driven development, and a small team that must not operate exotic infrastructure.

## Decision

| Concern | Choice | Primary reason |
|---|---|---|
| Language | **TypeScript** (strict) end-to-end | One language across web/API/domain/jobs; strong typing guides implementation agents |
| Framework | **Next.js (App Router)** | SSR/ISR for SEO'd content pages + API routes + admin in one deployable; best-supported PWA path in the ecosystem |
| Database | **PostgreSQL 16+ with PostGIS** | Geospatial is a hard requirement done natively (`ST_DWithin`, geography types); FTS + trigram cover MVP search without extra infra |
| ORM/migrations | **Prisma** (+ typed raw-SQL helpers for PostGIS) | Migration discipline + type safety; PostGIS gaps confined to `packages/db` helpers |
| Map rendering | **MapLibre GL JS** behind `MapProvider` ([ADR-005](ADR-005-map-provider-abstraction.md)) | BSD-licensed, vector tiles, no vendor lock |
| i18n | **next-intl** | App-Router-native, typed catalogs ([ADR-008](ADR-008-i18n-from-start.md)) |
| Validation | **zod** | Single schema source for API contracts, forms, and research-import validation |
| Testing | **Vitest + Testcontainers + Playwright + axe** | Standard, agent-friendly, covers unit→e2e→a11y ([../quality/testing-strategy.md](../quality/testing-strategy.md)) |
| Monorepo | **pnpm workspaces** (`apps/web`, `packages/domain`, `packages/db`, `packages/config`) | Enforces the domain-purity layering; minimal tooling |
| Jobs | Scheduler → authenticated HTTP job endpoints | Host-portable; replaceable by a worker process without redesign |
| Style | Tailwind CSS (recommendation, confirm in LAKE-001) | Fast consistent mobile-first styling; design tokens for a11y contrast budgets |

Architecture style: modular monolith — one deployable, one database ([../architecture/system-architecture.md](../architecture/system-architecture.md#architectural-style-decision)).

## Alternatives considered

- **SvelteKit / Remix / Astro** — all viable; Next.js chosen for the deepest ecosystem/hosting/PWA/i18n support and the largest agent knowledge base. No requirement differentiates them enough to outweigh that.
- **Separate backend (NestJS/Fastify) + SPA** — rejected: two deployables and an API boundary tax with one first-party client; hurts SEO path simplicity.
- **MongoDB/DynamoDB** — rejected: geospatial + relational integrity (provenance chains, vocabularies, review queue) is exactly Postgres territory.
- **Drizzle ORM** — close call; Prisma chosen for maturer migration tooling — revisit only if PostGIS friction exceeds expectations (risk R-09).
- **Serverless-everything (edge functions + hosted queues)** — rejected: scheduled scraping jobs and Testcontainers-style integration testing fit a plain Node runtime better; the app remains deployable to serverless hosts anyway.

## Consequences

- Boring, well-documented stack → maximally effective agent-driven implementation; hiring/handover trivial.
- Prisma+PostGIS requires disciplined raw-SQL helpers (accepted, confined, tested).
- Next.js coupling is real but limited to `apps/web`; domain and db packages are framework-free by construction.
- This ADR is the baseline-hypothesis confirmation the planning brief called for: repository evidence (empty) made the recommended baseline the actual decision.
