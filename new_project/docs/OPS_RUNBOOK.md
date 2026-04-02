# OPS Runbook — Stripe Payment Reconciliation (v1)

Last updated: 2026-03-26

## Scope
This runbook verifies InvoiceWarden Stripe payment reconciliation for:
- checkout session creation
- webhook-driven paid-state updates
- manual mark-paid fallback with event traceability
- 20% platform fee tracking on additional recovery
- idempotent handling of duplicate Stripe webhooks

## Prerequisites

### Required env vars
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

(Reference: `docs/ENV_CHECKLIST.md`)

### Required DB migrations
- `20260326042000_invoice_payment_reconciliation.sql`
- `20260326080000_stripe_webhook_idempotency.sql`

## Deploy/Apply sequence
1. Deploy code containing:
   - `POST /api/invoices/[id]/payment-session`
   - `POST /api/stripe/webhook`
2. Apply migrations to target DB.
3. Set/confirm `STRIPE_WEBHOOK_SECRET` in target env.
4. In Stripe dashboard, point webhook endpoint to:
   - `${NEXT_PUBLIC_APP_URL}/api/stripe/webhook`
5. Subscribe webhook to `checkout.session.completed`.

## Verification steps (single happy path)
1. Create/connect Stripe account for a test user.
2. Create an unpaid invoice in dashboard.
3. Call `POST /api/invoices/[id]/payment-session`.
4. Open returned Checkout URL and complete payment in Stripe test mode.
5. Confirm webhook delivery success in Stripe dashboard.

## Expected DB outcomes

### `invoices` row for invoice id
- `status = 'paid'`
- `paid_at` populated
- `paid_amount_cents` populated
- `stripe_checkout_session_id` populated
- `stripe_payment_intent_id` populated
- `additional_recovery_cents` populated
- `platform_fee_cents` populated

### `invoice_events`
Contains at least:
- `payment_session_created`
- `payment_succeeded`

`payment_succeeded.payload` should include:
- `stripe_event_id`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `amount_total_cents`
- `additional_recovery_cents`
- `platform_fee_cents`

### `stripe_webhook_events`
- Contains one row for the Stripe event id.
- Replayed duplicate event must **not** create a second row.

## Idempotency test
1. Re-send same `checkout.session.completed` event (Stripe CLI/dashboard replay).
2. Expect webhook API response `{ received: true, duplicate: true }`.
3. Verify:
   - no new `stripe_webhook_events` row for same event id
   - no duplicate `payment_succeeded` row for that event id
   - invoice remains stable (`status='paid'`, no double mutation)

## Failure triage
- Signature verification failure:
  - check `STRIPE_WEBHOOK_SECRET` matches endpoint secret
  - ensure raw body is passed to Stripe verify call
- Missing invoice updates:
  - verify metadata contains `userId` and `invoiceId`
  - verify service role key is present and valid
  - verify whether Stripe delivered `checkout.session.completed`
- Fee mismatch:
  - verify metadata `platformFeeCents`
  - fallback checks `paymentIntent.application_fee_amount`

## Manual fallback (webhook edge-cases)
Use only when payment is confirmed in Stripe and reconciliation remains stuck after triage.

1. Open **Invoices** and click `Mark paid (manual)` on the affected invoice.
2. Confirm action in prompt.
3. Open **Activity** and verify `Marked paid manually` event exists for the invoice.
4. Include invoice number + activity timestamp in incident notes for later reconciliation review.

## Rollback stance
- Webhook route can stay enabled even if UI temporarily lags.
- If critical issue appears:
  1. disable Stripe webhook endpoint delivery in dashboard
  2. patch route
  3. replay failed events once patch is deployed
