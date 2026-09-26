# Avitus Materia — Web Preview

The first customer-facing website lives in `apps/web` and is merged to `main`.

## Fastest preview in GitHub Codespaces

From the repository terminal:

```bash
git checkout main
git pull
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @avitus/web dev
```

The web app runs on port **3001**.

In Codespaces open the **Ports** panel, find port `3001`, then choose **Open in Browser**.

## What works without backend setup

The full public landing page renders without the API running.

The inquiry form UI also renders, but submission intentionally returns a configuration error until the web server has:

```env
AVITUS_API_URL=http://localhost:4000
PUBLIC_INQUIRY_API_KEY=<development-or-production-secret>
```

## Full local inquiry flow

Copy `.env.example` to `.env`, start PostgreSQL/migrations/seed according to the repository development instructions, then run API and web in separate terminals:

```bash
pnpm --filter @avitus/api dev
```

```bash
pnpm --filter @avitus/web dev
```

API: port `4000`
Web: port `3001`

A successful form submission follows:

`Website -> /api/inquiry -> /public/inquiries -> PublicInquirySubmission + CRM Lead`

## Review checklist for the first visual pass

Review both desktop and mobile for:
- brand tone and headline,
- wordmark/logo direction,
- section order,
- actual project categories,
- inquiry fields,
- CTA wording,
- content that should be replaced with real Avitus photography/video.

Do not treat the current abstract material tiles as final portfolio media. They intentionally avoid presenting generated placeholders as real completed work.
