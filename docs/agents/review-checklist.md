# Review checklist

Status: **binding** for PR review (self-review for solo/agent work — go through it honestly before merge).

## Scope & correctness
- [ ] PR does exactly what the ticket scopes — nothing beyond "Out of scope".
- [ ] Ticket dependencies were actually merged (not just assumed).
- [ ] Domain rules implemented match [../architecture/domain-model.md](../architecture/domain-model.md) (spot-check invariants touched).
- [ ] Edge cases from the ticket's UI-states and acceptance sections are handled, not just the happy path.

## Product-rule spot checks (fast, high-value)
- [ ] No political-district scope language ("Bodenseekreis", "Landkreis") crept into code, data, or copy — regions per [../product/geographic-scope.md](../product/geographic-scope.md).
- [ ] No filter logic on free-form tags (must use normalized fields — REQ-FILT-01).
- [ ] No copied third-party prose in any content or fixture (REQ-DATA-05).
- [ ] Accessibility facts never defaulted to "yes"; UNKNOWN handled per must/nice semantics.
- [ ] No tourist-account assumptions; no server-side user identity introduced.
- [ ] AI/LLM code (phase 3 only) references attractions by ID from tool results only.

## Technical
- [ ] Layering clean (domain purity, adapter boundaries, raw SQL confined) — check imports.
- [ ] API changes match [../architecture/api-contracts.md](../architecture/api-contracts.md) and update it if extended.
- [ ] Migration reviewed: additive? reversible? seeds updated? index impact considered?
- [ ] Error paths return typed, localized results; no swallowed promises; timeouts on external calls.
- [ ] Rate limiting / validation present on any new write endpoint.
- [ ] Performance: no N+1 queries; list endpoints paginated; map responses capped.

## Tests
- [ ] Tests listed in the ticket exist and meaningfully assert behaviour (not snapshots-of-everything).
- [ ] Tests fail when the feature is broken (spot-check one by inverting an assertion mentally).
- [ ] Fixtures extended rather than duplicated ([../quality/testing-strategy.md](../quality/testing-strategy.md#test-personas)).

## UX & content
- [ ] Mobile viewport verified visually (360 px) in both locales.
- [ ] Loading/empty/error/stale states demonstrated (screenshots in PR for UI work).
- [ ] Keyboard walk-through of new interactions done.
- [ ] German and English copy reviewed for tone and correctness (not machine-translated UI strings).

## Docs & hygiene
- [ ] `docs/` updated where behaviour changed; links valid.
- [ ] Commit messages carry the ticket ID; PR description explains *why*, links spec sections.
- [ ] `.env.example`/README updated for any new setup step.
- [ ] [Definition of done](definition-of-done.md) fully satisfied — if an item is N/A, say so explicitly in the PR.
