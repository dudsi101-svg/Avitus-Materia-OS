# Incidents

## INC-001 — Public inquiry form returned HTTP 500

**Date:** 2026-09-27  
**Severity:** P0  
**Status:** fixed in `fix/api-listen-ipv6`

### Impact
`POST https://avitus-materia.com/api/inquiry` returned HTTP 500, so website inquiries did not reach the CRM. Public pages and the API readiness endpoint remained healthy, therefore the normal health checks did not detect the customer-path outage.

### Root cause
The public Next.js web app was configured to call the API through Fly private networking at `http://avitus-materia-api.internal:4000`. Fly `.internal` private networking resolves over IPv6. The NestJS API process listened only on `0.0.0.0` (IPv4), so private IPv6 connections were refused.

### Immediate mitigation
Point the web application at the public TLS API endpoint while the code fix is being rolled out:

```bash
fly secrets set AVITUS_API_URL=https://avitus-materia-api.fly.dev -a avitus-materia-web
```

The public inquiry API key remains server-side in the web application.

### Permanent fix
- add validated `API_LISTEN_HOST` configuration;
- keep the portable default `0.0.0.0` for local/non-IPv6 environments;
- set `API_LISTEN_HOST = "::"` in `fly.api.toml` so the Fly API process accepts IPv6/private-network connections while remaining compatible with Fly's dual-stack proxy path;
- bind NestJS using the validated host instead of hard-coding IPv4.

### Verification
After deployment:

1. `GET https://avitus-materia-api.fly.dev/ready` must be healthy;
2. submit the production inquiry form and expect HTTP 201 with `{ "ok": true }`;
3. confirm the resulting public inquiry / CRM lead exists;
4. inspect API logs and confirm the process listens on `[::]:4000`.

### Rollback
If the Fly runtime does not accept the IPv6 wildcard as expected, set `API_LISTEN_HOST` back to `0.0.0.0` and temporarily keep the web application on the public API URL until the private-network path is revalidated.

### Prevention
Readiness probes are not sufficient for cross-service customer journeys. Maintain an end-to-end production smoke test for `website -> inquiry proxy -> API -> CRM intake` in addition to service-level health checks.
