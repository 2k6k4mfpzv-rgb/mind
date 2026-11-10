-- Fundament (Fable Auftrag 1, Teil B): Haken in eine eigene Tabelle "checkins", der Server zählt hoch.
-- Einmal in Supabase ausfuehren, BEVOR der neue Code getestet wird (die Vorschau nutzt dieselbe echte Datenbank).
-- Vorher Backup der Tabelle habits.
--
-- Warum: Bisher standen die Haken als Liste (done) im Habit, und die App schickte bei jedem Haken die ganze Liste.
-- Haken zwei Geraete gleichzeitig ab, konnte ein Haken verloren gehen. Jetzt ist jeder Tag eine eigene Zeile,
-- und die Datenbank zaehlt selbst hoch.
--
-- Der alte Code auf main laeuft weiter: Die Spalte habits.done bleibt und wird automatisch aktuell gehalten
-- (in beide Richtungen, siehe Abschnitt 5). So kann man jederzeit zurueck, und ein noch offener alter Browser-Tab
-- verliert nichts. Alles laeuft in einer Transaktion: Geht etwas schief, bleibt die Datenbank unveraendert.

begin;

-- 1. Tabelle: eine Zeile pro Habit und Tag. count = wie oft an dem Tag erledigt (0 = Haken wieder entfernt).
create table public.checkins (
  habit_id   uuid        not null references public.habits(id) on delete cascade,
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  day        date        not null,
  count      integer     not null default 0 check (count between 0 and 20),
  updated_at timestamptz not null default now(),
  primary key (habit_id, day)
);
create index checkins_user_id_idx on public.checkins (user_id);

-- 2. Sicherheit wie bei habits: Jeder sieht und aendert nur seine eigenen Zeilen, und nur zu eigenen Habits.
alter table public.checkins enable row level security;
create policy "own checkins" on public.checkins
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );
revoke all on public.checkins from anon, authenticated;
grant select, insert, update, delete on public.checkins to authenticated;

-- 3. Funktionen, die die App aufruft. Sie laufen mit den Rechten des angemeldeten Nutzers (die Regeln aus 2. gelten).

-- Hochzaehlen oder runterzaehlen in einem Schritt (atomar). Nie unter 0 und nie ueber p_max (das Tagesziel).
-- Gibt die neue Anzahl zurueck.
create function public.checkin_add(p_habit uuid, p_day date, p_delta integer default 1, p_max integer default 20)
returns integer
language sql security invoker set search_path = ''
as $$
  insert into public.checkins as c (habit_id, day, count)
  values (p_habit, p_day, greatest(0, least(p_delta, least(greatest(p_max, 1), 20))))
  on conflict (habit_id, day) do update
    set count = greatest(0, least(c.count + p_delta, greatest(c.count, least(greatest(p_max, 1), 20)))),
        updated_at = now()
  returning c.count;
$$;

-- Anzahl fest setzen (zurueck auf 0, Rueckgaengig). Gibt die neue Anzahl zurueck.
create function public.checkin_set(p_habit uuid, p_day date, p_count integer)
returns integer
language sql security invoker set search_path = ''
as $$
  insert into public.checkins as c (habit_id, day, count)
  values (p_habit, p_day, greatest(0, least(p_count, 20)))
  on conflict (habit_id, day) do update
    set count = excluded.count, updated_at = now()
  returning c.count;
$$;

-- Alle Haken des Nutzers in einem Rutsch: {"<habit_id>": {"JJJJ-MM-TT": Anzahl, ...}, ...}
create function public.checkins_map()
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_object_agg(t.habit_id, t.days), '{}'::jsonb)
  from (
    select c.habit_id, jsonb_object_agg(to_char(c.day, 'YYYY-MM-DD'), c.count) as days
    from public.checkins c
    where c.user_id = (select auth.uid()) and c.count > 0
    group by c.habit_id
  ) t;
$$;

revoke execute on function public.checkin_add(uuid, date, integer, integer) from public, anon;
revoke execute on function public.checkin_set(uuid, date, integer) from public, anon;
revoke execute on function public.checkins_map() from public, anon;
grant execute on function public.checkin_add(uuid, date, integer, integer) to authenticated;
grant execute on function public.checkin_set(uuid, date, integer) to authenticated;
grant execute on function public.checkins_map() to authenticated;

-- 4. Umzug: alle bisherigen Haken aus habits.done kopieren. done selbst bleibt unveraendert.
insert into public.checkins (habit_id, user_id, day, count)
select h.id, h.user_id, e.key::date, least(e.value::integer, 20)
from public.habits h, jsonb_each_text(h.done) e
where e.key ~ '^\d{4}-\d\d-\d\d$'
  and (case when e.value ~ '^\d+$' then e.value::integer else 0 end) > 0;

-- Pruefung: Tage und Haken muessen vorher und nachher gleich sein, insgesamt und pro Habit. Sonst Abbruch (nichts wird geaendert).
do $$
declare
  alt_tage integer; alt_haken numeric; neu_tage integer; neu_haken numeric; falsch integer;
