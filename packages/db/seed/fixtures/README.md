# Synthetic fixture dataset

`data.ts` is the canonical, reviewed fixture source. Every row is deliberately invented and uses a stable UUID exposed by `fixtureIds`; tests and future E2E flows must import that map rather than duplicate IDs.

The named edge-case IDs are `fixture-unknown-hours`, `fixture-chf-price`, `fixture-scope-exception`, `fixture-stale-facts`, `fixture-near-duplicate-a`, and `fixture-near-duplicate-b`.

Load the data locally with `pnpm db:seed --only fixtures`. The loader rejects `NODE_ENV=production`.
