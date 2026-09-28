# Hardening 01 — safe HTTP failure logging

Date: 2026-09-28. Branch: `codex/system-reconciliation-hardening`.

## Problem / baseline
At main `68ea544`, HttpErrorFilter logs `{ correlationId, exception }`. PostgreSQL/Drizzle errors can contain SQL parameters, nested causes, customer details or credentials. Client 500 responses are generic, but operational logs can retain sensitive input. Explicit HTTP 5xx exceptions are not logged by this filter.

## Smallest solution
Replace raw error logging with one JSON record containing only level, event, timestamp, validated middleware correlation ID and status code. Record explicit HTTP 5xx failures too. Do not log request URL/body/headers, exception message/detail/cause/stack or driver object. Existing API response contract is unchanged. No migration, dependency or business rule changes.

## Risks / limits
Less detail for debugging: use correlation ID plus service/audit state; do not restore raw SQL parameters to regain convenience. This is not an error reporting provider or alert pipeline. Bootstrap/migration logging and all application log sinks need separate review. Gate 1 remains open. No production exception is deliberately induced on customer paths.

## Acceptance criteria
- Nested DB errors/arbitrary thrown values cannot leak supplied private strings into logs or 500 bodies.
- Failure record is machine-readable and retains correlation ID.
- Explicit HTTP 503 creates an error signal; 400 does not create a server-error signal.
- Typecheck and existing CI pass; code merged/deployed; health/auth smoke retains behavior.

## Implementation / validation
- `apps/api/src/http-error.filter.ts`: allowlisted JSON error event.
- `apps/api/src/http-error.filter.test.ts`: 3 regression tests (SQL params/cause/stack/arbitrary values; 503; 400).
- Local focused tests: 3/3 passed.
- Dependencies compiled with TypeScript in dependency order (13 workspace packages). Initial test/typecheck attempts before building workspace dependencies could not resolve packages; rerun after build is authoritative.
- Local API typecheck after dependency build: passed.
- Module boundary and coordination checks: passed.
- Full PostgreSQL integration/clean-load suite: delegated to repository CI; local PostgreSQL is not installed. Do not claim skipped DB tests passed locally.
- PR / main CI / deployment / production verification: pending. This file must be updated with observed evidence before calling the slice done.

## Rollback
Revert the filter change if it breaks response handling, retaining tests as appropriate; no database rollback needed. Reverting reintroduces log privacy risk, so prefer a corrected allowlisted serializer. No client contract changed.

## Documentation
Reconciled PROJECT_STATE, NEXT_ACTION, WORK_BOARD, README, ROADMAP and Sprint 9 status. SYSTEM_RECONCILIATION_2026-09-28 includes A–K audit deliverables and risk/gate plan. Source workbooks are unchanged.
