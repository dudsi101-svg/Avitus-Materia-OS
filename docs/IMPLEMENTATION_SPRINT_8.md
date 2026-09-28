# Implementation Sprint 8 — Quote governance

**Status:** planned / claimed  
**Date:** 2026-09-28  
**Owner:** GPT/Writer  
**Branch:** `writer/sprint8-quote-governance`  
**Reserved:** migration `0008`, decision `DD-028`

## Goal
Turn the existing internal Draft Quote into a governed commercial artifact that can truthfully become customer-ready and sent.

Target flow:

`CustomerAccount -> Opportunity -> Configuration -> PriceCalculation -> Quote DRAFT -> commercial review -> READY -> SENT`

Sprint 8 must preserve the existing separation between cost/pricing truth (`PriceCalculation`) and selling/commercial truth (`QuoteVersion`).

## Why this is next
Sprint 7 closed the customer-identity gap: the same authoritative CustomerAccount can now be linked to the source Lead and converted Opportunity. Sprint 2 already created immutable QuoteVersions with pricing snapshots, but Draft Quotes currently carry zero tax/discount by default and have no immutable buyer snapshot or governed READY/SENT transition.

DD-024 explicitly requires customer identity before customer-ready quote governance. That precondition is now satisfied.

## Product principles
1. **Current customer truth and historic quote truth are different things.** CustomerAccount remains editable current truth; a customer-ready QuoteVersion snapshots the buyer identity/contact context used for that commercial document.
2. **Tax is explicit policy/data.** Do not silently assume one VAT rate for every product/customer/use case. The operator must see which tax rate is being applied.
3. **Discount is governed.** Discount amount/rate, reason and resulting commercial margin are visible and auditable.
4. **READY is a gate.** A Quote cannot become READY if buyer identity, current pricing/configuration, validity or commercial totals are incomplete/inconsistent.
5. **SENT is a business event.** It is a controlled transition with audit/event history, not just a presentation label.
6. **Historical versions are immutable.** Any material commercial change creates a new QuoteVersion while the customer-ready/sent version remains historic truth.

## Proposed smallest coherent implementation

### 1. Migration `0008_quote_governance.sql`
Add version-level commercial snapshot fields to `quote_versions`:
- `buyer_snapshot jsonb` — nullable for legacy Draft versions, required by READY policy;
- `tax_rate_bps integer` — explicit rate used for the version;
- `discount_reason text` — required when discount > 0;
- optionally `commercial_policy_snapshot jsonb` for the resolved governance inputs that produced the version.

Add quote-level transition timestamps where useful for current operational state:
- `ready_at timestamptz`;
- `sent_at timestamptz`.

Do not rewrite historic rows. Existing versions remain valid legacy Draft history.

### 2. Buyer snapshot
Resolve the Opportunity's linked CustomerAccount through the existing customer link model.

Snapshot only fields needed for the commercial document, for example:
- customerAccountId;
- subject type PERSON/COMPANY;
- display name;
- company legal name/tax id when present;
- selected primary email/phone contact;
- preferred language.

The snapshot belongs to the QuoteVersion and must not change when the CustomerAccount changes later.

### 3. Commercial terms revision
Extend quote revision so the operator can explicitly provide:
- `taxRateBps` (0..10000 or organization-policy constrained later);
- `discountAmount` >= 0;
- `discountReason` when discount > 0;
- `validUntil`;
- normal revision reason.

Calculation rules:
- `subtotal` starts from the selected/current PriceCalculation recommended selling price;
- `discountedSubtotal = subtotal - discountAmount`;
- discount cannot exceed subtotal;
- `taxAmount` is calculated deterministically from discounted subtotal and explicit `taxRateBps` using the shared exact-money helpers/rounding policy;
- `total = discountedSubtotal + taxAmount`;
- `marginAmount = discountedSubtotal - estimatedCost` (tax is not margin/revenue truth);
- `marginBps` is derived from the actual post-discount selling price, not copied from the target pricing margin.

No floating-point money arithmetic.

### 4. READY transition
Add an explicit service/action for `DRAFT | INTERNAL_REVIEW | REVISION_REQUIRED -> READY`.

READY preconditions:
- Quote exists in organization;
- current QuoteVersion exists;
- configuration version and PriceCalculation are still current;
- Opportunity has exactly one linked CustomerAccount;
- current version has a buyer snapshot matching that chosen account id;
- validUntil exists and is not before the transition date;
- discount reason exists when discount > 0;
- commercial margin is non-negative;
- any later approval threshold can plug into this gate without bypassing it.

