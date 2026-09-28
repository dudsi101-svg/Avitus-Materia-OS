# Implementation Sprint 9 — Accepted Quote -> Order + Project

**Status:** planned / claimed  
**Date:** 2026-09-28  
**Owner:** GPT/Writer  
**Branch:** `writer/post-sprint8-state-sprint9-plan`  
**Reserved:** migration `0009`, decision `DD-029`

## Goal
Cross the boundary from governed sales truth into operational execution without collapsing commercial commitment and manufacturing work into one entity.

Target flow:

`Quote SENT -> explicit ACCEPT -> accepted QuoteVersion -> Order -> Project`

`Order` is the commercial commitment. `Project` is the operational execution (DD-018).

## Why this is next
Sprint 8 established a governed, immutable customer-ready QuoteVersion with buyer snapshot, explicit commercial terms and controlled READY/SENT states. The system can now explain exactly what was offered. The next coherent step is to record explicit customer acceptance and turn exactly that accepted commercial version into one Order, then establish a separate Project that will later own scheduling/material/production execution.

## Product rules
1. Only a governed `SENT` (or later customer-view state explicitly allowed by policy) Quote may become `ACCEPTED`.
2. Acceptance identifies the exact current QuoteVersion being accepted. That version is never recomputed or overwritten.
3. One accepted Quote creates at most one Order. Conversion must be one-time and concurrency-safe.
4. Order snapshots/references the accepted commercial truth; it does not recalculate price/tax/discount.
5. Project is a separate operational aggregate linked to Order/configuration.
6. No promised completion date is invented in Sprint 9. Scheduling comes only after BusinessCalendar/capacity truth.
7. No production/material status is overloaded onto Order.

## Proposed persistence — migration `0009`

### Quote acceptance
Extend `quotes` with acceptance metadata:
- `accepted_at timestamptz`;
- `accepted_version_number integer`;
- `accepted_by_actor_type` / `accepted_by_actor_id` only if the existing event/audit trail is insufficient for current-state reads; prefer not duplicating actor state unless operationally needed.

A DB constraint should require `accepted_at` and `accepted_version_number` together.

### `orders`
Minimum fields:
- `id uuid`;
- `organization_id uuid`;
- `order_number varchar`;
- `quote_id uuid`;
- `quote_version_number integer`;
- `opportunity_id uuid`;
- `customer_account_id uuid`;
- `configuration_id uuid`;
- `currency varchar(3)`;
- `subtotal`, `discount_amount`, `tax_amount`, `total`, `estimated_cost`, `margin_amount`, `margin_bps` as accepted snapshot values;
- `buyer_snapshot jsonb` copied from the accepted QuoteVersion;
- status initially `CONFIRMED` (or smallest commercial lifecycle enum); 
- timestamps / creator.

Unique constraint on `(organization_id, quote_id)` (or quote id if globally unique) makes conversion one-time.

### `projects`
Minimum fields:
- `id uuid`;
- `organization_id uuid`;
- `order_id uuid` unique;
- `configuration_id uuid`;
- `name` / internal title;
- status initially `PLANNING`;
- owner user optional;
- timestamps.

No promised/start/end dates in this sprint unless they are explicitly nullable placeholders and never inferred.

## Quote acceptance service
Add an explicit action, likely `POST /quotes/:id/accept`.

Preconditions:
- permission to record acceptance;
- Quote exists in organization;
- current status is `SENT` (optionally `VIEWED`/`NEGOTIATION` only when explicitly approved by policy; smallest v1 = SENT only);
- current QuoteVersion exists and is governed (buyer snapshot/tax/validity); 
- quote not expired/withdrawn;
- current version is the version recorded as accepted.

On success:
- set `status = ACCEPTED`, `accepted_at`, `accepted_version_number` atomically;
- emit `QuoteAccepted` with ids/version/totals only;
- audit acceptance without buyer PII.

Repeated acceptance of the same accepted version may be idempotent. A different version must conflict.

