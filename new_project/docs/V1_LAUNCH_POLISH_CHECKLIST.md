# InvoiceWarden v1 Launch Polish Checklist

Saved: 2026-04-03 (UTC)

## 1) Dashboard “Recovery Snapshot” (must-have)
- Add top cards:
  - Overdue principal
  - Estimated legal recovery (interest+fees)
  - Recovered this month
  - Failed actions needing attention
- Why: instantly shows value + urgency.

## 2) Invoice row status clarity (must-have)
- Show explicit badges:
  - `Unpaid`, `Overdue`, `Payment link created`, `Paid`, `Manual paid`
- Add “last event” timestamp per invoice.
- Why: removes operator guesswork.

## 3) Legal calculation explainability panel (must-have)
- On invoice detail/modal:
  - Principal
  - Interest formula inputs
  - Fees used
  - Rounding rule
  - Total claim
- Why: trust + legal defensibility.

## 4) Reconciliation confidence UI (must-have)
- In activity timeline, pin key IDs visibly:
  - Stripe event ID
  - checkout session ID
  - payment intent ID
- Show a clear reconciliation state chip: `Pending webhook` / `Reconciled` / `Needs manual review`.
- Why: faster debugging, fewer support loops.

## 5) Reminder failure action UX (must-have)
- Failed reminders need one-click actions:
  - Retry now
  - Edit template + retry
  - Skip with reason
- Why: operational completeness.

## 6) First-run onboarding flow (high)
- Stepper after signup:
  1. Business profile
  2. Stripe connect
  3. Reminder template
  4. Add first customer/invoice
- Why: activation and fewer abandoned accounts.

## 7) Template preview before send (high)
- Live preview with interpolation + legal wording check.
- Why: confidence before automation.

## 8) Strong empty states (high)
- Each core page should tell user exactly what to do next.
- Example: “No invoices yet → Create customer first.”
- Why: reduces confusion, increases completion.

## 9) Manual mark-paid safeguards (high)
- Require reason + confirmation + show warning about audit implications.
- Why: prevents accidental misuse of fallback.

## 10) Premium polish sweep (medium)
- Tighten spacing/typography hierarchy.
- Consistent button labels (`Create payment link` vs `Pay link`).
- Better success/error toasts with next-step hints.
- Why: perceived quality and trust.
