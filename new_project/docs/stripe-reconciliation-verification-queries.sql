-- Replace placeholders before running:
-- :invoice_id, :checkout_session_id, :payment_intent_id, :user_id

-- 1) Invoice reconciliation state
select
  id,
  user_id,
  status,
  paid_at,
  paid_amount_cents,
  additional_recovery_cents,
  platform_fee_cents,
  stripe_checkout_session_id,
  stripe_payment_intent_id,
  updated_at
from public.invoices
where id = :invoice_id;

-- 2) Ensure checkout session id uniqueness behavior
select id, stripe_checkout_session_id
from public.invoices
where stripe_checkout_session_id = :checkout_session_id;

-- 3) Ensure payment intent id uniqueness behavior
select id, stripe_payment_intent_id
from public.invoices
where stripe_payment_intent_id = :payment_intent_id;

-- 4) Payment event was written once
select
  id,
  user_id,
  invoice_id,
  event_type,
  payload,
  created_at
from public.invoice_events
where invoice_id = :invoice_id
  and user_id = :user_id
  and event_type = 'payment_succeeded'
order by created_at desc;

-- 5) Webhook event idempotency guard rows
select
  stripe_event_id,
  event_type,
  created_at,
  payload
from public.stripe_webhook_events
where payload ->> 'invoice_id' = :invoice_id
order by created_at desc;
