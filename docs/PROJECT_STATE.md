# Avitus Materia OS — Project State

**Checkpoint:** System reconciliation + production hardening
**Date:** 2026-09-29
**Original audit baseline:** `68ea54441881c978eb6f18e8d4ae354689c1bf55`; release evidence below supersedes original hardening gaps.
**Verdict:** deployed sales foundation; operational v1 is not complete.

## Evidence
- Sprint 9 merged in PR #28; main CI #136 / run 36449482063 passed.
- Fly API deployment #78 / run 36449743352 attempt 2 passed, including readiness; web skipped.
- Live production `/ready` 200 and public `/kreator` 200; internal `/leads` 401 because external identity adapter is absent.
- Browser inspection of `/kreator` shows ConfiguratorLite demo without configuration submission. A successful HTTP check does not establish functioning catalog intake; runtime cause is unresolved (R17).
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
- Public intake has a tested durable organization budget and proxy timeouts (PR30); per-client/edge controls, request-size bounds and idempotency remain open.
- Tenant isolation is application-heavy; composite FKs are inconsistent and role-to-organization integrity needs hardening.
- Backup restore, external alerting and secret configuration were not accessible for verification.
- Quote SENT is not evidence of actual document/email delivery. Customer acceptance evidence flow is incomplete.
- Physical Truth source files are predominantly templates/unverified drafts, not measured workshop truth.
- Material/production/QC/delivery/actual-cost loop does not exist yet; pricing margin is estimated, not actual.
- Outbox worker, production identity, privacy lifecycle and AI context tooling are not implemented.

## Completed first hardening deployment
PR #29 merged as `d43bb53`; full main CI 36465241308 passed; API deployment 36465461468 and readiness passed; deployed-api tag matches. Raw HTTP exception logging is replaced with allowlisted JSON. Three privacy/error regression tests passed; no migration or business-rule change. See [IMPLEMENTATION_HARDENING_01.md](IMPLEMENTATION_HARDENING_01.md) for limits and verification evidence. Gate 1 remains open.

## Next sequence
1. Gate 1: PII-safe errors, public abuse controls, recovery proof, alerts, dependency/security/privacy baseline.
2. Gate 2: production identity, tenant/permission hardening, deployed operator UI and browser smoke.
3. Complete Gates 3–5: commercial communication/acceptance, full Order, executable Project.
4. Gates 6–9: verified physical data -> materials -> production/QC -> measured capacity -> delivery -> actual costs/contribution.
5. Prove a real closed-loop v1 job, then automation, AI and partner capabilities.

DATA TRUTH -> AUTOMATION -> INTELLIGENCE remains the governing principle. GitHub is durable memory; WORK_BOARD tracks active lanes.

## Hardening 02 — release verification (2026-09-29)
PR #30 merged at `04f697d`, migration 0010 / DD-030. Shared PostgreSQL intake budget + safe 429/503 and web timeout handling. PR CI 36533118415 and main CI 36533385390 passed, including real PostgreSQL concurrency proof (7 of 40 attempts admitted), all tests and build. R02 remains PARTIAL until broader ingress controls are verified. Production ConfiguratorLite fallback was observed again Sep 29; no intake success is claimed.

### 2026-09-29 — deployment provenance hardening

R18 P0 found in workflow_run job predicate: branch name plus CI success did not distinguish PRs from trusted pushes. Hardening 03 adds event and repository checks before the privileged job starts, with ten regression scenarios. PR #31 merged at `7f94a65`; full PR CI 36533882562 passed. Main CI 36534116244 passed; workflow 36534332017 admitted the trusted main push. Untrusted cases remain verified by the predicate regression, not a live exploit. See `IMPLEMENTATION_HARDENING_03.md`.

## Current release truth — 2026-09-29 12:02 UTC
Main and API tag: d3a8de6; web tag: 04f697d. PR30 migration 0010 applied and API budget is now DEPLOYED. Successful release 36565136322 supersedes two earlier bootstrap connection failures. PR32/33 add bounded, privacy-safe, read-only release diagnostics; all PR/main CI runs passed. Preflight found organization present, two products and no visible lock waits. Original transient connection failure root cause is not established.

PR31 deployment provenance protection is active on main. The rate-budget 429 behavior is proven in real PostgreSQL/HTTP CI, not by a production load test. Broader R02 controls remain open. See IMPLEMENTATION_HARDENING_02/03/04 for exact evidence.
