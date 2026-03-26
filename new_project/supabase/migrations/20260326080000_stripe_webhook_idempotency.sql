create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  created_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists stripe_webhook_events_created_at_idx
  on public.stripe_webhook_events(created_at desc);
