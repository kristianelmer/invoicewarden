# InvoiceWarden v1 Ticket Plan (MLP-first)

Last updated: 2026-03-25
Owner: Kristian + Claw
Primary objective: Ship UK-first legal-interest recovery loop with reliability and auditability.

---

## Conventions

- Priority: P0 (must), P1 (important), P2 (later)
- Estimate: S (≤0.5d), M (1d), L (2-3d)
- Done means acceptance criteria pass + tests updated + docs updated.

---

## Epic 0 — Product Contract Freeze

### IW-0001 — Freeze v1 scope and non-goals
**Priority:** P0  
**Estimate:** S  
**Dependencies:** none

**Description**
Lock v1 as UK-only legal-interest recovery. Explicitly defer NY/CA legal engine and advanced enforcement.

**Acceptance Criteria**
- [ ] `docs/PRODUCT_SPEC.md` includes: "v1 UK active; NY/CA coming later".
- [ ] `docs/PRODUCT_SPEC.md` includes explicit out-of-scope section.
- [ ] Team agrees in writing (single approval comment/checklist in file).
- [ ] No v1 ticket references NY/CA implementation work.

---

## Epic 1 — Legal Rules + Data Contract

### IW-1001 — Define UK legal calculation spec
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-0001

**Description**
Document calculation inputs/outputs, formula boundaries, rounding policy, and fee rules for UK v1.

**Acceptance Criteria**
- [ ] `docs/LEGAL_RULES_UK.md` created.
- [ ] Specifies required inputs (principal, due date, etc.).
- [ ] Specifies output schema (interest amount, fee amount, total claim).
- [ ] Defines rounding behavior and date handling.
- [ ] Includes at least 10 concrete examples (normal + edge cases).

### IW-1002 — Create legal rules test matrix
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-1001

**Description**
Create deterministic test cases for legal calculations.

**Acceptance Criteria**
- [ ] `tests/legal-rules-uk.spec.ts` added.
- [ ] At least 15 tests pass, including edge date boundaries and zero-interest scenario.
- [ ] Test names clearly map to legal rule sections.
- [ ] CI runs legal test suite.

### IW-1003 — Data model for claim ledger and reminders
**Priority:** P0  
**Estimate:** L  
**Dependencies:** IW-1001

**Description**
Define schema/migrations for invoices, reminders, ledger entries, payment events, and audit trail.

**Acceptance Criteria**
- [ ] DB migration(s) added for required entities.
- [ ] Ledger stores principal, interest, fees as separate fields.
- [ ] Audit fields include `created_at`, `created_by/system`, `reason`.
- [ ] Migration rollback tested on local DB.

---

## Epic 2 — App Foundation (new_project)

### IW-2001 — Bootstrap runnable app shell
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-0001

**Description**
Scaffold `new_project` app with routes and base layout.

**Acceptance Criteria**
- [ ] App runs locally from `new_project`.
- [ ] Routes exist: Invoices, Customers, Activity, Settings.
- [ ] Shared layout and navigation are reusable components.
- [ ] Build and lint pass.

### IW-2002 — Add auth/session baseline
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-2001

**Description**
Integrate authentication needed for dashboard access.

**Acceptance Criteria**
- [ ] Unauthenticated users are redirected from dashboard routes.
- [ ] Authenticated users can access all core routes.
- [ ] Session expiry behavior is handled (redirect/re-auth).
- [ ] Basic auth integration test added.

### IW-2003 — Add structured logging and request IDs
**Priority:** P1  
**Estimate:** S  
**Dependencies:** IW-2001

**Description**
Ensure traceability for operational actions.

**Acceptance Criteria**
- [ ] API logs include request ID, route, status, duration.
- [ ] Error logs include stack + correlation ID.
- [ ] Run-due job logs include summary counts.

---

## Epic 3 — Core Workflow Slice A (Customers + Invoices)

### IW-3001 — Customers create/list endpoints
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-1003, IW-2002

**Acceptance Criteria**
- [ ] POST/GET customers API implemented.
- [ ] Required field validation enforced.
- [ ] Duplicate-protection policy defined and enforced.
- [ ] API tests pass for success + validation failures.

### IW-3002 — Invoices create/list endpoints
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-3001

**Acceptance Criteria**
- [ ] POST/GET invoices API implemented.
- [ ] Due date and amount validation enforced.
- [ ] Duplicate invoice number policy enforced.
- [ ] API tests pass for success + validation failures.

### IW-3003 — Customers + Invoices UI forms/tables
**Priority:** P0  
**Estimate:** L  
**Dependencies:** IW-3001, IW-3002

**Acceptance Criteria**
- [ ] User can create customer from UI.
- [ ] User can create invoice from UI.
- [ ] Invoice list renders required columns and statuses.
- [ ] Empty/loading/error states implemented.

---

