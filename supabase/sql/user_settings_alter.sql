-- Adds additional settings columns (safe to run multiple times).

alter table if exists public.user_settings
  add column if not exists auto_rest_on_set_done boolean not null default false;

alter table if exists public.user_settings
  add column if not exists focus_mode boolean not null default false;
