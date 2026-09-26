# Sprint 3 — Public Website v0.1 + Inquiry Intake

## Goal
Deliver the first customer-facing Avitus Materia website without creating a second source of truth outside Avitus Materia OS.

Primary flow:

`Public Website -> Website Server Route -> Public Inquiry API -> PublicInquirySubmission -> Lead -> Audit/Event/Outbox`

## Scope

### Public website
- `apps/web` Next.js application
- responsive landing page for Avitus Materia
- first brand/positioning copy
- sections: material, process, project directions, configurator roadmap, inquiry
- SEO/OpenGraph baseline for `Avitus-Materia.com`
- inquiry form with client-side status handling and honeypot field

### Public inquiry boundary
Browser code does **not** receive an API credential.

The browser posts to `/api/inquiry` inside `apps/web`. That server route validates the request and forwards it to the Avitus API with `PUBLIC_INQUIRY_API_KEY` kept server-side.

The NestJS endpoint is explicitly marked with `@PublicRoute()`, bypassing user authentication only for that controller action. It then requires the separate public-inquiry credential using constant-time comparison.

### Acquisition source of truth
A website inquiry creates two records in one database transaction:
1. `Lead` — the CRM entity used by the internal sales process.
2. `PublicInquirySubmission` — immutable raw intake containing the original name/contact/project description.

The intake record exists so no customer message is lost while the broader Person / ContactPoint / Conversation model is still being implemented.

PII is retained in the intake table but deliberately omitted from domain-event and audit payload snapshots.

## Database
Migration: `0003_public_inquiry.sql`

New table:
- `public_inquiry_submissions`

Key linkage:
- `organization_id`
- `lead_id`

## Configuration
API:
- `PUBLIC_INQUIRY_ORGANIZATION_ID`
- `PUBLIC_INQUIRY_API_KEY`

Web server:
- `AVITUS_API_URL`
- `PUBLIC_INQUIRY_API_KEY`

`PUBLIC_INQUIRY_ORGANIZATION_ID` and `PUBLIC_INQUIRY_API_KEY` must be configured together on the API.

## Security properties
- public endpoint is opt-in and disabled when configuration is missing
- website secret remains server-side
- public endpoint does not reuse development user headers
- target organization is controlled by server configuration, never by browser input
- constant-time key comparison
- schema validation on website server and API domain boundary
- honeypot rejection
- PII excluded from event/outbox/audit snapshots

## Production hardening still required
Before opening production traffic:
- edge rate limiting / WAF rule for inquiry endpoint
- real production secrets manager values
- abuse monitoring and alerting
- privacy-policy / consent copy review
- retention/anonymization policy for inquiry PII
- deployment and domain/DNS configuration

## Visual limitations of v0.1
The site intentionally uses material abstractions instead of pretending placeholder images are real Avitus projects. Real photography and video should come from the central realization library once the media pipeline is established.

## Acceptance criteria
- frozen-lockfile install passes
- all DB migrations pass including `0003`
- existing Sprints 0–2 tests remain green
- public inquiry without credential returns 401
- valid inquiry creates exactly one CRM Lead and one intake record
- inquiry event/audit payloads do not expose email/phone
- honeypot request returns validation error
- `apps/web` typechecks and builds in CI
- all existing apps/modules still build

## What this unlocks
After Sprint 3, Avitus Materia has a first real customer-facing surface. The next customer-value steps are:
1. replace abstract project tiles with actual realization media,
2. deploy web + API and connect `Avitus-Materia.com`,
3. add first guided Product Configurator flow,
4. expose controlled indicative pricing only where pricing policy permits,
5. later add room-photo analysis and visualization.
