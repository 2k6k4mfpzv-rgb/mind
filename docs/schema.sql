-- In Supabase: SQL Editor -> New query -> einfügen -> Run
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  days int[] not null default '{0,1,2,3,4,5,6}',
  cat text not null default '',
  created date not null default current_date,
  done jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.habits enable row level security;

-- Jeder Nutzer sieht und ändert nur seine eigenen Zeilen
create policy "own habits" on public.habits
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
