# ADR-008: Internationalization from the beginning

**Status:** Accepted · 2026-08 · **Deciders:** product owner + architecture

## Context

The confirmed target users include English-speaking international tourists alongside German speakers, and the region itself is trilateral (DE/CH/AT) with cross-border practicalities (currencies, holidays) that international visitors specifically struggle with. Retrofitting i18n into an established codebase is one of the most expensive refactors in web development: hardcoded strings, unlocalizable data models, and URL schemes without locale awareness all calcify quickly. "German first, English later" would also delay the underserved audience with the fewest alternatives (German-only municipal sites).

## Decision

1. **German and English ship together from the first public release** — UI strings, vocabulary labels, and attraction content (REQ-I18N-01, REQ-DISC-09).
2. The architecture is locale-count-agnostic from day one: locale-prefixed routing with localized slugs, message catalogs with CI completeness checks, per-locale content rows (`AttractionLocalization`), localized vocabulary labels ([../architecture/i18n.md](../architecture/i18n.md)).
3. **German is the content source locale**; English is produced by the research workflow's translation step *after* fact verification, stored and reviewed — no request-time machine translation.
4. Publication requires both localizations (domain invariant); source-text changes automatically mark translations `STALE`.
5. Currency is never converted (EUR/CHF shown natively); holiday calendars are country/subdivision-specific.

## Alternatives considered

- **German-only MVP, English later** — rejected: retrofit cost, delayed differentiator, and the data model would inevitably bake in single-locale assumptions.
- **On-the-fly machine translation (client widget or API)** — rejected: quality embarrassments on names/practical facts, no review control, SEO worthless (no indexable EN pages).
- **English as source locale** — rejected: sources are overwhelmingly German; research fidelity is highest in German with EN as a controlled derivative.
- **More locales at launch (FR/IT)** — rejected: doubles content operations per locale; architecture keeps the door open, product adds locales on demand evidence.

## Consequences

- Every content feature costs marginally more (two locales through the whole pipeline) — planned into tickets rather than discovered later.
- Translation becomes a first-class workflow step with state tracking, not an afterthought.
- Full bilingual SEO from launch (`hreflang`, localized slugs/sitemaps) — the EN organic channel opens immediately.
- CI enforces catalog completeness, preventing the classic "untranslated string in production" drift.
