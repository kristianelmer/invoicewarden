# InvoiceWarden — Agent Handoff Handbook

Last updated: 2026-03-23

This file is for the next agent to resume work quickly without relying on prior chat context.

---

## 1) Project Snapshot

- Product: **InvoiceWarden**
- Domain: **https://invoicewarden.com**
- Repo: **https://github.com/kristianelmer/invoicewarden**
- Goal: help freelancers recover overdue invoices via automated reminder flows.

Current state: production app is deployed and functional for core flows.

---

## 2) What is already working

- Auth (Supabase) with protected dashboard
- Billing (Stripe)
  - Checkout route
  - Customer portal route
  - Webhook sync
  - Billing status in UI
- Customers
  - Create/list/delete
- Invoices
  - Create/list
  - Mark paid
- Reminders
  - Default 3/7/14 day sequence auto-created per user
  - Scheduled when invoice is created
  - Due reminders sent via Resend
- Activity
  - Event log in dashboard
  - Failed/skipped/sent badges
  - Retry action for failed reminder events
- Scheduling
  - Hourly trigger via **GitHub Actions cron** (not Vercel cron)

---

## 3) Architecture / Stack

- Frontend/backend: Next.js App Router (TypeScript)
- DB/Auth: Supabase Postgres + RLS
- Billing: Stripe
- Email: Resend
- Hosting: Vercel
- Scheduler: GitHub Actions hourly cron

---

## 4) Critical files

### API routes

- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/billing/status/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/customers/route.ts`
- `src/app/api/customers/[id]/route.ts`
- `src/app/api/invoices/route.ts`
- `src/app/api/invoices/[id]/mark-paid/route.ts`
- `src/app/api/reminders/run-due/route.ts`
- `src/app/api/reminders/retry/route.ts`

### UI components

- `src/components/dashboard-tabs.tsx`
- `src/components/billing-controls.tsx`
- `src/components/invoices-manager.tsx`
- `src/components/customers-manager.tsx`
- `src/components/activity-log.tsx`

### Core libs

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/admin.ts`
- `src/lib/stripe.ts`
- `src/lib/reminders.ts`
- `src/lib/email.ts`

### Scheduler

- `.github/workflows/reminders-cron.yml`

### Migrations

- `supabase/migrations/20260323181500_init.sql`
- `supabase/migrations/20260323192000_billing_subscriptions.sql`
- `supabase/migrations/20260323195000_invoices_reminders.sql`

### Strategy doc

- `ROADMAP.md`

---

## 5) Required environment variables

See `.env.example`.

Required in Vercel:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`

Required in GitHub repo secrets:

- `CRON_SECRET` (same value as app uses)

---

## 6) Operational runbook

### A) Local sanity checks

```bash
npm install
npm run lint
npm run build
```

### B) Reminder runner manual test

```bash
curl -X POST https://invoicewarden.com/api/reminders/run-due \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expect JSON with `processed`, `sent`, `failed`, `skipped`.

### C) Stripe flow test (test mode)

- Use card `4242 4242 4242 4242`
- Complete checkout
- Verify return to `/dashboard?billing=success`
- Verify billing tab shows active status and portal button

### D) If billing state is stale after checkout

- Check webhook events in Stripe dashboard
- Verify `STRIPE_WEBHOOK_SECRET` in Vercel
- Dashboard has fallback sync via `session_id` in success redirect

---

## 7) Known decisions

- Do **not** use Vercel Cron (Pro-only limitation); use GitHub Actions scheduler.
- Keep UI simple/minimal now; defer full design pass until reliability + core product are stronger.
- Focus remains **revenue-first** and reliability-first.

---

## 8) Known risks / likely breakpoints

- Duplicate sends under concurrency edge cases in reminder runner (needs stronger idempotency).
- Retry policy is basic; no attempt counter/backoff persistence yet.
- Observability is lightweight; no alerting pipeline yet.
- Customer delete behavior with linked invoices should be tightened further.

---

## 9) Next priorities (from roadmap)

1. Reliability hardening (retry/backoff/idempotency)
2. Reminder runner observability and alerts
3. Data correctness guardrails and transition rules
4. Template customization + invoice workflow improvements

Reference: `ROADMAP.md`

---

## 10) If you’re a new agent starting tomorrow

1. Read this file + `ROADMAP.md`
2. Run lint/build
3. Confirm env vars and migration status
4. Verify cron workflow run success in GitHub Actions
5. Start with **Phase 1 reliability** tasks

You should be able to continue without historic chat context.
