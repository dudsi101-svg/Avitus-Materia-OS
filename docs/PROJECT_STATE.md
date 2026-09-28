# Avitus Materia OS — Project State

**Checkpoint:** System reconciliation after Sprint 9
**Date:** 2026-09-28
**Verified baseline main:** `68ea54441881c978eb6f18e8d4ae354689c1bf55`
**Verdict:** deployed sales foundation; operational v1 is not complete.

## Evidence
- Sprint 9 merged in PR #28; main CI #136 / run 36449482063 passed.
- Fly API deployment #78 / run 36449743352 attempt 2 passed, including readiness; web skipped.
- Live production `/ready` 200 and public `/kreator` 200; internal `/leads` 401 because external identity adapter is absent.
- Migration 0009 is in the release path; production migration ledger not independently queried.
- Full baseline, risk register P0–P4, gaps, dependencies, gates and first ten actions: [SYSTEM_RECONCILIATION_2026-09-28.md](SYSTEM_RECONCILIATION_2026-09-28.md).

## Implemented / deployed scope
Modular monolith: Next.js web/admin, NestJS API, PostgreSQL/Drizzle, scoped services, exact decimal pricing, audit/events/transactional outbox.

Sprints 0–8: foundation; leads/opportunities/catalog/configuration history; deterministic pricing and quote versions; public inquiry/configurator; customer identity and explicit linking; buyer/tax/discount governance and READY/SENT transitions.

Sprint 9: explicit acceptance of a SENT QuoteVersion; separate quote_acceptances table; one-time Order snapshot and separate Project in one transaction; acceptance/order/project API routes; one happy-path database-backed E2E with sequential replay and audit/event checks. Order starts CONFIRMED; Project starts PLANNING. This is a minimal API slice, not full Gate 4/5 completion.

## Important limits
- Production internal auth fails closed; admin still sends development headers. No production authenticated operator journey.
- Sprint 9 admin controls, OrderItems/payment/delivery data and full lifecycle are absent.
- Project has no tasks, approvals, drawings/change requests or execution UI yet.
- Public intake has no verified rate budget/idempotency; proxies lack explicit timeout/error handling.
- Tenant isolation is application-heavy; composite FKs are inconsistent and role-to-organization integrity needs hardening.
- Backup restore, external alerting and secret configuration were not accessible for verification.
- Quote SENT is not evidence of actual document/email delivery. Customer acceptance evidence flow is incomplete.
- Physical Truth source files are predominantly templates/unverified drafts, not measured workshop truth.
- Material/production/QC/delivery/actual-cost loop does not exist yet; pricing margin is estimated, not actual.
- Outbox worker, production identity, privacy lifecycle and AI context tooling are not implemented.

## Active hardening slice
Branch `codex/system-reconciliation-hardening`: reconcile durable state and replace raw HTTP exception logging with allowlisted JSON failures. No migration or business-rule change. See [IMPLEMENTATION_HARDENING_01.md](IMPLEMENTATION_HARDENING_01.md) for validation and deployment state; do not infer deployment from this branch's source.

## Next sequence
1. Gate 1: PII-safe errors, public abuse controls, recovery proof, alerts, dependency/security/privacy baseline.
2. Gate 2: production identity, tenant/permission hardening, deployed operator UI and browser smoke.
3. Complete Gates 3–5: commercial communication/acceptance, full Order, executable Project.
4. Gates 6–9: verified physical data -> materials -> production/QC -> measured capacity -> delivery -> actual costs/contribution.
5. Prove a real closed-loop v1 job, then automation, AI and partner capabilities.

DATA TRUTH -> AUTOMATION -> INTELLIGENCE remains the governing principle. GitHub is durable memory; WORK_BOARD tracks active lanes.
