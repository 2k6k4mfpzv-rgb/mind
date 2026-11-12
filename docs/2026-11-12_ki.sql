-- KI-Assistent (Fable Auftrag 3): Zaehler fuer das Limit pro Nutzer.
-- Einmal in Supabase ausfuehren, vorher Backup der Tabellen habits, checkins und profiles.
-- Danach die Edge Function "ki" ausrollen (supabase/functions/ki) und den Schluessel des KI-Anbieters als
-- Geheimnis der Funktion eintragen (Supabase-Dashboard, nie hier, nie im Repository).
--
-- Was hier passiert:
--   1. Tabelle ki_log: eine Zeile pro Anfrage an die KI. Es steht nur drin, WER WANN zu welchem THEMA gefragt hat,
--      nie der Inhalt. Die App selbst kommt an die Tabelle nicht heran, nur die Server-Funktion.
--   2. Funktion ki_take: zaehlt eine Anfrage, wenn das Tageslimit es erlaubt. Sie kennt auch schon die Regel fuer
--      spaeter, wenn es Pro gibt (ohne Pro: nur "Woche besprechen", ein Gespraech im Monat). Die Regel ist aus,
--      solange die Server-Funktion p_pro = false schickt.
--   3. Funktion ki_back: nimmt eine Zaehlung zurueck (wenn der Anbieter nicht geantwortet hat).
--   4. Jede Nacht: Zeilen loeschen, die aelter als 100 Tage sind.
--
-- Bestehende Daten werden nicht veraendert. Der alte Code auf main stoert sich an nichts davon.
-- Alles laeuft in einer Transaktion: Geht etwas schief, bleibt die Datenbank unveraendert.

begin;

-- 1. Zaehler. day = der Tag in der Zeitzone des Nutzers (wie bei der Erinnerung), first = das Gespraech faengt an.
create table public.ki_log (
  id         bigint      generated always as identity primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  kind       text        not null check (kind in ('frei','woche','neu','mini','muster','formulieren')),
  first      boolean     not null default false,
  day        date        not null,
  created_at timestamptz not null default now()
);
create index ki_log_user_day_idx on public.ki_log (user_id, day);

-- Sicherheit: Row Level Security an und KEINE Regel. Damit kommt aus der App niemand an die Tabelle, auch nicht an
-- die eigenen Zeilen. Nur der Server (service_role) liest und schreibt. Der Sicherheitscheck von Supabase meldet
-- das als Hinweis ("RLS an, aber keine Regel"). Das ist hier gewollt.
alter table public.ki_log enable row level security;
revoke all on public.ki_log from anon, authenticated;

-- 2. Eine Anfrage zaehlen. Gibt {"ok":true,"id":…} zurueck oder {"ok":false,"why":"limit"} bzw. "pro".
--    p_limit = so viele Anfragen am Tag sind erlaubt (steht in supabase/functions/ki/coach.js).
--    p_pro   = Pro ist eingefuehrt und dieser Nutzer hat es nicht.
--    Die Sperre pro Nutzer (pg_advisory_xact_lock) sorgt dafuer, dass zwei gleichzeitige Anfragen das Limit nicht
--    zusammen ueberschreiten koennen.
create function public.ki_take(p_user uuid, p_kind text, p_first boolean, p_limit integer, p_pro boolean)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_tz  text;
  v_day date;
  v_id  bigint;
begin
  select nullif(p.timezone, '') into v_tz from public.profiles p where p.id = p_user;
  begin
    v_day := (now() at time zone coalesce(v_tz, 'Europe/Berlin'))::date;
  exception when others then  -- unbekannte Zeitzone im Profil
    v_day := (now() at time zone 'Europe/Berlin')::date;
  end;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  if p_pro then
    if p_kind <> 'woche' then
      return jsonb_build_object('ok', false, 'why', 'pro');
    end if;
    if p_first then
      -- neues Gespraech: nur, wenn in diesem Monat noch keins angefangen wurde
      if exists (select 1 from public.ki_log l where l.user_id = p_user and l.kind = 'woche' and l.first
                 and l.day >= make_date(extract(year from v_day)::int, extract(month from v_day)::int, 1)) then
        return jsonb_build_object('ok', false, 'why', 'pro');
      end if;
    elsif not exists (select 1 from public.ki_log l where l.user_id = p_user and l.kind = 'woche' and l.first
                      and l.day = v_day) then
      -- Fortsetzung: nur am Tag, an dem das Gratis-Gespraech angefangen hat
      return jsonb_build_object('ok', false, 'why', 'pro');
    end if;
  end if;

  if (select count(*) from public.ki_log l where l.user_id = p_user and l.day = v_day) >= greatest(p_limit, 0) then
    return jsonb_build_object('ok', false, 'why', 'limit');
  end if;
  insert into public.ki_log (user_id, kind, first, day) values (p_user, p_kind, p_first, v_day) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- 3. Zaehlung zuruecknehmen
create function public.ki_back(p_id bigint)
returns void
language sql security definer set search_path = ''
as $$ delete from public.ki_log where id = p_id $$;

-- Beide Funktionen darf nur der Server aufrufen
revoke execute on function public.ki_take(uuid, text, boolean, integer, boolean) from public, anon, authenticated;
revoke execute on function public.ki_back(bigint) from public, anon, authenticated;
grant execute on function public.ki_take(uuid, text, boolean, integer, boolean) to service_role;
grant execute on function public.ki_back(bigint) to service_role;

-- 4. Aufraeumen (pg_cron gibt es seit 2026-11-11_push.sql)
select cron.schedule('mind-ki-log', '27 3 * * *',
  $$delete from public.ki_log where created_at < now() - interval '100 days'$$);

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------------------------------------
-- Nachsehen, wie viel die KI benutzt wird (nur Zahlen, keine Inhalte):
--   select day, kind, count(*) from public.ki_log group by 1, 2 order by 1 desc, 2;
--
-- Rueckweg (nur falls noetig):
--   select cron.unschedule('mind-ki-log');
--   drop function public.ki_take(uuid, text, boolean, integer, boolean), public.ki_back(bigint);
--   drop table public.ki_log;
