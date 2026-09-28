# Implementation Sprint 7 — Customer identity handoff from configurator request

**Status:** implementation in progress  
**Date:** 2026-09-28  
**Owner:** GPT/Writer  
**Branch:** `writer/sprint7-customer-identity-handoff`

## Goal
Close the identity gap between a public configurator request and the commercial objects created in Sprint 6.

Target operator flow:

`PublicConfigurationRequest -> convert -> Opportunity + Configuration -> identify customer -> CustomerAccount -> link Lead + Opportunity -> pricing -> Draft Quote`

The operator should be able to keep the customer's original request intact, create or choose the correct customer identity, and attach that identity consistently to both the source Lead and the resulting Opportunity.

## Why this is the next coherent slice
Sprint 4 already established `Person | Company -> CustomerAccount -> ContactPoint` plus explicit Lead/Opportunity links. Sprint 6 intentionally creates Opportunity + Configuration from the immutable request but does not create or link a customer. The next step connects those existing models rather than inventing another contact truth.

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
- Existing customer link repositories enforce explicit organization-scoped linking for Lead and Opportunity and block silent reassignment.
- No migration is required for the base Sprint 7 flow.

## Product rule
Identity resolution remains **explicit and operator-controlled**.

The system may suggest an existing CustomerAccount based on normalized email/phone, but it must not:
- silently merge customers,
- silently change a Lead/Opportunity from one customer to another,
- overwrite existing contact data from the intake record,
- treat an email/phone match as proof of identity without operator confirmation.

## Implemented design on this branch

### 1. Configuration-request identity projection
`apps/api/src/configuration-request-identity.service.ts` is an application-layer orchestration service over the existing acquisition/customer repositories. It returns:
- Lead customer account link,
- converted Opportunity customer account link,
- one explicit state: `NOT_CONVERTED`, `UNLINKED`, `SUGGESTED`, `LINKED`, `CONFLICT`,
- exact same-organization candidate matches by normalized email and phone,
- a safe customer summary rather than arbitrary raw persistence data.

The immutable public intake row is never rewritten.

### 2. Exact candidate matching
Candidate discovery reuses the established customer contact normalization rules. Email is always normalized; an optional public-request phone that cannot be normalized is not promoted into customer truth and does not block email matching.

The current implementation evaluates the organization-scoped CustomerAccount projection already exposed by the customer repository. This is intentionally correct-first for the current company scale. Before very large customer volumes, candidate lookup should move to the existing `contact_points_org_lookup_idx` direct repository query without changing the API contract.

### 3. Explicit actions
For a converted request the operator can:

**A. Link existing customer**
- choose an exact candidate;
- preflight both existing links;
- bind the same account to source Lead and converted Opportunity inside one Unit of Work;
- emit the established link events/audits only for links that actually changed;
- repeat the same action idempotently;
- reject conflicting prior links before partial mutation.

**B. Create person customer from request**
- require explicitly confirmed first and last name;
- create a `CustomerAccount(PERSON)` using request email and a valid optional phone;
- bind the newly created account to Lead and Opportunity in the same Unit of Work as account creation;
- roll back the account creation if a concurrent link prevents a coherent pair;
- keep request PII out of audit/event payloads.

Company creation remains manual because a free-text public request does not contain legal company identity.

### 4. API surface
Internal authenticated endpoints:
- `GET /configuration-requests/:id/identity`
- `POST /configuration-requests/:id/identity/link-existing`
- `POST /configuration-requests/:id/identity/create-person`

No new public route, permission, migration or architecture decision is introduced.

### 5. Command Center UX
The configurator-request section now surfaces:
- `Klient niepowiązany`
- `Proponowany istniejący klient`
- `Klient powiązany`
- `Konflikt powiązania`

The operator can explicitly select a candidate or confirm first/last name and create a person account. Pricing remains available after conversion and preserves the selected Configuration.

## Permissions
Reused:
- `acquisition.configuration_request.read`
- `customer.account.read`
- `customer.account.write` when creating a new account
- `customer.link.write`

## Audit / event behavior
Sprint 7 reuses the semantic event names established by Sprint 4:
- `CustomerAccountCreated`
- `CustomerLinkedToLead`
- `CustomerLinkedToOpportunity`

Audit/event payloads carry identifiers, account type/status and contact *types* only. They do not copy request email, phone, name or message.

## Error / conflict behavior
- request not found / malformed UUID -> `ACQUISITION.REQUEST_NOT_FOUND`;
- request not converted -> `ACQUISITION.REQUEST_NOT_CONVERTED`;
- selected CustomerAccount not found in organization -> `CUSTOMER.ACCOUNT_NOT_FOUND`;
- mismatched existing Lead/Opportunity link -> `CUSTOMER.SALES_CONTEXT_LINK_CONFLICT` (HTTP 409 under the existing `_CONFLICT` mapping);
- concurrent inconsistent link during person creation -> same conflict and transaction rollback.

## Tests on this branch
`configuration-request-identity.e2e.test.ts` covers:
1. same-organization exact email candidate lookup;
2. foreign-organization match exclusion;
3. atomic link-existing to Lead + Opportunity;
4. repeat link idempotency;
5. create-person with normalized email/phone and coherent dual link;
6. PII exclusion from CustomerAccount audit records;
7. malformed request id -> 404;
8. conflicting prior Lead link -> 409 with Opportunity left unlinked.

The existing Sprint 6 conversion tests continue to cover preserved Configuration values and pricing handoff.

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
Sprint 7 is complete when CI is green and an operator can take a real public configurator request, convert it, explicitly establish the correct CustomerAccount, see the same account linked to both Lead and Opportunity, and continue to pricing with tenant isolation, auditability and conflict safety intact.

## Next after Sprint 7
Run the real production journey end to end. After that, start Quote governance: buyer snapshot, VAT/tax rules, margin/discount approvals and controlled `DRAFT -> READY -> SENT` transitions. That work must consume the customer identity established here rather than recreate buyer data ad hoc.
