# Avitus Materia — Production Deployment v0.1

**Status:** implementation-ready
**Domain registrar / DNS:** home.pl
**Runtime platform:** Fly.io
**Public domain:** `Avitus-Materia.com`

## Production topology

Keep the domain and DNS at home.pl. Run the application stack on Fly.io:

- `https://avitus-materia.com` -> Fly App running `apps/web` (Next.js)
- `https://www.avitus-materia.com` -> same Fly web app, canonical redirect handled at DNS/app edge as configured
- `https://api.avitus-materia.com` -> Fly App running `apps/api` (NestJS)
- website server -> API over Fly private network where practical (`http://<api-app>.internal:4000`)
- PostgreSQL -> Fly Managed Postgres
- DNS -> home.pl

The domain does **not** need to be transferred away from home.pl.

## Why Fly.io

Avitus Materia OS is not only a marketing website. The roadmap includes API services, background jobs, AI/media workers, automations and partner/customer surfaces. Keeping web, API and database in one Fly organization gives us one deployment environment and a private network between services.

The public website and API remain separate Fly Apps so they can be scaled and deployed independently.

## Region

The baseline configuration uses `fra` (Frankfurt). Fly deprecated the Warsaw `waw` region in its 2025 region consolidation, so Frankfurt is the preferred nearby baseline for Poland unless an existing Avitus Fly deployment already uses another supported European region.

**Rule:** keep the API and primary database in the same region. The web app should normally use the same region for the first release.

## Repository deployment files

- `Dockerfile.web` — Next.js production image
- `Dockerfile.api` — NestJS API image plus database migration/bootstrap tooling
- `fly.web.toml` — public website Fly configuration
- `fly.api.toml` — API Fly configuration and release command
- `.dockerignore` — build-context exclusions

The default proposed app names are:
- `avitus-materia-web`
- `avitus-materia-api`

Fly App names are globally unique. If either name is unavailable or existing Avitus Fly Apps already have other names, use the existing/available names and deploy with `-a <app-name>`; then update the `app` value in the matching TOML file.

## Production database bootstrap

The API release command runs before a new release begins serving traffic:

```text
pnpm db:migrate && pnpm db:bootstrap:prod
```

The production bootstrap is idempotent. It creates only the Avitus Materia organization required by the public inquiry flow. It does **not** create development users, development roles or development credentials.

Required API secrets:

```text
DATABASE_URL=<set automatically by Fly Managed Postgres attach>
PUBLIC_INQUIRY_ORGANIZATION_ID=<stable production UUID>
PUBLIC_INQUIRY_API_KEY=<strong random secret>
```

Required web secrets:

```text
AVITUS_API_URL=http://<api-app-name>.internal:4000
PUBLIC_INQUIRY_API_KEY=<same strong random secret as API>
```

`PUBLIC_INQUIRY_API_KEY` must never use a `NEXT_PUBLIC_` prefix.

## Authentication boundary for v0.1

The API runs with:

```text
NODE_ENV=production
AUTH_MODE=external
```

The production external identity adapter is not implemented yet. This is intentional: private/internal endpoints remain inaccessible rather than falling back to insecure development headers.

The following can operate for website v0.1:
- `/public/inquiries`
- `/health`
- `/ready`

## Fly Managed Postgres

Use Fly Managed Postgres (MPG), not a new unmanaged Postgres app.

Recommended flow:
1. List any existing managed clusters first: `fly mpg list`.
2. Reuse a suitable existing Avitus cluster if one already exists in the correct organization/region.
3. Otherwise create a new MPG cluster using Fly dashboard or `fly mpg create`.
4. Keep the primary database in the same region as the API (`fra` by default).
5. Attach the cluster to the API app with `fly mpg attach <CLUSTER_ID> -a <API_APP>`.

The attach operation sets `DATABASE_URL` on the API app.

## First deployment order

Deploy API first, then web.

### 1. API

After app creation, database attachment and secrets:

```bash
fly deploy -c fly.api.toml -a <API_APP>
```

The release command runs migrations and production organization bootstrap before the new API release receives traffic.

Validate:

```bash
fly status -a <API_APP>
fly checks list -a <API_APP>
```

Then verify the Fly URL:

```text
https://<API_APP>.fly.dev/health
https://<API_APP>.fly.dev/ready
```

### 2. Web

Set web secrets so the Next.js server route calls the API privately:

```text
AVITUS_API_URL=http://<API_APP>.internal:4000
PUBLIC_INQUIRY_API_KEY=<same key as API>
```

Deploy:

```bash
fly deploy -c fly.web.toml -a <WEB_APP>
```

Validate the temporary Fly URL before touching production DNS:

```text
https://<WEB_APP>.fly.dev
```

Submit one test inquiry and confirm the request reaches the API.

## Custom domains and home.pl

Do **not** change home.pl DNS until both Fly Apps work correctly on their `.fly.dev` addresses.

Add the hostnames to Fly:

```bash
fly certs add avitus-materia.com -a <WEB_APP>
fly certs add www.avitus-materia.com -a <WEB_APP>
fly certs add api.avitus-materia.com -a <API_APP>
```

For each hostname, inspect the DNS requirements Fly returns. Use the exact values Fly provides. Do not copy generic addresses from documentation.

In home.pl:
1. Panel klienta -> **Domeny**.
2. Open `Avitus-Materia.com`.
3. **Hosting DNS -> Opcje -> Zarządzaj rekordami DNS**.
4. Add/change only records required for the three Fly hostnames.
5. Do not modify mail records unless intentionally changing the mail provider.

Preserve existing:
- MX
- SPF TXT
- DKIM
- DMARC
- any other verified mail/service records

Expected logical mapping:

```text
@       -> Fly web app DNS requirement
www     -> Fly web app DNS requirement
api     -> Fly API app DNS requirement
```

For the apex domain Fly may ask for A/AAAA records; subdomains commonly use CNAME. Always follow the live certificate/DNS requirements shown by Fly.

## TLS

Fly Proxy terminates TLS and Fly can issue and renew Let's Encrypt certificates automatically. Do not purchase an additional web TLS certificate from home.pl for this deployment unless there is a separate business requirement.

## Production smoke test

After DNS/TLS has propagated:

1. Open `https://avitus-materia.com` on desktop and mobile.
2. Confirm the TLS certificate is valid.
3. Confirm `https://www.avitus-materia.com` resolves as intended.
4. Open `https://api.avitus-materia.com/health`.
5. Open `https://api.avitus-materia.com/ready`.
6. Submit a test inquiry through the public website.
7. Confirm the website returns success.
8. Confirm the API persisted both `public_inquiry_submissions` and the matching CRM Lead.
9. Verify no PII was copied into audit/event/outbox payloads.
10. Verify existing email still sends and receives after DNS changes.

## Before broad marketing launch

Still required or strongly recommended before treating v0.1 as a broad public launch:
- final privacy/consent wording and retention rules,
- edge/API rate limiting for public inquiry,
- real Avitus realization photography,
- production monitoring/alerts,
- external identity provider before exposing admin/internal features.

## Operational principle

For v0.1 prefer simplicity:

`home.pl DNS -> Fly web -> Fly private network -> Fly API -> Fly Managed Postgres`

Do not introduce Vercel/Railway unless a measured limitation later justifies splitting the stack.
