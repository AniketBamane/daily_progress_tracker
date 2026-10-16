-- ============================================================================
-- Progress Tracker — Supabase schema
-- Run this once in your Supabase project's SQL editor (Database > SQL Editor).
-- Safe to re-run: uses "if not exists" / "or replace" where possible.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user, for display name / avatar / prefs
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text default 'UTC',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- categories: user-defined tags like Work / Health / Learning
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_all_own" on public.categories;
create policy "categories_all_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- tasks: the core daily-log entries (timer-based or manual)
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  notes text,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  duration_seconds int,
  status text not null default 'in_progress' check (status in ('in_progress', 'done', 'skipped')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_running boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_start_idx on public.tasks (user_id, start_time desc);
create index if not exists tasks_user_running_idx on public.tasks (user_id) where is_running = true;

alter table public.tasks enable row level security;

drop policy if exists "tasks_all_own" on public.tasks;
create policy "tasks_all_own" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- goals: daily/weekly/monthly/yearly targets per category (or overall)
-- ----------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  period text not null check (period in ('daily', 'weekly', 'monthly', 'yearly')),
  target_minutes int not null check (target_minutes > 0),
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists "goals_all_own" on public.goals;
create policy "goals_all_own" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- routine_items: recurring tasks the user wants on chosen weekdays, every week.
-- days_of_week uses 0 = Sunday … 6 = Saturday (matches JS getDay / PG dow).
-- ----------------------------------------------------------------------------
create table if not exists public.routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  start_minute int not null check (start_minute between 0 and 1439),
  duration_minutes int not null check (duration_minutes between 1 and 1440),
  days_of_week int[] not null default '{0,1,2,3,4,5,6}',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists routine_items_user_idx on public.routine_items (user_id);

alter table public.routine_items enable row level security;

drop policy if exists "routine_items_all_own" on public.routine_items;
create policy "routine_items_all_own" on public.routine_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Links a generated task back to its routine item.
alter table public.tasks
  add column if not exists routine_id uuid references public.routine_items (id) on delete set null;

-- routine_runs: one row per routine item per day it has been added to Today.
-- Guarantees a routine task is created at most once per day (across tabs and
-- devices), and that deleting it doesn't make it reappear on reload.
create table if not exists public.routine_runs (
  routine_id uuid not null references public.routine_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  run_date date not null,
  primary key (routine_id, run_date)
);

alter table public.routine_runs enable row level security;

drop policy if exists "routine_runs_all_own" on public.routine_runs;
create policy "routine_runs_all_own" on public.routine_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Creates today's tasks for every active routine item scheduled on p_day that
-- hasn't been added yet, and returns the newly created tasks.
-- p_day is the user's local date; p_day_start is local midnight as timestamptz.
create or replace function public.apply_routines(p_day date, p_day_start timestamptz)
returns setof public.tasks
language sql
security invoker
set search_path = public
as $$
  with due as (
    select r.*
    from public.routine_items r
    where r.user_id = auth.uid()
      and r.is_active
      and extract(dow from p_day)::int = any (r.days_of_week)
  ),
  claimed as (
    insert into public.routine_runs (routine_id, user_id, run_date)
    select d.id, d.user_id, p_day from due d
    on conflict (routine_id, run_date) do nothing
    returning routine_id
  )
  insert into public.tasks (
    user_id, category_id, routine_id, name, start_time, end_time,
    duration_seconds, status, priority, is_running
  )
  select
    d.user_id,
    d.category_id,
    d.id,
    d.name,
    p_day_start + make_interval(mins => d.start_minute),
    p_day_start + make_interval(mins => d.start_minute + d.duration_minutes),
    d.duration_minutes * 60,
    'in_progress',
    d.priority,
    false
  from due d
  join claimed c on c.routine_id = d.id
  returning *;
$$;

-- ----------------------------------------------------------------------------
-- New user bootstrap: create profile + a few starter categories automatically
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));

  -- Colors come from the validated CVD-safe categorical palette (fixed order).
  insert into public.categories (user_id, name, color, sort_order)
  values
    (new.id, 'Work', '#2a78d6', 0),
    (new.id, 'Learning', '#eb6834', 1),
    (new.id, 'Health', '#1baf7a', 2),
    (new.id, 'Personal', '#eda100', 3);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Realtime: allow clients to subscribe to task changes (for multi-device sync)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