## Epic 4 — Core Workflow Slice B (UK Legal Engine)

### IW-4001 — Implement UK interest engine module
**Priority:** P0  
**Estimate:** L  
**Dependencies:** IW-1001, IW-1002

**Description**
Build `src/core/interest-engine/uk.ts` and contract types.

**Acceptance Criteria**
- [ ] Module returns deterministic result for all test fixtures.
- [ ] Includes principal, interest, fee, total output fields.
- [ ] No UI/API-specific logic inside engine.
- [ ] 100% pass on legal matrix tests.

### IW-4002 — Invoice legal breakdown panel
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-4001, IW-3003

**Acceptance Criteria**
- [ ] Invoice view shows principal/interest/fees/total.
- [ ] "How calculated" explanation visible.
- [ ] Values match engine output exactly.
- [ ] UI test validates displayed numbers.

### IW-4003 — Persist claim snapshot per reminder cycle
**Priority:** P1  
**Estimate:** M  
**Dependencies:** IW-4001, IW-1003

**Acceptance Criteria**
- [ ] Snapshot table/record stores values used when reminder sent.
- [ ] Snapshot tied to invoice + reminder event.
- [ ] Historical snapshots remain unchanged after future recalculations.

---

## Epic 5 — Core Workflow Slice C (Reminder Automation)

### IW-5001 — Reminder schedule generation service
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-3002

**Acceptance Criteria**
- [ ] Default schedule policy stored (3/7/14 or configured value).
- [ ] Schedule entries created on invoice creation.
- [ ] Schedule can be paused/canceled safely.
- [ ] Unit tests cover schedule generation.

### IW-5002 — Claim-ready reminder template engine
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-4001, IW-5001

**Acceptance Criteria**
- [ ] Reminder template includes legal amount breakdown.
- [ ] Template uses approved UK legal wording blocks.
- [ ] Missing required legal fields prevent send.
- [ ] Snapshot test for rendered reminder body.

### IW-5003 — Run-due sender with idempotency
**Priority:** P0  
**Estimate:** L  
**Dependencies:** IW-5001, IW-5002, IW-2003

**Acceptance Criteria**
- [ ] Due reminders are sent by runner endpoint/job.
- [ ] Same reminder cannot be sent twice under retries/concurrency.
- [ ] Idempotency key recorded and enforced.
- [ ] Integration test simulates duplicate trigger and sends once.

### IW-5004 — Retry policy + failure classification
**Priority:** P1  
**Estimate:** M  
**Dependencies:** IW-5003

**Acceptance Criteria**
- [ ] Transient failures are retried with backoff.
- [ ] Permanent failures are marked and not endlessly retried.
- [ ] Failure reason is visible in activity log.
- [ ] Retry action from UI/API works and is idempotent-safe.

---

## Epic 6 — Core Workflow Slice D (Payments + Ledger)

### IW-6001 — Mark-paid endpoint with guardrails
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-3002, IW-1003

**Acceptance Criteria**
- [ ] Endpoint transitions only valid states to paid.
- [ ] Duplicate mark-paid calls are harmless (idempotent behavior).
- [ ] Payment event recorded in audit trail.
- [ ] Tests cover invalid transitions.

### IW-6002 — Outstanding amount reconciliation
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-6001, IW-4001

**Acceptance Criteria**
- [ ] Outstanding totals recompute after payment events.
- [ ] Principal/interest/fee balances remain consistent.
- [ ] Reconciliation tests pass for full and partial payment scenarios.

### IW-6003 — Invoice timeline + activity entries
**Priority:** P1  
**Estimate:** M  
**Dependencies:** IW-5003, IW-6001

**Acceptance Criteria**
- [ ] Timeline shows created/scheduled/sent/failed/paid events.
- [ ] Each event has timestamp + actor/system source.
- [ ] Timeline order is stable and correct.

---

## Epic 7 — Reliability + Operations

### IW-7001 — Runner health and last-run status
**Priority:** P1  
**Estimate:** S  
**Dependencies:** IW-5003

**Acceptance Criteria**
- [ ] Dashboard shows last run time and sent/failed counts.
- [ ] If no run in expected window, status appears degraded.
- [ ] Health API endpoint added for monitoring.

### IW-7002 — Alerting for critical failures
**Priority:** P1  
**Estimate:** S  
**Dependencies:** IW-7001

**Acceptance Criteria**
- [ ] Critical runner failures trigger configured alert channel.
- [ ] Alerts include correlation ID and quick context.
- [ ] Alert spam protection/rate limiting in place.

### IW-7003 — Security + config hardening checklist
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-2002

**Acceptance Criteria**
- [ ] Secrets validation at startup implemented.
- [ ] Least-privilege DB/service roles verified.
- [ ] No sensitive data leaked in client logs/errors.
- [ ] Hardening checklist documented in `docs/OPS_RUNBOOK.md`.

