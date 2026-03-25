# InvoiceWarden Autonomous Execution Plan (No Hand-Holding Mode)

Last updated: 2026-03-25
Owner: Kristian (product) + Claw (execution)

## Mission
Ship a production-ready UK-first MLP for InvoiceWarden focused on legal interest recovery from unpaid invoices.

## Definition of Done (Project Finish Line)

The project is considered "finished" for v1 when all are true:

1. End-to-end flow works in `new_project`:
   - create customer
   - create invoice
   - calculate UK legal interest/fees
   - generate and send compliant reminder
   - reconcile payment and show updated outstanding
2. Reminder emails include a professional invoice PDF attachment (Stripe-grade clarity and layout).
3. The app connects to the user’s Stripe account, and invoice payments can be completed through Stripe.
4. Platform fee logic is implemented so 20% of *additional legal recovery* (interest/fees) is redirected to Kristian.
5. No duplicate reminder sends under retries/concurrency (idempotency proven by integration test).
6. Every critical event is visible in activity/audit trail.
7. Basic operations are safe unattended (runner health + failure alerting + runbook).
8. Build/lint/tests pass and deployment checklist is complete.

---

## Operating Mode: Autonomous Build Blocks

Claw should execute independently for multi-hour stretches using this loop:

1. Pick next highest-priority ticket from `docs/TICKETS_V1.md` critical path.
2. Implement fully (code + tests + docs + migration notes).
3. Verify locally (build/tests/lint where applicable).
4. Update `docs/BUILD_STATUS.md` and mark ticket state.
5. Continue to next ticket without waiting.

Only pause if blocked by hard external decision/dependency (see Escalation Rules).

---

## Escalation Rules (When to Interrupt Kristian)

Interrupt only for:

1. Legal ambiguity that changes claim calculations/wording.
2. External credentials/secrets/access missing.
3. Irreversible or public actions (sending real user communications, billing changes, destructive migrations).
4. Major architecture tradeoff with no safe default.

Do NOT interrupt for routine implementation decisions, refactors, naming, component boundaries, or internal tooling choices.

---

## Execution Sequence (Critical Path)

### Phase A — Foundations
- IW-0001 scope freeze verification
- IW-1001 UK legal rules spec
- IW-1002 legal rules test matrix
- IW-1003 schema/migration contract
- IW-2001 app shell (done)
- IW-2002 auth/session baseline
- IW-2003 structured logging

### Phase B — Core Data Workflow
- IW-3001 customers API + validation + persistence
- IW-3002 invoices API + validation + persistence
- IW-3003 customer/invoice UI management

### Phase C — Core Product Value
- IW-4001 UK interest engine
- IW-4002 legal breakdown UI
- IW-4003 claim snapshots per reminder cycle

### Phase D — Automation + Reliability
- IW-5001 schedule generation
- IW-5002 compliant reminder template engine
- IW-5003 run-due sender with idempotency
- IW-5004 retry/backoff + failure classification

### Phase E — Reconciliation + Ops
- IW-6001 mark-paid guardrails
- IW-6002 outstanding reconciliation
- IW-6003 invoice timeline events
- IW-7001 runner health panel
- IW-7002 failure alerting
- IW-7003 security/config hardening + runbook

### Phase F — Pilot Readiness
- IW-8001 onboarding path
- IW-8002 KPI instrumentation
- IW-8003 go/no-go checklist

---

## Quality Gates Per Ticket

A ticket cannot be marked done unless all pass:

1. Acceptance criteria from `docs/TICKETS_V1.md` checked.
2. Project builds successfully.
3. New behavior has tests (unit/integration as relevant).
4. Docs updated (`BUILD_STATUS.md` + any related spec).
5. No regression in prior completed slices.

---

## Work Logging Contract

For each completed ticket, append to `docs/BUILD_STATUS.md`:

- Ticket ID + title
- What changed (files/modules)
- Verification run (commands + pass/fail)
- Open risks/follow-ups

Also keep `~/proactivity/session-state.md` updated with current objective/blocker/next move.

---

## Safe Defaults (So Work Doesn’t Stall)

1. Jurisdiction in v1 defaults to UK.
2. Currency defaults to GBP.
3. Keep UI minimal and functional; polish deferred.
4. Favor deterministic server-side validation.
5. Favor explicit, auditable ledger events over clever implicit state.

---

## Anti-Drift Rules

1. No NY/CA implementation until UK loop is complete and stable.
2. Stripe integration is in-scope for v1 only for: account connection, payment collection, and 20% additional-legal-recovery fee split.
3. No large redesign work during core reliability phases.
4. No broad copy-paste from `old_project`; port by feature slice only.

---

## Completion Output

When v1 is finished, provide:

1. `V1_RELEASE_NOTES.md`
2. `OPS_RUNBOOK.md`
3. `KNOWN_LIMITATIONS.md`
4. Final acceptance checklist with evidence links (tests/logs/screens)

This is the contract for autonomous completion without hand-holding.
