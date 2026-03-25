alter table public.invoices
  add column if not exists jurisdiction text not null default 'UK',
  add column if not exists project_completed_at date,
  add column if not exists services_rendered_at date,
  add column if not exists contract_requested_refused boolean not null default false,
  add column if not exists payment_url text;

alter table public.invoices
  drop constraint if exists invoices_jurisdiction_check;

alter table public.invoices
  add constraint invoices_jurisdiction_check
  check (jurisdiction in ('UK','US_NY','US_CA'));
