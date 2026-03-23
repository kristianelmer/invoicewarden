create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  timezone text default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  company text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists customers_user_id_idx on public.customers(user_id);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;

create policy "profiles_owner" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "customers_owner" on public.customers
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
