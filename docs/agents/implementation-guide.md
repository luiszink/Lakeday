# Implementation guide for agents

Status: **binding process** for implementation agents (human or AI) working on this repository.

## Before your first ticket

1. Read [../../AGENTS.md](../../AGENTS.md) (hard product rules).
2. Skim [../product/mvp-scope.md](../product/mvp-scope.md) (requirement IDs), [../architecture/system-architecture.md](../architecture/system-architecture.md) (components, layout), [../architecture/domain-model.md](../architecture/domain-model.md) (entities).
3. Open your ticket in [../tickets/](../tickets/README.md) — tickets are self-contained: objective, scope, exclusions, dependencies, files, approach, acceptance criteria, tests, commands.

## Working a ticket

1. **Check dependencies** — the ticket lists them; a dependency not merged means the ticket is not ready. Sequential/parallel markers: [../roadmap/dependencies.md](../roadmap/dependencies.md).
2. **Stay in scope.** The ticket's "Out of scope" list is binding. Discoveries → propose a new ticket or add to [../roadmap/open-questions.md](../roadmap/open-questions.md); never expand silently.
3. **Follow the layering:**
   - `packages/domain` — pure TypeScript, no I/O, no framework imports (enforced by lint). Domain rules live here and only here.
   - `packages/db` — Prisma schema, migrations, typed query helpers (only place with raw SQL).
   - `apps/web` — routes, components, API handlers; consumes domain + db.
   - External providers only through their interfaces ([../architecture/external-services.md](../architecture/external-services.md#abstraction-pattern-decision)).
4. **Both locales always:** any user-facing string goes through the message catalog with DE + EN entries in the same PR; content-bearing features handle both localizations (REQ-I18N-01).
5. **All four UI states:** loading, empty, error, stale — every data-bearing view (ticket acceptance criteria repeat this; empty states follow "no dead ends", [../ux/core-user-flows.md](../ux/core-user-flows.md)).
6. **Write the tests the ticket lists** (unit/integration/e2e). New domain logic without unit tests fails review.
7. **Update affected docs in the same PR** — behaviour documented in `docs/` must stay true.
8. Finish against [definition-of-done.md](definition-of-done.md), self-review with [review-checklist.md](review-checklist.md).

## Conventions

| Topic | Convention |
|---|---|
| Branch | `lake-###-short-slug` |
| Commits | `LAKE-###: imperative summary` |
| Code style | ESLint + Prettier (repo config); no disabling rules without a comment explaining why |
| Naming | Domain terms exactly as in [../architecture/domain-model.md](../architecture/domain-model.md) (`Attraction`, `ChangeProposal`, `FactProvenance` — no synonyms) |
| IDs | Never expose DB internals beyond the documented API shapes; attraction IDs are stable and public |
| Errors | Typed results at boundaries; user-facing errors localized; no raw provider errors surfaced |
| Env vars | Only via documented list ([../architecture/system-architecture.md](../architecture/system-architecture.md#environment-variables)); new ones require doc + `.env.example` update in the same PR |
| Migrations | Additive-first; destructive = two-phase ([../architecture/database-schema.md](../architecture/database-schema.md#migration-strategy)) |

## Common commands (valid once LAKE-001/004 are merged)

```bash
pnpm install               # setup
pnpm dev                   # app + local DB (docker compose up -d db first)
pnpm db:migrate            # apply migrations locally
pnpm db:seed               # seed vocabularies + fixtures
pnpm test                  # unit + integration
pnpm test:e2e              # Playwright
pnpm lint && pnpm typecheck
pnpm research:validate <files>  # validate research JSON (after LAKE-018)
```

## Escalation

Genuinely blocked (contradictory specs, missing decision): record the conflict in [../roadmap/open-questions.md](../roadmap/open-questions.md) with a recommended default, apply the default if it is reversible, and flag it in the PR description. Only stop when the decision is irreversible or security-relevant.
