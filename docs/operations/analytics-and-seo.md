# Analytics and SEO

Status: **architectural decision** (privacy constraints, SEO architecture), **recommendation** (Plausible as tool).

## Analytics {#analytics}

Constraints (binding, from [../quality/security-and-privacy.md](../quality/security-and-privacy.md)): cookieless, no persistent user identifiers, no cross-site tracking, EU-hosted, DPA available ⚠️ verify at signup, raw IPs not stored. Recommendation: **Plausible** (cloud EU or self-hosted); fallback: Umami self-hosted.

### Event plan

Implements the metrics in [../product/success-metrics.md](../product/success-metrics.md).

| Event | Props (all low-cardinality, no free text) |
|---|---|
| `pageview` | route pattern, locale |
| `detail_view` | attraction ID, locale |
| `filter_apply` | dimension, value-count bucket |
| `search` | zero_results: bool (query text only in aggregated zero-result log) |
| `favorite_add` / `plan_add_stop` / `plan_save` / `plan_share` / `shared_plan_open` | attraction/stop-count bucket |
| `map_list_toggle` | direction |
| `official_link_click` | attraction ID |
| `report_submit` | category |
| `pwa_install` | platform bucket |
| `language_switch` | from→to |

Return-usage proxy: local-only session counter reported as bucket (`1st/2nd/3rd+ session within 14d`) — no server-side device ID. Zero-result queries: anonymized batch log (query + filter combo), reviewed weekly for data gaps.

## SEO {#seo}

Attraction pages are the organic acquisition engine ("Schloss X öffnungszeiten"-class queries).

### Architecture
- Server-rendered localized pages with ISR-style revalidation (content changes appear ≤ 1 h) — [../architecture/system-architecture.md](../architecture/system-architecture.md#cross-cutting-decisions).
- URL scheme + localized slugs + redirects on rename/merge: [../ux/information-architecture.md](../ux/information-architecture.md#url-structure-decision).
- `hreflang` de/en + `x-default` on all public pages; canonical URLs ignore filter query params on the list page.
- Localized XML sitemaps regenerated daily (job) — attractions, guides, static pages; `/admin`, shared plans (`noindex`), and API excluded.

### Structured data (JSON-LD)
`TouristAttraction` (name, geo, address, openingHoursSpecification, priceRange, isAccessibleForFree, image with licence-compatible URL, sameAs → official site + Wikidata) — generated from the same domain data as the page (no drift); `BreadcrumbList`; `WebSite` with `SearchAction`. Opening-hours JSON-LD emitted **only** when hours are verified fresh (never serve stale hours to search engines as fact).

### Content strategy (SEO-relevant, low effort)
Guide pages (getting around, money/borders, Sundays/holidays, guest cards) target high-intent international queries · region hub pages (9 product regions) list attractions and interlink · meta descriptions from the original summaries (unique by construction — REQ-DATA-05).

### Quality guards
Lighthouse SEO budget in CI · titles/descriptions localized and length-linted · OG/Twitter cards with licensed images only · 404s carry search + region links (no dead ends).
