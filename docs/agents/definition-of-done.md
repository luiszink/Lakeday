# Definition of done

Status: **binding**. A ticket is done only when every applicable item holds. Ticket-specific acceptance criteria come **on top** of this global definition.

## Functional
- [ ] All acceptance criteria of the ticket pass (manually verified per the ticket's validation steps).
- [ ] Behaviour matches the referenced spec files; deviations were agreed and the spec updated in the same PR.
- [ ] No regression in existing e2e flows.

## Code quality
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and (when UI changed) `pnpm test:e2e` pass locally and in CI.
- [ ] Layering respected: no I/O in `packages/domain`, no raw SQL outside `packages/db`, no provider SDK outside its adapter.
- [ ] New logic covered by the tests the ticket lists; domain logic has unit tests.
- [ ] No leftover debug output, commented-out code, or TODOs without a ticket reference.

## Localization (any user-facing change)
- [ ] All strings via message catalog; DE and EN both present (CI enforces catalog completeness).
- [ ] Localized content fields handled for both locales; layouts survive German text length.

## UI states (any data-bearing view)
- [ ] Loading, empty, error, and stale states implemented; empty states have a next action; stale data visibly marked per [../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md#staleness-presentation-req-data-07).

## Accessibility (any UI change)
- [ ] axe run clean on affected screens (CI budget).
- [ ] Keyboard-only operation verified for new interactions; focus management sane.
- [ ] Images/icons have appropriate alt/labels; no color-only encoding; reduced-motion respected.

## Security & privacy (any API/data change)
- [ ] Inputs validated (zod) at the boundary; rate limits applied per [../quality/security-and-privacy.md](../quality/security-and-privacy.md#abuse-protection--rate-limiting).
- [ ] No new PII collection; no location persistence; logs scrubbed of sensitive params.
- [ ] Secrets only via env; nothing sensitive committed (gitleaks green).

## Data (any content/schema change)
- [ ] Migration additive or two-phase; seed/fixtures updated; `prisma migrate diff` clean in CI.
- [ ] Provenance preserved for any fact-writing path; published-invariants unaffected or re-verified.

## Documentation & traceability
- [ ] Affected `docs/` files updated in the same PR.
- [ ] PR description references the ticket ID; ticket's requirement IDs (`REQ-*`) demonstrably satisfied.
- [ ] New env vars, commands, or conventions documented.

## Deployment
- [ ] Preview/staging deployment verified (visual check on mobile viewport for UI changes).
- [ ] Rollback considerations of the ticket addressed (feature flag, additive migration, or documented revert path).