## Order + Project conversion service
Explicit action, likely `POST /quotes/:id/create-order` or a single `POST /quotes/:id/accept-and-create-order` depending transaction boundary.

Preferred v1: **accept first, then convert accepted quote to Order+Project in one atomic command**. This keeps customer acceptance semantically distinct from internal operational creation while making Order+Project consistency atomic.

Preconditions:
- Quote status ACCEPTED;
- accepted version number exists;
- accepted QuoteVersion exists;
- Opportunity is still linked to the same CustomerAccount referenced by accepted buyer snapshot (mismatch blocks manual review rather than silently changing historic truth);
- no Order already exists for this Quote.

Transaction writes:
1. Order snapshot from accepted QuoteVersion + references.
2. Project linked to Order + Configuration.
3. `OrderCreated` domain event.
4. `ProjectCreated` domain event.
5. audit entries.

A unique Quote->Order constraint protects concurrent clicks.

## API / reads
Add:
- `POST /quotes/:id/accept`;
- `POST /quotes/:id/create-order`;
- `GET /orders/:id`;
- `GET /projects/:id`;
- optional list endpoints for Command Center.

All are organization-scoped.

## Command Center
After a Quote reaches SENT:
- show explicit `Zarejestruj akceptację klienta`;
- after ACCEPTED show immutable accepted-version summary;
- show `Utwórz zamówienie i projekt`;
- after conversion show Order number + Project id/status and prevent duplicate conversion.

Do not use a fake “production started” status. Project starts at PLANNING.

## Permissions
Likely new material capabilities:
- `quote.accept`;
- `order.create`, `order.read`;
- `project.create`, `project.read`.

Keep permission set minimal and explicit.

## Events / audit
At minimum:
- `QuoteAccepted`;
- `OrderCreated`;
- `ProjectCreated`.

No buyer email/phone in append-only event/audit payloads. Order itself may contain the immutable buyer snapshot because it is business state, not append-only telemetry.

## Errors / conflicts
- invalid Quote state -> `QUOTE.STATUS_CONFLICT`;
- expired/withdrawn Quote -> explicit acceptance blocker;
- accepted version missing -> integrity error;
- already converted -> `ORDER.QUOTE_ALREADY_CONVERTED` / HTTP 409;
- current CustomerAccount mismatch vs accepted buyer snapshot -> explicit manual-review conflict;
- foreign organization -> 404-style behavior;
- concurrent create order -> deterministic unique/conflict handling.

## Tests required
1. DRAFT/READY Quote cannot be accepted; SENT can.
2. acceptance records exact current version and timestamp.
3. repeated same-version acceptance is idempotent; conflicting acceptance fails.
4. accepted QuoteVersion is still immutable after acceptance.
5. accepted Quote creates exactly one Order + one Project atomically.
6. Order totals/buyer snapshot exactly equal accepted QuoteVersion — no recomputation.
7. Project references Order and Configuration and starts PLANNING with no invented promise date.
8. concurrent conversion cannot create duplicates.
9. tenant isolation across accept/order/project reads/writes.
10. events/audit contain ids/commercial summary but no contact PII.
11. Command Center continues SENT -> ACCEPTED -> Order/Project without losing context.

## Non-goals
- payment/deposit collection;
- invoicing;
- fiscal numbering compliance;
- delivery date commitment;
- capacity scheduling;
- material reservation;
- production job routing;
- acceptance e-signature provider / customer portal authentication;
- cancellation/refund workflow.

## Definition of Done
Sprint 9 is complete when a governed SENT Quote can be explicitly accepted, the exact accepted QuoteVersion becomes immutable commercial source of one Order, and one separate Project is atomically created for operational planning, with tenant isolation, audit/events, concurrency protection and CI coverage.

## Next after Sprint 9
Build **BusinessCalendar + capacity/availability truth** and then material/production execution. Only after those truths exist should the system calculate or communicate dependable production/delivery dates.
