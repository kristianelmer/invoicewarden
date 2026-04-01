alter table public.profiles
  add column if not exists default_jurisdiction text not null default 'UK',
  add column if not exists reminder_subject_template text,
  add column if not exists reminder_body_template text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_default_jurisdiction_check'
  ) then
    alter table public.profiles
      add constraint profiles_default_jurisdiction_check
      check (default_jurisdiction in ('UK', 'NY', 'CA'));
  end if;
end
$$;
