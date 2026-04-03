# InvoiceWarden Finish Plan (Execution Sprint)

Last updated: 2026-04-01 (UTC)
Owner: Claw

## Goal
Ship a production-ready v1 flow that is genuinely usable end-to-end:
1. Create customer + invoice
2. Generate/open Stripe payment session from invoice UI
3. Reconcile payment and show traceability in activity
4. Configure core business settings/templates
5. Operate reminders with clear send/retry visibility

## Current Reality (Why not finished yet)
- Payment session exists in backend but not fully exposed as actionable invoice UI flow.
- Settings page is mostly placeholder and lacks persisted controls.
- Reminder operations are not surfaced with practical controls/workflow UX.
- Manual fallback operations and operator visibility are incomplete.

## Scope for this finish track

### Slice 1 — Invoice Ops UI + Payment Action (Critical)
**Deliverables**
- Add invoice row actions:
  - Create payment session
  - Open/copy payment URL
  - Download invoice PDF
- Show action state in table (loading/success/error)
- Display paid/overdue/due status using DB status, not due-date only

**Acceptance**
- User can initiate checkout from dashboard without manual API calls.
- Errors surface clearly and recoverably.

---

### Slice 2 — Settings (Critical)
**Deliverables**
- Replace placeholder settings with persisted form(s):
  - business display name / sender identity fields
  - jurisdiction default (UK now; future-ready flags for more)
  - reminder template fields (subject/body baseline)
- Add Stripe connect status card with action button(s) from existing API.

**Acceptance**
- User can save settings and see them reflected on refresh.
- Stripe status is visible and actionable in UI.

---

### Slice 3 — Reminder Operations UI (Critical)
**Deliverables**
- Add reminders operations surface:
  - upcoming/sent/failed view
  - per-item retry (where applicable)
  - clear error reason display
- Keep v1 minimal but operational (no over-design).

**Acceptance**
- Operator can understand reminder state and act on failures.

---

### Slice 4 — Manual Ops Fallback + Observability (Important)
**Deliverables**
- Manual mark-paid fallback action with event logging.
- Improve activity timeline clarity (event labels + key IDs + amounts).
- Add small “runbook hints” in UI for common issues.

**Acceptance**
- Operator can close payment state manually when webhook edge-cases occur.
- Activity gives enough evidence for reconciliation debugging.

---

### Slice 5 — Stabilization + Release Gate
**Deliverables**
- Lint/tests green.
- Basic smoke pass on production routes.
- Update docs: runbook + known limitations.

**Release Gate Checklist**
- [ ] Create customer/invoice works from UI
- [ ] Payment session launch works from UI
- [ ] Payment reconciliation reflected in UI
- [ ] Settings persist and reload
- [ ] Reminder ops visible and actionable
- [x] Manual fallback available
- [x] Lint/test pass
- [x] Build pass (`npm run build`)

### Release Gate Evidence (2026-04-03 UTC)
- Local quality gates pass in `new_project`:
  - `npm run lint` ✅
  - `npm test` ✅ (4 tests)
  - `npm run build` ✅
- Critical UI surfaces are implemented and wired:
  - invoice actions (payment session, copy link, PDF, manual mark-paid)
  - persisted settings + Stripe connect status/onboarding
  - reminders grouped by state with retry on failures
  - activity timeline with reconciliation IDs and amount breakdown
- Remaining blocker for checking the five unchecked release-gate boxes: authenticated end-to-end UI/API verification still requires a working browser session with login in this environment.

### Slice 5 Smoke Pass (2026-04-02 UTC)
Automated production checks executed against `https://www.invoicewarden.com`:
- `GET /` = 200
- `GET /login` = 200
- Protected dashboard routes redirect to login (`307 -> /login`):
  - `/dashboard`
  - `/dashboard/invoices`
  - `/dashboard/settings`
  - `/dashboard/reminders`
  - `/dashboard/activity`
- Unauthenticated API guard checks return `401` as expected:
  - `GET /api/invoices`
  - `GET /api/customers`
  - `GET /api/reminders`
  - `GET /api/settings`
  - `POST /api/invoices/test/mark-paid`

Limitations of this smoke run:
- Browser automation is currently unavailable in this environment, so authenticated end-to-end UI actions (create invoice, payment launch, settings save, reminders retry, reconciliation visibility) could not be fully exercised from this host in this run.
- Manual fallback endpoint availability and auth guard are confirmed; full in-app operator flow still needs one authenticated click-through verification.

## Delivery Approach
- Implement in thin vertical slices; deploy safely after each slice.
- Prefer minimal diffs with clear operator value.
- Keep schema-compatible changes and avoid risky migrations unless necessary.

## Immediate Next Step
Start Slice 1 now: implement invoice row action controls and wire to `/api/invoices/[id]/payment-session` + PDF endpoint.
