-- Lock down webhook idempotency storage from client-side access.
-- This table is internal-only and should only be touched by trusted backend paths.

alter table public.stripe_webhook_events enable row level security;

-- No client role should read or write webhook payloads directly.
revoke all on table public.stripe_webhook_events from anon;
revoke all on table public.stripe_webhook_events from authenticated;

-- Keep schema visibility minimal for client roles.
revoke all on table public.stripe_webhook_events from public;
