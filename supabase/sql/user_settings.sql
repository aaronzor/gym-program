-- User settings stored per account.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system',
  default_unit text not null default 'kg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint theme_check check (theme in ('system', 'dark', 'light')),
  constraint unit_check check (default_unit in ('kg', 'lb'))
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "select own settings" on public.user_settings
for select to authenticated
using (user_id = auth.uid());

create policy "insert own settings" on public.user_settings
for insert to authenticated
with check (user_id = auth.uid());

create policy "update own settings" on public.user_settings
for update to authenticated
using (user_id = auth.uid());
