alter table public.invoices
  add constraint invoices_due_not_before_issue
  check (due_date >= issue_date) not valid;

alter table public.invoices
  validate constraint invoices_due_not_before_issue;

alter table public.invoices
  add constraint invoices_currency_iso3_upper
  check (currency = upper(currency) and char_length(currency) = 3) not valid;

alter table public.invoices
  validate constraint invoices_currency_iso3_upper;
