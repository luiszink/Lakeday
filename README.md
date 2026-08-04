# BodenseeGuide (working title) — Lake Constance Discovery & Day Planning

A mobile-first travel discovery and day-planning platform for the **entire shoreline of Lake Constance** (Obersee, Überlinger See, Untersee, the Rhine corridor around Konstanz, and the area toward Stein am Rhein), covering shoreline areas in **Germany, Switzerland, and Austria**.

The core of the product is a **structured, verified attraction database** — not an editorial travel guide. Tourists can discover attractions in a list and on a map, filter by personal requirements, sort by distance and relevance, save favorites, build and share manual day plans, and — in later phases — receive automatically generated and AI-assisted itineraries.

**Project codename:** `LAKE` (used for ticket IDs such as `LAKE-001`).

## Current state

The repository foundation is in place: a pnpm workspace with the Next.js application and empty domain, database, and shared-config packages. Implementation continues ticket-by-ticket from the backlog in [docs/tickets/README.md](docs/tickets/README.md).

## Where to start

| You are…                  | Start here                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Anyone new to the project | [docs/README.md](docs/README.md)                                                                                                                             |
| A product person          | [docs/product/vision.md](docs/product/vision.md), [docs/product/mvp-scope.md](docs/product/mvp-scope.md)                                                     |
| An architect / engineer   | [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md), [docs/architecture/domain-model.md](docs/architecture/domain-model.md) |
| An implementation agent   | [docs/agents/implementation-guide.md](docs/agents/implementation-guide.md), then the first open ticket in [docs/tickets/README.md](docs/tickets/README.md)   |
| A research agent          | [docs/data/research-workflow.md](docs/data/research-workflow.md) and [docs/research/prompts](docs/research/prompts/attraction-discovery.md)                  |

## Key facts

- **Scope:** whole Lake Constance shoreline (~5 km inclusion band, configurable) — _not_ limited to the Bodenseekreis or Landkreis Konstanz. See [docs/product/geographic-scope.md](docs/product/geographic-scope.md).
- **MVP:** bilingual (DE/EN) PWA with list, map, search, filters, attraction details, anonymous favorites, manual day plans, and shareable plan links. No account required. See [docs/product/mvp-scope.md](docs/product/mvp-scope.md).
- **Stack (greenfield decision):** TypeScript, Next.js (App Router), PostgreSQL + PostGIS, Prisma, MapLibre GL behind a provider abstraction, next-intl, Vitest + Playwright. See [docs/adr/ADR-009-technology-stack.md](docs/adr/ADR-009-technology-stack.md).
- **Data:** verified attraction database with per-fact provenance, freshness policy, and a human review queue. See [docs/data/data-source-policy.md](docs/data/data-source-policy.md).

## Development quick start

Requires Node.js 22 or later. Corepack is included with supported Node.js releases and provides the pinned pnpm version.

```bash
corepack enable
pnpm install
docker compose up -d --wait
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The app is then available at `http://localhost:3000`. Run the local checks before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Copy `.env.example` to `.env` before adding local integrations. Its `DATABASE_URL` uses the local Docker database defaults. Values in that file are local defaults or placeholders only; do not commit real secrets.

### Local database

The Compose stack runs PostgreSQL 16 with PostGIS on port `5432`. The credentials (`lake` / `lake`) are local-development values only. The commands above work in PowerShell and Git Bash on Windows, as well as macOS and Linux shells.

Reset the local database and rerun the current migration and seed placeholders with:

```bash
pnpm db:reset
```

The geographic seed data arrives in LAKE-007; vocabulary and fixture seeds arrive in LAKE-008 and LAKE-010. To verify the running database manually:

```bash
docker compose exec db psql -U lake -d lake -c "SELECT postgis_version();"
```
