# Stripe Reconciliation Finish Checklist (MLP close-out)

## 1) Required DB migrations
Apply in order:
1. `supabase/migrations/20260324081000_profiles_stripe_connect.sql`
2. `supabase/migrations/20260326042000_invoice_payment_reconciliation.sql`
3. `supabase/migrations/20260326080000_stripe_webhook_idempotency.sql`

## 2) Required environment variables
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3) Stripe webhook endpoint
- Endpoint: `POST /api/stripe/webhook`
- Subscribe to event: `checkout.session.completed`
- Confirm signing secret in env matches Stripe dashboard webhook secret

## 4) End-to-end verification flow
1. Create or select overdue invoice.
2. Start payment session via `POST /api/invoices/[id]/payment-session`.
3. Complete test checkout in Stripe.
4. Confirm webhook delivery succeeds in Stripe dashboard.
5. Verify `invoices` row is updated:
   - `status = paid`
   - `paid_at` set
   - `paid_amount_cents` set
   - `additional_recovery_cents` set
   - `platform_fee_cents` set
   - `stripe_checkout_session_id` set
   - `stripe_payment_intent_id` set
6. Verify one `invoice_events` row with `event_type = payment_succeeded`.
7. Replay webhook event once from Stripe dashboard and confirm no duplicate payment event is created.

## 5) Done criteria
MLP commercial flow is complete when:
- test checkout succeeds end-to-end,
- invoice reconciliation fields are populated correctly,
- idempotent replay behavior is verified,
- no lint/test regressions (`npm run lint`, `npm test`).
