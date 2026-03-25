-- Core schema for InvoiceWarden new_project (Slice A)

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  company text,
  created_at timestamptz not null default now(),
  constraint customers_email_length check (email is null or length(email) <= 254)
);

create unique index if not exists customers_user_email_unique
  on public.customers (user_id, lower(email))
  where email is not null;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_number text not null,
  principal numeric(12,2) not null check (principal > 0),
  due_date date not null,
  currency text not null default 'GBP' check (char_length(currency) = 3),
  status text not null default 'due' check (status in ('due', 'overdue', 'paid')),
  created_at timestamptz not null default now()
);

create unique index if not exists invoices_user_invoice_number_unique
  on public.invoices (user_id, lower(invoice_number));

alter table public.customers enable row level security;
alter table public.invoices enable row level security;

-- PostgreSQL doesn't support CREATE POLICY IF NOT EXISTS on many versions;
-- use explicit drop/create to keep migration idempotent.
drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own"
  on public.customers for select
  using (auth.uid() = user_id);

drop policy if exists "customers_insert_own" on public.customers;
create policy "customers_insert_own"
  on public.customers for insert
  with check (auth.uid() = user_id);

drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own"
  on public.customers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "customers_delete_own" on public.customers;
create policy "customers_delete_own"
  on public.customers for delete
  using (auth.uid() = user_id);

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own"
  on public.invoices for select
  using (auth.uid() = user_id);

drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own"
  on public.invoices for insert
  with check (auth.uid() = user_id);

drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own"
  on public.invoices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_delete_own"
  on public.invoices for delete
  using (auth.uid() = user_id);

alter table public.customers alter column user_id set default auth.uid();
alter table public.invoices alter column user_id set default auth.uid();
