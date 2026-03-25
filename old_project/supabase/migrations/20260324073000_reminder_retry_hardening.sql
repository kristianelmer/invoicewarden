do $$
begin
  alter type reminder_state add value if not exists 'processing';
exception
  when duplicate_object then null;
end $$;

alter table public.reminders
  add column if not exists attempts integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_retry_at timestamptz;

alter table public.reminders
  drop constraint if exists reminders_attempts_nonnegative;

alter table public.reminders
  add constraint reminders_attempts_nonnegative check (attempts >= 0);

create index if not exists reminders_next_retry_at_idx on public.reminders(next_retry_at);
