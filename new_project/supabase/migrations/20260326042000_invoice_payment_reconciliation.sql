alter table public.invoices
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_amount_cents integer,
  add column if not exists additional_recovery_cents integer,
  add column if not exists platform_fee_cents integer;

create unique index if not exists invoices_stripe_checkout_session_id_unique
  on public.invoices(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists invoices_stripe_payment_intent_id_unique
  on public.invoices(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
