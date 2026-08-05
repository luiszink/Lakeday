# Provider and account setup

This guide connects the external accounts and services used by BodenseeGuide. It is deliberately ordered so local development works without paid accounts first.

## What is required now?

| Capability           | Local development                      | Real deployment                                  | Current environment variables |
| -------------------- | -------------------------------------- | ------------------------------------------------ | ----------------------------- |
| PostgreSQL + PostGIS | Docker Compose, no external account    | EU host or managed EU database                   | `DATABASE_URL`                |
| Map tiles and style  | Fake adapter, no account               | Tile provider account and restricted browser key | `MAP_TILE_*`                  |
| Geocoding            | Region picker fallback, no account     | Commercial geocoder account                      | `GEOCODER_*`                  |
| Admin email          | Not required for local login           | Transactional email provider and verified sender | `ADMIN_EMAIL_*`               |
| Weather              | Not wired into the current MVP surface | Provider decision later                          | `WEATHER_*`                   |
| Analytics            | Optional                               | Privacy review plus provider account             | `ANALYTICS_DOMAIN`            |
| Hosting, DNS, TLS    | Not required                           | EU host, domain, and database                    | Host-specific secrets         |

The only external account needed to replace the empty local fake map with real tiles is a tile-provider account. The local database can still contain zero published attractions; in that case the real map has a base layer but no attraction markers.

## 1. Local baseline

1. Install Node.js 22 or later and enable Corepack.
2. Start the local database:

```bash
corepack pnpm install
docker compose up -d --wait
corepack pnpm db:migrate
corepack pnpm db:seed
```

3. Keep application secrets in `apps/web/.env.local`. Do not commit that file. If a Prisma CLI command does not see the variable, also place only the required local `DATABASE_URL` in a root `.env` file; never copy production secrets there.
4. Set local admin values. These are not external accounts:

```dotenv
ADMIN_EMAIL=you@example.com
ADMIN_INITIAL_PASSWORD=use-a-local-password
ADMIN_AUTH_SECRET=generate-a-random-value-at-least-32-characters
ADMIN_ROLE=ADMIN
```

5. Start the app with `corepack pnpm dev`. If port 3000 is occupied, Next.js selects another port such as 3001.

The seed command includes synthetic development fixtures. If the database still reports zero published attractions, check the seed output and database connection before debugging the map UI.

## 2. Map tiles: MapTiler recommendation

The repository uses MapLibre as a renderer, but MapLibre does not provide map tiles. A tile provider supplies the style and tile URLs.

1. Create an account at [MapTiler Cloud](https://cloud.maptiler.com/).
2. Create a project or use the default project.
3. Create a browser API key.
4. Restrict the key to the origins used by the app:
   - local: `http://localhost:3000` and `http://localhost:3001`
   - production: the final HTTPS domain only
5. Select a MapTiler style URL and copy the provider's exact attribution wording and terms URL. Do not invent attribution text.
6. Add the values to `apps/web/.env.local`:

```dotenv
MAP_TILE_URL=https://api.maptiler.com/maps/YOUR_STYLE/style.json
MAP_TILE_API_KEY=your-browser-key
MAP_TILE_PROVIDER_NAME=MapTiler
MAP_TILE_PROVIDER_URL=https://www.maptiler.com/
MAP_TILE_ATTRIBUTION=the-current-provider-required-wording
```

7. Restart the dev server and open `/de/map` or `/en/map`.

The app switches from the fake adapter to MapLibre only when `MAP_TILE_URL`, `MAP_TILE_PROVIDER_NAME`, and `MAP_TILE_ATTRIBUTION` are all set. The API key is a browser key by design, so referrer restrictions are mandatory. Never use a server master key in the client.

### Alternative: OpenFreeMap

OpenFreeMap can be evaluated for development without a key, but verify its current terms, availability, attribution requirements, and suitability before using it in production. Public OpenStreetMap tile servers and public Nominatim are not production providers for this application.

## 3. Geocoding: optional fallback integration

The location picker works without an external provider by showing region quick picks. To enable place search:

1. Create an account with the selected commercial geocoder, currently MapTiler Geocoding or OpenCage is the recommended evaluation path.
2. Create a server-side API key and verify result-storage, rate-limit, and GDPR terms.
3. Configure the provider endpoint and key in `apps/web/.env.local`:

```dotenv
GEOCODER_URL=https://provider.example/geocoding/search
GEOCODER_API_KEY=your-server-key
```

4. Restart the app and test the location picker in both locales.

The key is consumed by `/api/geocode` and must never be exposed as a `NEXT_PUBLIC_*` variable. If either value is absent, the UI intentionally falls back to region selection.

## 4. Admin email: production-only

Admin login works locally without email delivery. Password-reset and review notifications need a transactional email provider.

1. Create an account with the selected EU provider. The current architectural target is [Scaleway Transactional Email](https://www.scaleway.com/en/transactional-email/).
2. Verify the sending domain and configure SPF, DKIM, and the provider's required sender checks.
3. Create a restricted API key and record the API endpoint.
4. Configure:

```dotenv
ADMIN_EMAIL_ENDPOINT=https://provider.example/send
ADMIN_EMAIL_API_KEY=your-server-key
ADMIN_EMAIL_FROM=admin@your-domain.example
```

Do not use a personal mailbox password or an unrestricted account token. Production activation remains blocked until retention, DPA, sender verification, and EU processing terms are reviewed.

## 5. Hosting, database, domain, and TLS

These choices are not fixed yet. Before staging, select an EU-capable host that provides:

- Next.js Node runtime or container support
- PostgreSQL 16+ with PostGIS
- HTTPS custom domain and preview deployments
- Scheduled jobs or a compatible cron service
- backups and point-in-time recovery for production data

Then create separate Local, Preview, Staging, and Production environments. Give each environment its own database, provider keys, admin secret, and job secret. Never reuse local or preview credentials in production.

The production ingress must strip untrusted `X-Forwarded-For` headers and set the trusted client address itself because the API rate limiter uses that address.

## 6. Analytics and weather

Analytics is optional and requires a privacy review. The current recommendation is a cookieless, EU-hosted Plausible setup:

```dotenv
ANALYTICS_DOMAIN=example.com
```

Weather provider variables are reserved for the later weather surface. Do not create or pay for a weather account until the corresponding implementation ticket selects the provider and verifies its current terms.

## 7. Secrets checklist

Generate unique random values for every environment:

```dotenv
ADMIN_AUTH_SECRET=unique-random-value-at-least-32-characters
JOB_TRIGGER_SECRET=another-unique-random-value
```

Store secrets in the host's secret manager or CI environment, not in Git, screenshots, issue comments, or browser-exposed variables. Rotate a key immediately if it was ever committed or shared publicly.

## Go-live order

1. Local Docker database, migrations, and synthetic fixtures.
2. Map provider account, restricted browser key, style, and attribution.
3. Geocoder account and server-side proxy key, if place search is needed.
4. EU host and managed PostGIS database.
5. Domain, TLS, sender domain, and transactional email.
6. Production secrets and separate provider keys.
7. Staging smoke test: list, map, geocode fallback, admin login, password reset, scheduled-job authentication, and attribution links.
8. Production promotion only after provider terms, licensing, privacy, backups, and rollback checks are recorded.

See [external-services.md](../architecture/external-services.md), [system-architecture.md](../architecture/system-architecture.md#environment-variables), and [deployment.md](deployment.md) for the architectural decisions behind these steps.
