# InvoiceWarden Roadmap (Revenue-First)

_Last updated: 2026-03-23_

## Current State (Completed)

- Public repo + Vercel deployment + custom domain (`invoicewarden.com`)
- Supabase auth + RLS foundations
- Customer CRUD
- Stripe subscription flow (checkout + portal + webhook sync)
- Invoice CRUD (create/list) + mark-paid flow
- Reminder scheduling engine (default 3/7/14-day sequence)
- Reminder sender route (`/api/reminders/run-due`) via Resend
- Hourly scheduler via GitHub Actions (cron)
- Activity log with failed/skipped/sent states + retry action
- Tabbed dashboard layout (Invoices / Activity / Customers / Billing)

---

## Phase 1 — Reliability Hardening (Next 3–5 days)

1. **Make reminder sending robust**
   - Add send retry policy (attempt counter + exponential backoff)
   - Distinguish transient vs permanent failures
   - Add idempotency guard to avoid duplicate sends

2. **Improve observability**
   - Add structured logs for reminder runner
   - Add minimal error alerts (email/Slack/Discord webhook)
   - Show runner status in dashboard (last run, sent/failed count)

3. **Data correctness guardrails**
   - Enforce invoice status transitions (due -> overdue -> paid)
   - Add validation for due date / amount / duplicate invoice numbers
   - Add safer customer-delete behavior when linked invoices exist

**Exit criteria:** can run unattended without silent failures.

---

## Phase 2 — User Value Upgrade (Week 2)

1. **Template customization UI**
   - Edit 3/7/14-day templates per user
   - Preview rendered message with variables

2. **Invoice filtering + workflow speed**
   - Filters: due / overdue / paid
   - Quick actions: send now, mark overdue, mark paid

3. **Metrics panel**
   - Outstanding amount
   - Overdue amount
   - Recovered this month
   - Reminder success rate

**Exit criteria:** users can see ROI in first session.

---

## Phase 3 — Monetization + Onboarding (Week 2–3)

1. **Usage gating**
   - Free tier limits (e.g., 10 active invoices)
   - Paid unlocks unlimited reminders/invoices

2. **Onboarding flow**
   - Add customer -> add invoice -> first reminder scheduled
   - Time-to-first-value < 10 minutes

3. **Trust pages + production polish**
   - Privacy / Terms / Contact pages
   - Basic branding pass (not full redesign)

**Exit criteria:** clear conversion path from trial to paid.

---

## Phase 4 — Go-to-Market (Week 3–4)

1. **Acquire first 5–10 design partners**
   - Freelancers/agencies with active overdue invoices
   - Concierge onboarding + rapid feedback loop

2. **Validation loop**
   - Track: activation, reminders sent, recovered amount, churn reasons
   - Weekly iteration on templates and flows

3. **Case-study proof**
   - Capture real recovery outcomes
   - Turn outcomes into landing copy

**Exit criteria:** first recurring revenue from real users and repeatable onboarding.

---

## Nice-to-Have (Later)

- Native invoice import from Stripe/QuickBooks/Xero
- Multi-language reminder templates
- Team seats / accountant access
- AI-assisted reminder rewrite suggestions
- Full visual redesign
