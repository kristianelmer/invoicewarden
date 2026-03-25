# InvoiceWarden Detailed Roadmap (MLP-first, Sequential)

Last updated: 2026-03-25

Core principle: legal correctness is the product.
Execution style: sequential slices, one completed block at a time.

---

## Step 1 — Lock Product Contract

**Goal:** Freeze what v1 is and what it is not.

- Core promise: collect law-mandated interest on unpaid invoices.
- Jurisdiction strategy: UK active in v1; NY/CA staged later.
- Out-of-scope list frozen for v1.

**Crucial checkpoint:** No implementation starts before this is signed off.

---

## Step 2 — Legal Rules Definition (UK)

**Goal:** Create auditable legal calculation rules.

- Define required inputs.
- Define formula and rounding policy.
- Define reminder legal wording requirements.
- Define edge-case handling.

**Crucial checkpoint:** Every legal output must be reproducible and testable.

---

## Step 3 — Data Model + State Machine

**Goal:** Build integrity-first backend contract.

- Entities: customer, invoice, reminder, ledger, payment, audit events.
- State transitions: due → overdue → paid with guardrails.
- Idempotency design for send and payment actions.

**Crucial checkpoint:** Prevent duplicate sends/payments by design.

---

## Step 4 — New App Foundation

**Goal:** Minimal runnable shell in `new_project`.

- Core app routes: Invoices, Customers, Activity, Settings.
- Auth/session baseline.
- Structured logging and request IDs.

**Crucial checkpoint:** Observability exists before automation.

---

## Step 5 — Slice A: Customers + Invoices

**Goal:** First operational workflow (input layer).

- Create/list customers.
- Create/list invoices.
- Validation and duplicate protections.

**Crucial checkpoint:** Data entering system is clean and constrained.

---

## Step 6 — Slice B: UK Legal Engine

**Goal:** Make core value visible in product.

- Implement UK interest/fee engine module.
- Show legal amount breakdown in UI.
- Add “How calculated” explainability.

**Crucial checkpoint:** UI numbers must exactly match engine output.

---

## Step 7 — Slice C: Reminder Automation

**Goal:** Turn legal claim into reliable action.

- Generate compliant reminder content.
- Run due reminders.
- Apply idempotency + retry policy.

**Crucial checkpoint:** One reminder event can only be sent once.

---

## Step 8 — Slice D: Payments + Reconciliation

**Goal:** Close the financial loop.

- Mark-paid with state guardrails.
- Reconcile principal/interest/fees.
- Persist audit-friendly history.

**Crucial checkpoint:** Ledger remains historically consistent after updates.

---

## Step 9 — Operator Controls + Activity

**Goal:** Ensure human trust and control.

- Activity timeline (sent/failed/skipped/paid).
- Manual actions: send now, retry, pause.
- Last-run status panel.

**Crucial checkpoint:** Operator can answer “what happened and why?” instantly.

---

## Step 10 — Reliability Hardening

**Goal:** Safe unattended operation.

- Runner health checks.
- Alerting on failures.
- Secrets/security hardening.
- Ops runbook + rollback notes.

**Crucial checkpoint:** No silent failure path.

---

## Step 11 — Pilot Launch

**Goal:** Prove real recovery outcomes.

- Onboard 5–10 pilot users.
- Track recovered amount and failure rates.
- Prioritize fixes from real usage.

**Crucial checkpoint:** Success = recovered value, not feature count.

---

## Step 12 — Jurisdiction Expansion

**Goal:** Extend safely after v1 proof.

- Add NY ruleset via jurisdiction abstraction.
- Add CA ruleset after NY stabilizes.
- Keep strict legal regression tests.

**Crucial checkpoint:** No cross-jurisdiction rule leakage.

---

## Non-Negotiables

1. Legal correctness first.
2. Idempotency on all critical actions.
3. Full auditability for calculations and events.
4. Sequential delivery with scope discipline.
5. Reliability before visual polish.
