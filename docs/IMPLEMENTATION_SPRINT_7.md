# Implementation Sprint 7 — Customer identity handoff from configurator request

**Status:** planned / claimed  
**Date:** 2026-09-28  
**Owner:** GPT/Writer  
**Branch:** `writer/state-sync-sprint7-plan`

## Goal
Close the identity gap between a public configurator request and the commercial objects created in Sprint 6.

Target operator flow:

`PublicConfigurationRequest -> convert -> Opportunity + Configuration -> identify customer -> CustomerAccount -> link Lead + Opportunity -> pricing -> Draft Quote`

The operator should be able to keep the customer's original request intact, create or choose the correct customer identity, and attach that identity consistently to both the source Lead and the resulting Opportunity.

## Why this is the next coherent slice
Sprint 4 already established `Person | Company -> CustomerAccount -> ContactPoint` plus explicit Lead/Opportunity links. Sprint 6 intentionally creates Opportunity + Configuration from the immutable request but does not create or link a customer. The next step should connect those existing models rather than invent another contact truth.

This directly improves:
- sales continuity,
- future quote buyer snapshots,
- duplicate prevention,
- CRM usability,
- customer history,
- later customer portal and relationship automation.

## Current facts
- The public configuration request stores the original `name`, `email`, optional `phone`, message and immutable product/options snapshot.
- Sprint 6 conversion records `requestId`, `opportunityId`, `configurationId`, converting actor and timestamp.
- CustomerAccount supports PERSON and COMPANY subjects.
- ContactPoint supports EMAIL, PHONE, WHATSAPP and OTHER, with normalized values and primary-contact rules.
- `LinkCustomerService` already enforces explicit organization-scoped linking for Lead and Opportunity and blocks silent reassignment.
- No migration is obviously required for the base flow; Sprint 7 should prefer existing tables unless implementation proves a missing invariant.

## Product rule
Identity resolution must remain **explicit and operator-controlled**.

The system may suggest an existing CustomerAccount based on normalized email/phone, but it must not:
- silently merge customers,
- silently change a Lead/Opportunity from one customer to another,
- overwrite existing contact data from the intake record,
- treat an email/phone match as proof of identity without operator confirmation.

## Proposed smallest coherent implementation

### 1. Customer lookup by normalized contact
Add a read capability in `modules/customers` that can return candidate accounts for an EMAIL and/or PHONE contact inside one organization.

Requirements:
- organization-scoped query;
- normalized through existing customer normalization rules;
- no cross-tenant results;
- exact contact matching first;
- return stable account summary, not arbitrary raw persistence rows;
- read permission required.

### 2. Request identity projection
Extend the internal configurator-request view used by the Command Center with identity status derived from existing links:
- source Lead customer account, if any;
- converted Opportunity customer account, if any;
- whether both point to the same account;
- candidate matches based on request email/phone.

Do not mutate the immutable intake record.

### 3. Explicit actions
For a converted request the operator can:

**A. Link existing customer**
- select a candidate or another CustomerAccount;
- link that account to the source Lead;
- link the same account to the converted Opportunity;
- perform both inside one Unit of Work where feasible;
- preserve existing no-reassignment invariant.

**B. Create person customer from request**
- require operator confirmation of parsed first/last name before write;
- create `CustomerAccount(PERSON)` with request email and optional phone as ContactPoints;
- link it to both Lead and Opportunity;
- keep PII out of audit/event payloads beyond the existing safe summary policy.

Company creation is deliberately not automatic from a free-text public request because the request does not currently carry legal company identity. Existing company accounts may still be selected manually.

### 4. Command Center UX
In the configurator-request section, after conversion show one clear identity state:
- `Klient niepowiązany`
- `Proponowany istniejący klient`
- `Klient powiązany`
- `Konflikt powiązania`

Actions should be explicit and reversible only through existing governed customer-link rules. Do not bury identity changes inside the pricing button.

## Permissions
Likely reuse:
- `acquisition.configuration_request.read`
- `customer.account.read`
- `customer.account.write` when creating a new account
- `customer.link.write`

No new permission should be added unless the implementation reveals a genuinely distinct business capability.

## Audit / event expectations
Creating a CustomerAccount already emits the established customer event/audit record.
Linking Lead and Opportunity already emits link events/audits.

If Sprint 7 introduces one orchestration service that creates + links atomically, reuse the underlying domain planning/commands rather than bypassing their invariants. A new orchestration-level event is optional; do not duplicate PII into event/outbox payloads.

## Error / conflict behavior
- request not found -> 404-style domain mapping;
- request not converted -> explicit domain error;
- selected CustomerAccount not found in organization -> 404;
- Lead or Opportunity already linked to another account -> conflict, no partial relink;
- duplicate contact / invalid phone -> existing customer-domain validation;
- concurrent operator clicks must not create inconsistent Lead/Opportunity customer links.

## Tests required
At minimum:
1. candidate lookup finds same-organization email match;
2. candidate lookup never leaks another organization;
3. link-existing attaches the same account to Lead + Opportunity;
4. repeated same-account action is idempotent;
5. conflicting prior link aborts without partial second link;
6. create-person-from-request stores normalized email/phone and links both sales entities;
7. audit/events contain identifiers/status only, not request PII;
8. malformed IDs do not cause 500;
9. Command Center can continue from linked customer to pricing without losing selected configuration.

## Non-goals
- probabilistic/fuzzy identity matching;
- automatic customer merge;
- company extraction from free text;
- GDPR anonymization/deletion workflow;
- billing/shipping address model;
- quote buyer snapshot;
- customer portal authentication;
- marketing consent model.

## Definition of Done
Sprint 7 is complete when an operator can take a real public configurator request, convert it, explicitly establish the correct CustomerAccount, see the same account linked to both Lead and Opportunity, and continue to pricing with tenant isolation, auditability, conflict safety and CI coverage intact.

## Next after Sprint 7
The next high-value commercial slice is Quote governance: buyer snapshot, VAT/tax rules, margin/discount approvals and controlled `DRAFT -> READY -> SENT` transitions. That work should consume the customer identity established here rather than recreate buyer data ad hoc.
