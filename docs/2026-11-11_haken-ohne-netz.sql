-- Installierbare App (Fable Auftrag 2, Teil B), Datei 1 von 2: Haken ohne Netz, doppelsicher.
-- Einmal in Supabase ausfuehren, BEVOR der neue Code getestet wird (die Vorschau nutzt dieselbe echte Datenbank).
-- Vorher Backup der Tabellen habits, checkins und profiles.
--
-- Warum: Ohne Netz merkt sich die App die Haken und schickt sie spaeter nach. Dabei kann derselbe Tipp zweimal
-- ankommen (z. B. wenn er ankam, aber die Antwort verloren ging). Bisher haette er dann doppelt gezaehlt.
-- Jetzt bekommt jeder Tipp eine eigene ID, und die Datenbank merkt sich, welche IDs sie schon gezaehlt hat.
--
-- Bestehende Daten werden nicht veraendert. Der alte Code auf main laeuft weiter: Die ID ist freiwillig,
-- ohne ID verhalten sich die Funktionen genau wie bisher. Alles laeuft in einer Transaktion: Geht etwas schief,
-- bleibt die Datenbank unveraendert.

begin;

-- 1. Welche Tipps schon gezaehlt wurden: eine Zeile pro Tipp-ID. Eintraege aelter als 30 Tage werden nicht mehr
--    gebraucht und nachts geloescht (eingerichtet in 2026-11-11_push.sql).
create table public.checkin_ops (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  op_id      uuid        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, op_id)
);
create index checkin_ops_created_at_idx on public.checkin_ops (created_at);

-- Sicherheit wie bei checkins: Jeder sieht und schreibt nur seine eigenen Zeilen.
alter table public.checkin_ops enable row level security;
create policy "own checkin ops" on public.checkin_ops
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.checkin_ops from anon, authenticated;
grant select, insert on public.checkin_ops to authenticated;

-- 2. Die zwei Funktionen bekommen einen freiwilligen letzten Wert p_op (die Tipp-ID).
--    Mit ID: Kam genau dieser Tipp schon einmal an, wird nichts gezaehlt und nur der aktuelle Stand zurueckgegeben.
--    Ohne ID: wie bisher. Die Rechnung selbst ist Zeile fuer Zeile dieselbe wie in 2026-11-10_checkins.sql.
drop function public.checkin_add(uuid, date, integer, integer);
create function public.checkin_add(p_habit uuid, p_day date, p_delta integer default 1, p_max integer default 20, p_op uuid default null)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  n integer;
begin
  if p_op is not null then
    insert into public.checkin_ops (op_id) values (p_op) on conflict (user_id, op_id) do nothing;
    if not found then
      return coalesce((select c.count from public.checkins c where c.habit_id = p_habit and c.day = p_day), 0);
    end if;
  end if;
  insert into public.checkins as c (habit_id, day, count)
  values (p_habit, p_day, greatest(0, least(p_delta, least(greatest(p_max, 1), 20))))
  on conflict (habit_id, day) do update
    set count = greatest(0, least(c.count + p_delta, greatest(c.count, least(greatest(p_max, 1), 20)))),
        updated_at = now()
  returning c.count into n;
  return n;
end;
$$;

drop function public.checkin_set(uuid, date, integer);
create function public.checkin_set(p_habit uuid, p_day date, p_count integer, p_op uuid default null)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  n integer;
begin
  if p_op is not null then
    insert into public.checkin_ops (op_id) values (p_op) on conflict (user_id, op_id) do nothing;
    if not found then
      return coalesce((select c.count from public.checkins c where c.habit_id = p_habit and c.day = p_day), 0);
    end if;
  end if;
  insert into public.checkins as c (habit_id, day, count)
  values (p_habit, p_day, greatest(0, least(p_count, 20)))
  on conflict (habit_id, day) do update
    set count = excluded.count, updated_at = now()
  returning c.count into n;
  return n;
end;
$$;

revoke execute on function public.checkin_add(uuid, date, integer, integer, uuid) from public, anon;
revoke execute on function public.checkin_set(uuid, date, integer, uuid) from public, anon;
grant execute on function public.checkin_add(uuid, date, integer, integer, uuid) to authenticated;
grant execute on function public.checkin_set(uuid, date, integer, uuid) to authenticated;

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------------------------------------
-- Rueckweg (nur falls noetig, vorher den alten Code zurueckholen): Abschnitt 3 aus 2026-11-10_checkins.sql
-- stellt die zwei Funktionen in der alten Form wieder her (vorher die neuen mit "drop function" loeschen), dann
--   drop table public.checkin_ops;
