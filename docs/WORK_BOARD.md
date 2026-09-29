# Work Board — active lanes, reservations, collisions

Protocol: `docs/COORDINATION.md`. Update this file whenever you start, hand off or finish a lane.
PRs on GitHub are the tie-breaker if this board is stale.

_Last updated: 2026-09-29_

## Active lanes

| Lane | Owner | Branch | PR | Touches | Status |
|---|---|---|---|---|---|
| Configurator runtime diagnosis | Codex | `codex/configurator-runtime-diagnosis` | pending | read-only capability probe, deployment workflow/tests, docs | Claimed 2026-09-29; no schema/data/credential change |

## Reservations

Take the next free value, write your lane next to it, commit together with your claim.

### Migration numbers (`packages/database/migrations/NNNN_*.sql`)
| Number | Lane | State |
|---|---|---|
| 0000 | Sprint 0 foundation | merged |
| 0001 | Sprint 1 sales foundation | merged |
| 0002 | Sprint 2 pricing/quotes | merged |
| 0003 | Sprint 3 public inquiry | merged |
| 0004 | Sprint 4 customer identity | merged |
| 0005 | Sprint 5 public configuration requests | merged |
| 0006 | Sprint 5b option presentation metadata | merged |
| 0007 | Sprint 6 configuration request conversions | merged |
| 0008 | Sprint 8 Quote governance | merged (PR #27) |
| **0009** | **Sprint 9 Accepted Quote → Order + Project** | **merged (PR #28); deployed API run 78** |
| 0010 | Public intake durable budget | merged (PR #30); applied in production, API release 36565136322 |
| 0011 | Tenant role database invariant | merged PR36; production release 36611978132 |
| 0012 | _next free_ | — |

### Decision IDs (`docs/DECISIONS.md`)
| ID | Subject | State |
|---|---|---|
| DD-022 | Production deployment platform (Fly.io) | merged |
| DD-023 | Coordination protocol and shared-identifier reservations | merged |
| DD-024 | Customer identity precedes Quote READY/SENT governance | merged |
| DD-025 | Public configurator requests: immutable intake snapshot, no auto-Opportunity, no public price | merged |
| DD-026 | Option presentation lives in the catalog, not in UI code | merged |
| DD-027 | Conversion of public configuration requests is explicit, atomic and one-time | merged |
| DD-028 | QuoteVersion is the immutable customer-ready commercial snapshot | merged |
| **DD-029** | **Accepted QuoteVersion is the commercial source for Order; Project is separate execution** | **merged (PR #28); deployed API run 78** |
| DD-030 | Public intake shared durable budget | merged (PR #30) |
| DD-031 | _next free_ | — |

### Sprint numbers
| Sprint | Subject | State |
|---|---|---|
| 0 | Core foundation + Lead | merged |
| 1 | Opportunity, Catalog, Configuration | merged |
| 2 | Pricing + immutable draft quotes | merged |
| 3 | Public website v0.1 + inquiry intake | merged |
| 4 | Customer identity | merged |
| 5 | Public configurator v1 + 5b | merged |
| 6 | Configuration request → Opportunity + Configuration | merged |
| 7 | Customer identity handoff from converted configurator request | merged (PR #26) |
| 8 | Quote governance | merged (PR #27); production deploy run 55 succeeded |
| **9** | **Accepted Quote → Order + Project** | **merged (PR #28); deployed API run 78** |
| 10 | _next free_ | — |

## Known collisions

### C-001 — Duplicate migration `0003` (PR #5 vs `main`) — resolved
`main` had `0003_public_inquiry.sql`; the old customer-identity branch also used `0003`. The replacement Sprint 4 lane moved customer identity to `0004_customer_identity.sql` and landed as PR #17.

### C-002 — Duplicate `DD-022` — resolved
Fly.io remains DD-022. Customer identity moved to DD-024 in Sprint 4.

### C-003 — Two different Sprint 3 documents — resolved
Public web remains Sprint 3. Customer identity moved to `IMPLEMENTATION_SPRINT_4.md`.

### C-004 — Composition-root / lockfile drift — resolved
Customer identity was rebuilt on current `main` and merged as PR #17 with both acquisition and customer registrations preserved.

## Recently closed
| Lane | PR | Outcome |
|---|---|---|
| Sprint 0–3, design refinement, Fly deployment helpers | #1–#4, #6–#10 | changes landed on `main` |
| Coordination protocol + collision guard (DD-023) | #11 | merged |
| API dual-stack bind (INC-001), deployment gate/routing, website v0.4 | #12–#16 | merged |
| Sprint 4 customer identity (replaced #5) | #17 | merged |
| Sprint 5 / 5b public configurator + extensible options | #18 | merged 2026-09-28 |
| Sideboard catalog defaults | #19 | merged 2026-09-28 |
| Deploy target detection per app | #20 | merged 2026-09-28 |
| Sprint 6 configurator request conversion | #21 | merged 2026-09-28 |
| Sprint 6 CI race fix | #22 | merged 2026-09-28; main deploy run 41 succeeded |
| Sprint 7 customer identity handoff | #26 | merged 2026-09-28; API production deploy run 48 succeeded |
| Sprint 8 Quote governance | #27 | merged 2026-09-28; main CI #113 and Fly production deploy run 55 succeeded |
| Production deploy unblocked (new Fly org token) | — | web + API deployment pipeline operational |

## Reconciliation evidence (2026-09-28)
Sprint 9 merged as PR #28 at `68ea544`; CI run 36449482063 succeeded; API deploy run 36449743352 succeeded. No open PRs at claim time. Sprint 9 UI and production operator authentication remain missing; deployment does not prove a usable authenticated journey.

## Hardening reconciliation completed
PR #29 merged at `d43bb53`; PR CI 36464939159, main CI 36465241308 and API deploy 36465461468 succeeded. No migration. HTTP error serialization is allowlisted; Gate 1 remains open. Browser found ConfiguratorLite fallback on production (R17), not verified working intake. At that checkpoint no active implementation claim remained; current lanes are listed above.

## 2026-09-29 hardening release checkpoint
PR30 intake budget: deployed API d3a8de6 and web 04f697d; migration 0010 applied; full CI passed. PR31 privileged deployment provenance protection active. PR32/33 bounded read-only database diagnostics verified in production. Release 36565136322 succeeded after earlier bootstrap connection failures; root cause remains unproven. See Hardening 02–04. Gate 1 remains open; next P0 is tenant invariants plus recovery/alert proof.

PR34/35 release verification: main CI 36568275366 and API deployment 36568473095 succeeded. API tag 56440aa, preflight invalid_memberships=0. Authorization hardening and bounded bootstrap retry are deployed. Bootstrap retry count was not exposed by successful release logs; do not claim that retries were exercised in production.

Hardening 07 closed: PR36, main CI 36611710542, API deployment 36611978132, tag 18b10a9. Nine IAM PostgreSQL tests plus one actual-migration invalid-legacy rollback test pass. No role reassignment or data deletion. Broader R05 remains open.
