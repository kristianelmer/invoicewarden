create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create type invoice_status as enum ('draft','sent','due','overdue','paid','canceled');
create type reminder_state as enum ('scheduled','sent','skipped','failed','canceled');

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_number text not null,
  currency text not null default 'EUR',
  amount_cents integer not null check (amount_cents > 0),
  issue_date date not null,
  due_date date not null,
  status invoice_status not null default 'due',
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, invoice_number)
);

create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_due_date_idx on public.invoices(due_date);
create index if not exists invoices_status_idx on public.invoices(status);

create table if not exists public.reminder_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default',
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists one_default_sequence_per_user
  on public.reminder_sequences(user_id) where is_default = true;

create table if not exists public.reminder_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.reminder_sequences(id) on delete cascade,
  step_order integer not null check(step_order > 0),
  offset_days integer not null,
  subject_template text not null,
  body_template text not null,
  tone text not null default 'friendly',
  unique(sequence_id, step_order)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  step_id uuid not null references public.reminder_steps(id) on delete restrict,
  scheduled_for timestamptz not null,
  state reminder_state not null default 'scheduled',
  sent_at timestamptz,
  skip_reason text,
  failure_reason text,
  email_message_id text,
  created_at timestamptz not null default now(),
  unique(invoice_id, step_id)
);

create index if not exists reminders_user_id_idx on public.reminders(user_id);
create index if not exists reminders_scheduled_for_idx on public.reminders(scheduled_for);
create index if not exists reminders_state_idx on public.reminders(state);

create table if not exists public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoice_events_invoice_id_idx on public.invoice_events(invoice_id);

alter table public.invoices enable row level security;
alter table public.reminder_sequences enable row level security;
alter table public.reminder_steps enable row level security;
alter table public.reminders enable row level security;
alter table public.invoice_events enable row level security;

create policy "invoices_owner" on public.invoices
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reminder_sequences_owner" on public.reminder_sequences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reminder_steps_owner_via_sequence" on public.reminder_steps
for all using (
  exists (
    select 1 from public.reminder_sequences rs
    where rs.id = reminder_steps.sequence_id
      and rs.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.reminder_sequences rs
    where rs.id = reminder_steps.sequence_id
      and rs.user_id = auth.uid()
  )
);

create policy "reminders_owner" on public.reminders
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "invoice_events_owner" on public.invoice_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();