On success:
- atomically update Quote status with optimistic/concurrency protection;
- set `ready_at`;
- emit `QuoteReady` with identifiers/status/totals only;
- audit transition and policy summary without copying PII.

### 5. SENT transition
Add explicit `READY -> SENT` action.

The action records `sent_at`, event and audit. Actual email/PDF delivery remains a separate adapter/workflow; Sprint 8 establishes trustworthy state semantics first.

No transition directly from DRAFT to SENT.

### 6. Revision after READY/SENT
Commercially meaningful changes must not overwrite the customer-ready version.

For the first Sprint 8 slice:
- revising a READY/SENT quote should either be blocked with `QUOTE.REVISION_REQUIRES_DRAFT` / explicit `REVISION_REQUIRED` flow, or create the next immutable version and return status to DRAFT/REVISION_REQUIRED under a clearly tested rule;
- never mutate a sent version row in place.

Prefer the smallest rule that preserves DD-009 immutability and can later support negotiations.

### 7. API
Likely endpoints:
- existing create/revise endpoints extended for commercial terms;
- `POST /quotes/:id/ready`;
- `POST /quotes/:id/sent`.

Existing read endpoints should expose the buyer/commercial snapshot for authorized internal users.

### 8. Command Center
Add a compact Quote governance panel after pricing/draft creation:
- customer/buyer identity summary;
- subtotal, discount, net-after-discount, tax, gross total;
- actual margin amount/rate;
- valid-until;
- explicit buttons for `Przygotuj do wysłania` and `Oznacz jako wysłaną` based on allowed transition;
- clear blocking reasons when READY preconditions fail.

Do not expose internal cost/margin on public/customer surfaces.

## Permissions
Prefer existing quote permissions if sufficient. If state transitions represent a materially distinct capability, add the smallest explicit permissions such as:
- `quote.ready`;
- `quote.send`.

Do not add roles or permissions merely for UI convenience.

## Audit / events
At minimum:
- `QuoteVersionCreated` / existing revision event contains commercial summary without buyer PII;
- `QuoteReady`;
- `QuoteSent`.

Audit must record actor, quote/version ids, transition, discount/tax/margin summary and reason where applicable. Buyer names/emails/phones stay in QuoteVersion business snapshot, not append-only audit/event payloads.

## Error / conflict behavior
- quote/customer/configuration/pricing not found in organization -> 404-style domain mapping;
- missing customer link -> explicit READY blocker;
- stale PriceCalculation/configuration -> explicit conflict/blocker;
- discount > subtotal -> validation/domain error;
- discount without reason -> validation/domain error;
- invalid/expired validUntil -> blocker;
- DRAFT -> SENT -> conflict;
- concurrent transition/revision -> HTTP 409-style domain conflict;
- another organization's CustomerAccount/Quote must never be visible or usable.

## Tests required
At minimum:
1. buyer snapshot comes from the Opportunity-linked CustomerAccount;
2. snapshot stays unchanged if current CustomerAccount data changes later;
3. no cross-organization customer leakage;
4. exact tax calculation with explicit `taxRateBps`;
5. discount recalculates actual margin and requires reason;
6. discount cannot exceed subtotal;
7. READY fails without CustomerAccount, buyer snapshot, validity or current pricing;
8. READY succeeds atomically with event/audit and no PII in append-only payloads;
9. SENT only succeeds from READY;
10. repeated/concurrent transition is idempotent or conflicts deterministically;
11. sent/customer-ready version is not mutated by later revision;
12. Command Center displays blockers and can continue the real journey.

## Non-goals
- legal/tax advice engine;
- automatic selection of reduced VAT rates;
- PDF renderer and e-signature;
- email delivery provider;
- payment schedules/deposits;
- multi-currency FX;
- accepted Quote -> Order conversion (Sprint 9 candidate);
- complex approval matrices by role/amount/margin (future extension after basic gate is stable).

## Definition of Done
Sprint 8 is complete when an operator can start from a current priced configuration linked to a CustomerAccount, create/revise a Draft Quote with explicit tax and discount terms, preserve an immutable buyer/commercial snapshot, pass a deterministic READY gate, transition to SENT, and retrieve auditable history without breaking tenant isolation or historic versions.

## Next after Sprint 8
Sprint 9 candidate: `ACCEPTED Quote -> Order -> Project`, preserving the accepted QuoteVersion as the commercial source of truth and separating commercial commitment from operational execution per DD-018.
