# Work Board — active lanes, reservations, collisions

Protocol: `docs/COORDINATION.md`. Update this file whenever you start, hand off or finish a lane.
PRs on GitHub are the tie-breaker if this board is stale.

_Last updated: 2026-09-29_

## Active lanes

| Lane | Owner | Branch | PR | Touches | Status |
|---|---|---|---|---|---|
| Public intake durable budget + proxy failure handling | Codex | `codex/public-intake-budget` | #30 | database 0010, config, API controllers/composition/filter, web proxies, tests, docs | BLOCKED: migration applied; API bootstrap connection fails in two release runs |
| Deployment trust boundary | Codex | `codex/deployment-trust-boundary` | #31 | CI/deploy workflows, regression guard, docs | Merged; main CI passed; trusted push admitted; PR30 API retry failed independently |

| Read-only production database diagnostics | Codex | `codex/database-release-diagnostics` | pending | dedicated trusted-push workflow, bounded diagnostic script/tests, docs | Claimed 2026-09-29; no migration, writes or schema changes |

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
| 0010 | Public intake durable budget | merged (PR #30) |
| 0011 | _next free_ | — |

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
