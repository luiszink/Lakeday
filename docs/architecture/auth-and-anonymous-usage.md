# Auth and anonymous usage

Status: **architectural decision** ([ADR-004](../adr/ADR-004-anonymous-favorites.md)): anonymous-first for tourists; accounts only for admin staff in MVP.

## Principles

1. **Tourists never need an account** for any MVP feature (REQ-FAV-01, REQ-PLAN-11).
2. **No anonymous server-side user identity either**: no device IDs, no fingerprinting, no session cookies for public pages. Local data stays local until the user explicitly shares.
3. Admin access is strongly authenticated and completely separated from public routes.

## Anonymous data model

| Data | Where | Server sees it? |
|---|---|---|
| Favorites | IndexedDB `{attractionId, addedAt, syncState}` | Never |
| Current plan | IndexedDB (same shape as server `Plan`) | Only if shared |
| Saved plans | IndexedDB snapshots | Only shared ones |
| Locale + last location choice | localStorage | Locale via URL only; location sent rounded (~100 m) in queries, never stored ([../quality/security-and-privacy.md](../quality/security-and-privacy.md#location-data)) |

Consequences users must know (documented in-product, More tab): clearing site data deletes favorites/plans; no cross-device sync in MVP.

## Share tokens {#share-tokens}

- Generated server-side: 22+ chars from `crypto.randomBytes(16)` base64url ⇒ ≥128-bit entropy, unguessable (REQ-PLAN-09).
- Knowledge of the token = read access (capability URL). Documented in the privacy policy; plans contain no PII beyond a rounded start point and a label the user typed.
- No enumeration endpoint; token lookup via unique index; 404 on miss; per-IP rate limiting on lookups to slow brute force (which is computationally hopeless at 128 bits anyway).
- Creation rate-limited (10/h/IP) and capped (≤20 stops) against abuse/storage flooding (REQ-SEC-02).
- Expiry: 12 months after last access ([../ux/favorites-and-plans.md](../ux/favorites-and-plans.md#shared-plans)).

## Admin authentication {#admin-authentication}

- Small fixed staff (editors/reviewers/admin). MVP: email + password (argon2id) **+ mandatory TOTP 2FA**, HTTP-only SameSite=Strict session cookies signed with `ADMIN_AUTH_SECRET`, absolute session lifetime 12 h.
- Library: Auth.js (NextAuth v5) credentials provider or Lucia — final pick in ticket LAKE-014 (criterion: clean App-Router session handling + CSRF).
- Roles ([domain-model.md](domain-model.md#adminuser)): `EDITOR` (CRUD drafts, propose), `REVIEWER` (approve change proposals, publish), `ADMIN` (user management, source registry). Enforced server-side per route handler.
- Brute-force protection: per-account exponential backoff + per-IP limit; login events logged ([../operations/observability.md](../operations/observability.md)).
- `/admin` is `noindex`, excluded from sitemaps, and returns 404 for unauthenticated *page* requests (no login-page fingerprinting of the admin path beyond the standard `/admin/login`).

## Future optional accounts (phase 1.5+) {#future-optional-accounts}

Planned, not built (REQ-FAV-03 compatibility only):

- Tourist accounts become **optional** (OAuth/passkey-first, no passwords ideally) purely for cross-device sync of favorites/plans.
- Local records already carry `syncState`; migration = upload local set, merge by `(attractionId, addedAt)` union server-side; conflicts impossible by construction (sets).
- Nothing in MVP schema references a tourist-user table; adding one later is additive (new table + optional FK on `plan`).
