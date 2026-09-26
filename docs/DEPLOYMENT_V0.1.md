# Avitus Materia — Production Deployment v0.1

**Status:** implementation-ready
**Domain registrar / DNS:** home.pl
**Public domain:** `Avitus-Materia.com`

## Recommended production topology

- `https://Avitus-Materia.com` -> Vercel (`apps/web`)
- `https://www.Avitus-Materia.com` -> redirect to apex domain
- `https://api.Avitus-Materia.com` -> Railway (`apps/api`)
- PostgreSQL -> Railway managed PostgreSQL
- DNS remains managed in home.pl

The domain does not need to be transferred away from home.pl.

## Why this split

The current project is a pnpm/Turborepo monorepo using Next.js, NestJS and PostgreSQL. Vercel is the natural runtime for `apps/web`; Railway provides a simple persistent Node.js runtime and PostgreSQL for the API. home.pl remains the authoritative DNS provider.

## Vercel setup — public website

Create a Vercel project from `dudsi101-svg/Avitus-Materia-OS`.

Settings:
- Framework: Next.js
- Root Directory: `apps/web`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && pnpm turbo run build --filter=@avitus/web`
- Output Directory: `.next`
- Production branch: `main`

Production environment variables:

```text
AVITUS_API_URL=https://api.Avitus-Materia.com
PUBLIC_INQUIRY_API_KEY=<same strong secret as API>
```

`PUBLIC_INQUIRY_API_KEY` is server-side only. Never expose it with a `NEXT_PUBLIC_` prefix.

After the first successful Vercel deployment, add custom domains:
- `Avitus-Materia.com`
- `www.Avitus-Materia.com`

Use the exact DNS values Vercel displays rather than hard-coding provider defaults.

## Railway setup — API and PostgreSQL

Create a Railway project from the same GitHub repository and add a PostgreSQL service.

API service uses `/railway.json` from this repository.

Production environment variables:

```text
NODE_ENV=production
AUTH_MODE=external
DATABASE_URL=<Railway PostgreSQL connection URL>
PORT=<Railway-provided PORT>
ADMIN_ORIGIN=https://Avitus-Materia.com
PUBLIC_INQUIRY_ORGANIZATION_ID=<production Avitus Materia organization UUID>
PUBLIC_INQUIRY_API_KEY=<strong random secret, minimum 24 chars>
```

The API intentionally leaves private/internal endpoints unavailable until the external identity adapter is implemented. `/public/inquiries`, `/health` and `/ready` can operate without enabling insecure development authentication.

Railway pre-deploy runs database migrations and the production organization bootstrap before starting the API.

Add custom domain:
- `api.Avitus-Materia.com`

Use the exact CNAME target Railway provides.

## Production bootstrap

The production bootstrap is idempotent and creates only the Avitus Materia organization required by the public inquiry flow. It does **not** create development users, development roles or development credentials.

Required variables:
- `DATABASE_URL`
- `PUBLIC_INQUIRY_ORGANIZATION_ID`

The organization is created as:
- name: `Avitus Materia`
- slug: `avitus-materia`

## home.pl DNS procedure

Do not change DNS until both Vercel and Railway have generated their custom-domain targets.

In home.pl:
1. Panel klienta -> **Domeny**.
2. Open `Avitus-Materia.com`.
3. **Hosting DNS -> Opcje -> Zarządzaj rekordami DNS**.
4. Add/edit only the records requested by Vercel and Railway.
5. Keep existing MX/TXT/SPF/DKIM/DMARC records untouched unless intentionally changing email service.

Expected logical mapping:

```text
@      -> Vercel website target
www    -> Vercel website target / redirect
api    -> Railway API CNAME target
```

The exact A/CNAME values are provider-generated and must be copied from the deployment dashboards at deployment time.

## Production smoke test

After DNS/TLS has propagated:

1. Open `https://Avitus-Materia.com` on desktop and mobile.
2. Confirm TLS certificate is valid.
3. Open `https://api.Avitus-Materia.com/health`.
4. Open `https://api.Avitus-Materia.com/ready`.
5. Submit a test inquiry through the public website.
6. Confirm HTTP 201 from the Next.js server route.
7. Confirm the API persisted both `public_inquiry_submissions` and the corresponding CRM Lead.
8. Verify no PII is duplicated into audit/event/outbox payloads.
9. Verify `www` redirects to the canonical apex domain.
10. Verify existing email DNS still works.

## Before broad launch

Still required before treating v0.1 as fully production-ready:
- edge rate limiting / WAF on the public inquiry endpoint,
- final privacy/consent copy and retention policy,
- real Avitus realization photography,
- production monitoring/alerts,
- external identity provider before exposing internal/admin features.
