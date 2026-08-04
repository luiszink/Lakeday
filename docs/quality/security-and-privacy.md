# Security and privacy

Status: **architectural decision** (technical measures); ⚠️ items marked **legal review required** — this is architectural planning, **not legal advice**.

## Privacy principles (GDPR-aligned by design)

1. **Data minimization as architecture:** no tourist accounts, no server-side user identity, favorites/plans local-first ([../architecture/auth-and-anonymous-usage.md](../architecture/auth-and-anonymous-usage.md)). The best GDPR story is data we never collect.
2. **Lawful bases** (⚠️ confirm with counsel): legitimate interest for essential operation + aggregated analytics; consent only where genuinely needed (geolocation is browser-permission-gated and processed transiently).

## Location data {#location-data}

- Geolocation permission requested **only after user gesture**, purpose explained inline (REQ-SEC-01).
- Precise position stays on-device; API queries carry coordinates **rounded to ~100 m**; server logs must not record `near` parameters (log scrubbing rule).
- **No permanent server-side storage of user location by default.** The only persisted location is a shared plan's start point — rounded, user-initiated, documented in the privacy policy.
- No location history, no movement profiles, ever (product decision).

## Cookies & consent

Target: **no consent banner needed** — no advertising/tracking cookies; admin session cookie is strictly necessary; analytics is cookieless ([../operations/analytics-and-seo.md](../operations/analytics-and-seo.md#analytics)); local storage of favorites/plans is functional (device-local, not transmitted). ⚠️ Banner-free stance requires legal confirmation (TTDSG/ePrivacy interpretation for localStorage use) — OQ-5.

## Data inventory (complete)

| Data | Where | Retention | PII? |
|---|---|---|---|
| Favorites, local plans, locale, last place | Device only | User-controlled | Never leaves device |
| Shared plans (stops, date, rounded start, label) | Server | 12 mo after last access | Quasi-PII possible in free-text label → label length-capped, policy documents it |
| User reports (category, free text) | Server | 12 mo after resolution | Form instructs no personal data; free text scanned at triage ⚠️ |
| Admin accounts | Server | Employment duration | Yes (staff) |
| Analytics events | Analytics (EU) | Aggregated, no user IDs | No |
| Server logs | Host | ≤ 30 days, IPs truncated where feasible | Minimized |

**Data deletion:** local = clear site data (documented in-app); shared plans expire automatically, and deletion-on-request is satisfiable by token (privacy policy explains) ⚠️ process wording legal review.

## Abuse protection & rate limiting {#rate-limiting}

| Surface | Limit (initial; config) |
|---|---|
| `POST /api/plans` | 10/h/IP, ≤20 stops, payload ≤ 32 KB |
| `GET /api/plans/{token}` | 60/h/IP (brute-force pointless at 128-bit, limit is hygiene) |
| `POST /api/reports` | 5/h/IP, message ≤ 1000 chars, honeypot field |
| `GET /api/attractions`, geocode proxy | 120/min/IP burst-friendly |
| Admin login | Per-account backoff + per-IP cap; TOTP mandatory |

Plus: input validation via zod at every boundary (lengths, enums, coordinate bounds) · parameterized queries only (Prisma; raw-SQL helpers use bound params — SQL-injection guard) · output encoding/react defaults + CSP (no `unsafe-inline` scripts; map/tile hosts allow-listed) · security headers (HSTS, X-Content-Type-Options, Referrer-Policy `strict-origin-when-cross-origin`, restrictive Permissions-Policy granting geolocation to self only) · CSRF tokens on admin mutations · shared-plan pages rendered with `X-Robots-Tag: noindex` (capability URLs stay unindexed) · SSRF guard: refresh fetcher allow-lists http(s), blocks private IP ranges, caps redirects (it fetches registry-approved origins only).

## Secure admin access

Summarized from [../architecture/auth-and-anonymous-usage.md](../architecture/auth-and-anonymous-usage.md#admin-authentication): argon2id + mandatory TOTP, strict cookies, RBAC server-side, login audit log, 404-cloaked admin pages, no admin endpoints in sitemaps.

## Secret management {#secret-management}

Secrets only in the host's secret store (never in git — enforced by gitleaks in CI) · `.env.example` documents names, never values · per-environment secrets, rotation on staff change · `JOB_TRIGGER_SECRET` and `ADMIN_AUTH_SECRET` ≥ 256-bit random · third-party keys least-privilege where providers allow.

## Legal pages ⚠️ (all: professional legal review required)

Impressum (DE law, likely also CH/AT reachability considerations) · Datenschutzerklärung/privacy policy (bilingual, covering the inventory above) · licence/attribution page (generated from the Licence registry — [../data/provenance-and-licensing.md](../data/provenance-and-licensing.md#licence-registry)) · ODbL/database-rights stance (risk R-04).

## Legal-review checklist {#legal-review-checklist}

1. Impressum + privacy policy texts (DE/EN)
2. Consent-banner-free stance (cookieless analytics + localStorage)
3. ODbL share-alike exposure; database-rights stance for fact extraction
4. Image attribution rendering + operator permission template
5. User-report free-text handling
6. Shared-plan retention/deletion wording
Tracked in [../roadmap/risks.md](../roadmap/risks.md) (R-04, R-05) and [../roadmap/open-questions.md](../roadmap/open-questions.md) (OQ-4, OQ-5).
