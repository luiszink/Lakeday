# Agent instructions — BodenseeGuide (codename LAKE)

This repository is planned to be built incrementally by implementation agents working from a ticket backlog. Follow these rules.

## Non-negotiable product facts

1. **Geographic scope** is the *entire* Lake Constance shoreline in Germany, Switzerland, and Austria — Obersee, Überlinger See, Untersee, the Rhine corridor around Konstanz, and the area toward Stein am Rhein. Never limit the product to the Bodenseekreis or Landkreis Konstanz. See [docs/product/geographic-scope.md](docs/product/geographic-scope.md).
2. **The attraction database is the product.** All user-visible facts must trace to verified sources with provenance. AI components never invent attractions, opening hours, or prices. See [docs/data/data-source-policy.md](docs/data/data-source-policy.md).
3. **No mandatory accounts in the MVP.** Favorites are anonymous and local-first; shared plans use unguessable tokens. See [docs/architecture/auth-and-anonymous-usage.md](docs/architecture/auth-and-anonymous-usage.md).
4. **Bilingual from day one.** Every user-facing string and every published attraction exists in German and English. See [docs/architecture/i18n.md](docs/architecture/i18n.md).
5. **Map, geocoding, and routing providers are abstractions.** Never call a provider SDK directly from feature code. See [docs/adr/ADR-005-map-provider-abstraction.md](docs/adr/ADR-005-map-provider-abstraction.md).

## Workflow

1. Read [docs/agents/implementation-guide.md](docs/agents/implementation-guide.md) before your first ticket.
2. Pick the next open ticket respecting the dependency order in [docs/roadmap/dependencies.md](docs/roadmap/dependencies.md).
3. Implement only what the ticket scopes. Out-of-scope discoveries go to [docs/roadmap/open-questions.md](docs/roadmap/open-questions.md) or a new ticket proposal.
4. Satisfy the ticket's acceptance criteria and tests, then check [docs/agents/definition-of-done.md](docs/agents/definition-of-done.md) and [docs/agents/review-checklist.md](docs/agents/review-checklist.md).

## Conventions

- Language of code, comments, commits, and docs: **English**. User-facing content: **German and English**.
- Ticket IDs: `LAKE-###`; epic IDs: `LAKE-EPIC-###`; requirement IDs: `REQ-*`; ADRs: `ADR-###`.
- Commits reference ticket IDs, e.g. `LAKE-012: add opening-hours evaluation engine`.
- Documentation lives in `docs/`; keep it updated when a ticket changes behaviour described there.
- Environment variables are documented in [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md#environment-variables) and mirrored in `.env.example` once scaffolding exists.