---

## Epic 8 — Pilot Readiness

### IW-8001 — Pilot onboarding flow (time-to-first-value)
**Priority:** P1  
**Estimate:** M  
**Dependencies:** IW-3003, IW-4002, IW-5003

**Acceptance Criteria**
- [ ] New user can reach first scheduled reminder in <10 minutes.
- [ ] Onboarding checklist visible and trackable.
- [ ] Drop-off points logged.

### IW-8002 — Pilot KPI instrumentation
**Priority:** P1  
**Estimate:** S  
**Dependencies:** IW-6002, IW-7001

**Acceptance Criteria**
- [ ] Metrics captured: reminders sent, failure rate, recovered amount, outstanding claim.
- [ ] Data export/report endpoint for pilot review exists.
- [ ] KPI definitions documented in `docs/PILOT_METRICS.md`.

### IW-8003 — Go/No-go checklist for pilot launch
**Priority:** P0  
**Estimate:** S  
**Dependencies:** Epic 1-7 critical tickets

**Acceptance Criteria**
- [ ] Legal engine tests all green.
- [ ] No P0 bugs open.
- [ ] Reminder idempotency proven in integration tests.
- [ ] Runbook and rollback steps documented.

---

## Suggested Execution Order

1. IW-0001
2. IW-1001 → IW-1002 → IW-1003
3. IW-2001 → IW-2002 → IW-2003
4. IW-3001 → IW-3002 → IW-3003
5. IW-4001 → IW-4002 → IW-4003
6. IW-5001 → IW-5002 → IW-5003 → IW-5004
7. IW-6001 → IW-6002 → IW-6003
8. IW-7001 → IW-7002 → IW-7003
9. IW-8001 → IW-8002 → IW-8003

---

## Epic 9 — Stripe Payments + PDF + Platform Fee Split

### IW-9001 — Professional invoice PDF generation
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-3002, IW-4001

**Description**
Generate a professional invoice PDF (Stripe-grade readability) with principal, legal interest, fees, total claim, due details, and payment instructions.

**Acceptance Criteria**
- [ ] PDF generator service implemented and versioned.
- [ ] Reminder emails attach invoice PDF for relevant sends.
- [ ] PDF includes principal/interest/fee breakdown and total due.
- [ ] Rendering tested against fixture snapshots.

### IW-9002 — Stripe account connection (user onboarding)
**Priority:** P0  
**Estimate:** M  
**Dependencies:** IW-2002

**Description**
Allow each user to connect their Stripe account for receiving customer payments.

**Acceptance Criteria**
- [ ] User can initiate Stripe connect onboarding.
- [ ] Connected account status stored and visible in Settings.
- [ ] Reconnect flow works if account is disconnected.
- [ ] Webhook path validates account state updates.

### IW-9003 — Stripe checkout/payment flow per invoice
**Priority:** P0  
**Estimate:** L  
**Dependencies:** IW-9002, IW-4002

**Description**
Generate payment links/checkout sessions so invoice recipients can pay through Stripe.

**Acceptance Criteria**
- [ ] Invoice payment intent/session can be created for total claim amount.
- [ ] Recipient-facing payment link is attached in reminder flow.
- [ ] Successful payment updates invoice/payment state.
- [ ] Duplicate payment event handling is idempotent-safe.

### IW-9004 — Platform fee split: 20% of additional legal recovery
**Priority:** P0  
**Estimate:** L  
**Dependencies:** IW-9003, IW-6002

**Description**
Apply platform fee logic so 20% of additional legal recovery (interest + legal fees component) is redirected to Kristian.

**Acceptance Criteria**
- [ ] Fee base formula is explicit and documented (`additional_recovery = interest + legal_fees`).
- [ ] Platform cut = 20% of additional recovery only (not principal).
- [ ] Stripe transfer/application fee implementation verified in test mode.
- [ ] Ledger records principal vs additional recovery vs platform fee clearly.

### IW-9005 — Financial/audit reporting for split payouts
**Priority:** P1  
**Estimate:** M  
**Dependencies:** IW-9004

**Acceptance Criteria**
- [ ] Per-invoice payout breakdown is visible (merchant net, platform fee).
- [ ] Export/report endpoint includes payout fields.
- [ ] Reconciliation checks pass against Stripe events.

---

## Definition of v1 Done

- UK legal-interest engine in production and tested.
- End-to-end flow works: customer → invoice → legal calculation → reminder send → payment reconciliation.
- Reminder emails include professional invoice PDF attachments.
- Users can connect Stripe and recipients can pay through Stripe links/sessions.
- 20% of additional legal recovery (interest/fees) is redirected to Kristian with auditable ledger records.
- No duplicate sends under retries or repeated triggers.
- Activity/audit trail explains all critical events.
- Pilot users can recover value with minimal support.
