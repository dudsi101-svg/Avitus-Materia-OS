# Hardening 02 — durable public intake budget

Date: 2026-09-29. Base: main f793635 (PR29 logging fix already deployed).
Branch: codex/public-intake-budget. Migration 0010; decision DD-030.

## Problem / current state
Authenticated public proxies can submit unlimited inquiry/configuration writes to CRM. A shared server key protects the API boundary but does not rate-limit website visitors. Both Next proxies await fetch without explicit timeout and turn rate rejection into generic 502. R02 is P0; global availability still needs separate edge protections.

## Design and implementation
- One PostgreSQL counter row per organization. Atomic INSERT/ON CONFLICT with conditional UPDATE admits at most the configured attempts in one database-clock 60-second window; no in-memory bypass on scaling/restart.
- Both write controllers validate the existing server credential first, then consume budget with the server-derived organization, then call business services. Catalog reads are unchanged.
- Default PUBLIC_INTAKE_MAX_PER_MINUTE=60, integer 1–10000; invalid config fails startup. The budget covers attempts, including invalid domain payloads after credential validation. No client-supplied org/IP controls the key.
- Exhaustion: 429 + Retry-After: 60 before domain writes. Store unavailable: safe 503, fail closed, no raw database details.
- Web proxies share one server-only forwarding helper: 8-second timeout, correlated no-store responses, preserved 429, safe error text and validated acknowledgement. No automatic retry of possibly committed writes. Inquiry success now also returns the server reference (additive).
- Migration is additive. It stores no customer PII. A primary key bounds storage to one row per organization; there is no per-request persistent event amplification.

## Risks / limits
A coarse shared budget may be exhausted by an attacker, delaying legitimate callers until renewal. It bounds CRM writes but does not provide per-client fairness, prevent request parsing/connection exhaustion or replace edge/WAF limits. Fixed-window boundary bursts are possible. Distributed per-client limits require a verified ingress identity contract, not arbitrary X-Forwarded-For. Idempotency, bounded browser request bodies, alert routing and denial metrics remain open. Timeout does not prove failure; the UI explicitly asks users to check before resubmitting.

The production configurator remains a demo fallback at the start of this work. This patch does not assume that upgrading web repairs its runtime credential/catalog configuration.

## Acceptance / proof
1. PostgreSQL concurrency across independent pools admits exactly 7 of 40 parallel attempts, persists 7, survives a new repository instance and isolates another organization.
2. Expired window reopens exactly once, without extra rows; unknown org and invalid budgets reject.
3. HTTP test proves both endpoints share server-derived budget, blocked requests never reach business services, credentials precede consumption and catalog reads remain unthrottled.
4. Store failure returns 503 without sensitive details; 429 has Retry-After.
5. Both web route handlers preserve 429; timeout/credential scope/no automatic replay/malformed acknowledgement are tested.
6. Config/API/web typechecks, existing tests, migration clean load, CI and deployment pass; production smoke uses read-only/invalid-input requests, not a real-data load test.

## Validation state
- Local: 3 HTTP budget tests + 3 existing logging tests passed; 5 web proxy/route tests passed; 4 config tests passed.
- Local config/database compilation and API/web typechecks passed; boundary/coordination checks passed.
- Real PostgreSQL integration tests: implemented, awaiting repository CI (no local PostgreSQL).
- Full CI, merge, migration, deployment and production smoke: pending. Not DONE.

## Deployment / rollback
Existing pipeline deploys web before API. Web remains compatible with old successful API acknowledgements; it simply handles future 429s. API release runs migration before starting new code. Do not drop the budget table during rollout or rollback. To revert, revert application changes; extra counter table is harmless. Tune the budget through validated configuration only; do not disable authentication or bypass the gate on store failure.

## Remaining gate work
Edge/per-client abuse limits and request-size controls; monitoring/alert/restore proof; dependency updates; production identity/tenant constraints; real catalog-backed frontend verification. Gate 1 remains open.
