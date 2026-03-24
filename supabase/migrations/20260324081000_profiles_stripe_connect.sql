alter table public.profiles
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_onboarded boolean not null default false;

create unique index if not exists profiles_stripe_connect_account_id_idx
  on public.profiles(stripe_connect_account_id)
  where stripe_connect_account_id is not null;
