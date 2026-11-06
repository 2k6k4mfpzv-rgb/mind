-- A3: Profil und Einstellungen. Einmal in Supabase SQL Editor ausfuehren,
-- BEVOR der neue Code auf main geht. Vorher Backup der Tabelle habits.
-- Die Tabelle habits wird nicht veraendert.

-- Eine Zeile pro Nutzer. id = Login-Konto (auth.users).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  timezone text not null default '' check (char_length(timezone) <= 64), -- leer = App traegt die Zeitzone des Geraets ein
  plan text not null default 'free' check (plan in ('free', 'premium')),
  rem_on boolean not null default false,                                  -- Erinnerung an/aus
  rem_time text not null default '20:00' check (rem_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Jeder sieht und aendert nur sein eigenes Profil
create policy "own profile read" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Aus der App darf man nur lesen und diese vier Felder aendern. plan nie (spaeter Premium).
-- Anlegen und Loeschen passiert nur ueber die Datenbank selbst.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, timezone, rem_on, rem_time) on public.profiles to authenticated;

-- Neues Konto -> Profil wird automatisch angelegt
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profil fuer bestehende Konten (heute: nur Paul)
insert into public.profiles (id) select id from auth.users on conflict do nothing;