begin
  select count(*), coalesce(sum(e.value::numeric), 0) into alt_tage, alt_haken
    from public.habits h, jsonb_each_text(h.done) e;
  select count(*), coalesce(sum(c.count), 0) into neu_tage, neu_haken from public.checkins c;
  select count(*) into falsch from public.habits h
   where (select coalesce(sum(e.value::numeric), 0) from jsonb_each_text(h.done) e)
      <> (select coalesce(sum(c.count), 0) from public.checkins c where c.habit_id = h.id);
  if alt_tage <> neu_tage or alt_haken <> neu_haken or falsch > 0 then
    raise exception 'Umzug stimmt nicht: vorher % Tage / % Haken, nachher % Tage / % Haken, % Habits weichen ab',
      alt_tage, alt_haken, neu_tage, neu_haken, falsch;
  end if;
end $$;

-- 5. Uebergang: habits.done und checkins bleiben gleich, egal wer schreibt.
--    Neuer Code schreibt checkins -> done wird nachgezogen (Rueckweg bleibt offen).
--    Alter Code schreibt done -> checkins wird nachgezogen (alte Browser-Tabs, alter Stand auf main).
--    pg_trigger_depth() verhindert, dass sich die beiden gegenseitig endlos ausloesen.
--    Kommt weg, sobald die Spalte done geloescht wird (siehe "Spaeter aufraeumen" unten).
create function public.checkins_to_done() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  update public.habits h
     set done = case when new.count > 0
                  then jsonb_set(h.done, array[to_char(new.day, 'YYYY-MM-DD')], to_jsonb(new.count))
                  else h.done - to_char(new.day, 'YYYY-MM-DD') end
   where h.id = new.habit_id;
  return null;
end;
$$;

create function public.done_to_checkins() returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
  alt jsonb := '{}'::jsonb;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  if tg_op = 'UPDATE' then alt := old.done; end if;
  -- neue oder geaenderte Tage
  insert into public.checkins as c (habit_id, user_id, day, count)
  select new.id, new.user_id, e.key::date, least(e.value::integer, 20)
    from jsonb_each_text(new.done) e
   where e.key ~ '^\d{4}-\d\d-\d\d$' and e.value ~ '^\d+$'
     and e.value is distinct from (alt ->> e.key)
  on conflict (habit_id, day) do update set count = excluded.count, updated_at = now();
  -- entfernte Tage: zurueck auf 0
  update public.checkins c set count = 0, updated_at = now()
   where c.habit_id = new.id and c.count > 0
     and (alt ? to_char(c.day, 'YYYY-MM-DD')) and not (new.done ? to_char(c.day, 'YYYY-MM-DD'));
  return null;
end;
$$;
revoke execute on function public.checkins_to_done() from public, anon, authenticated;
revoke execute on function public.done_to_checkins() from public, anon, authenticated;

create trigger checkins_to_done
  after insert or update on public.checkins
  for each row execute function public.checkins_to_done();
create trigger done_to_checkins_ins
  after insert on public.habits
  for each row when (new.done <> '{}'::jsonb) execute function public.done_to_checkins();
create trigger done_to_checkins_upd
  after update of done on public.habits
  for each row when (old.done is distinct from new.done) execute function public.done_to_checkins();

-- 6. Realtime: Ein Haken auf dem Handy erscheint sofort am Mac (die Regeln aus 2. gelten auch hier).
alter publication supabase_realtime add table public.checkins;

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------------------------------------
-- Nachsehen (nur lesen): Stimmen done und checkins ueberein?
--   select h.name,
--          (select coalesce(sum(e.value::numeric), 0) from jsonb_each_text(h.done) e) as haken_done,
--          (select coalesce(sum(c.count), 0) from public.checkins c where c.habit_id = h.id) as haken_checkins
--   from public.habits h order by h.pos;
--
-- Rueckweg (falls noetig, solange die Spalte done noch da ist): alten Code zurueckholen, dann
--   alter publication supabase_realtime drop table public.checkins;
--   drop trigger done_to_checkins_ins on public.habits;
--   drop trigger done_to_checkins_upd on public.habits;
--   drop table public.checkins;  -- nimmt Regel und Trigger der Tabelle mit
--   drop function public.checkin_add(uuid, date, integer, integer), public.checkin_set(uuid, date, integer),
--                 public.checkins_map(), public.checkins_to_done(), public.done_to_checkins();
--
-- Spaeter aufraeumen (fruehestens nach ein paar Wochen, eigene SQL-Datei, vorher Backup):
--   drop trigger checkins_to_done on public.checkins;
--   drop trigger done_to_checkins_ins on public.habits;
--   drop trigger done_to_checkins_upd on public.habits;
--   drop function public.checkins_to_done(), public.done_to_checkins();
--   alter table public.habits drop column done;
