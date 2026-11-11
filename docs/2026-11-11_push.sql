-- Installierbare App (Fable Auftrag 2, Teil B), Datei 2 von 2: Push-Erinnerung vom Server.
-- Einmal in Supabase ausfuehren, nach 2026-11-11_haken-ohne-netz.sql. Vorher Backup der Tabellen habits, checkins
-- und profiles. Danach die Edge Function "push-reminder" ausrollen (supabase/functions/push-reminder).
--
-- Was hier passiert:
--   1. Tabelle push_subs: welche Geraete die Erinnerung bekommen (eine Zeile pro Geraet).
--   2. Spalte profiles.rem_sent: an welchem Tag zuletzt erinnert wurde (hoechstens eine Nachricht am Tag).
--   3. Geheimnisse im Tresor der Datenbank (Supabase Vault). In dieser Datei steht KEIN Schluessel:
--      Die Losung fuer den Aufruf erzeugt die Datenbank hier selbst, das Schluesselpaar fuer Web Push erzeugt die
--      Edge Function beim ersten Lauf und legt es in den Tresor. Kein Mensch muss einen Schluessel kopieren.
--   4. Zeitplan: Die Datenbank stoesst die Edge Function alle 5 Minuten an (pg_cron und pg_net).
--
-- Bestehende Daten werden nicht veraendert. Der alte Code auf main stoert sich an nichts davon.
-- Alles laeuft in einer Transaktion: Geht etwas schief, bleibt die Datenbank unveraendert.

begin;

-- 1. Anmeldungen der Geraete. endpoint = Adresse beim Push-Dienst des Browsers (Apple, Google, Mozilla ...),
--    p256dh und auth = die Schluessel des Geraets, mit denen die Nachricht nur fuer dieses Geraet verschluesselt wird.
create table public.push_subs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text        not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 2000),
  p256dh     text        not null check (char_length(p256dh) between 1 and 200),
  auth       text        not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now()
);
create index push_subs_user_id_idx on public.push_subs (user_id);

-- Sicherheit wie ueberall: Jeder sieht und aendert nur die Anmeldungen seiner eigenen Geraete.
alter table public.push_subs enable row level security;
create policy "own push subs" on public.push_subs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.push_subs from anon, authenticated;
grant select, insert, update, delete on public.push_subs to authenticated;

-- 2. Wann zuletzt erinnert wurde (Tag in der Zeitzone des Nutzers). Schreibt nur der Server, die App darf die
--    Spalte nicht aendern (sie bekommt kein Aenderungsrecht dafuer, siehe 2026-11-06_a3-profiles.sql).
alter table public.profiles add column if not exists rem_sent date;

-- 3. Geheimnisse im Tresor (Vault).
--    mind_push_cron: Losung, die die Datenbank beim Anstossen mitschickt. Nur wer sie kennt, darf die Funktion ausloesen.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'mind_push_cron') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'mind_push_cron', 'MIND: Losung, mit der die Datenbank die Edge Function push-reminder anstoesst');
  end if;
end $$;

-- Alle drei Geheimnisse fuer die Edge Function. Darf nur der Server aufrufen (service_role), nie die App.
create function public.push_secrets()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'cron',          (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'mind_push_cron'),
    'vapid_public',  (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'mind_vapid_public'),
    'vapid_private', (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'mind_vapid_private'));
$$;

-- Schluesselpaar fuer Web Push ablegen. Nur beim ersten Mal: Gibt es schon eins, bleibt es (sonst waeren alle
-- Anmeldungen der Geraete auf einen Schlag ungueltig). Gibt zurueck, was jetzt im Tresor steht.
create function public.push_keys_set(p_public text, p_private text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('mind_push_keys')); -- zwei gleichzeitige Laeufe nacheinander
  if not exists (select 1 from vault.secrets where name = 'mind_vapid_private') then
    perform vault.create_secret(p_public, 'mind_vapid_public', 'MIND: oeffentlicher Schluessel fuer Web Push (bekommt jedes Geraet)');
    perform vault.create_secret(p_private, 'mind_vapid_private', 'MIND: privater Schluessel fuer Web Push (bleibt hier)');
  end if;
  return public.push_secrets();
end;
$$;

-- Der oeffentliche Schluessel fuer die App: Das Geraet braucht ihn, um sich fuer Push anzumelden.
-- Leer (null), solange die Edge Function noch nie gelaufen ist.
create function public.push_key()
returns text
language sql stable security definer set search_path = ''
as $$
  select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'mind_vapid_public';
$$;

revoke execute on function public.push_secrets() from public, anon, authenticated;
revoke execute on function public.push_keys_set(text, text) from public, anon, authenticated;
revoke execute on function public.push_key() from public, anon;
grant execute on function public.push_secrets() to service_role;
grant execute on function public.push_keys_set(text, text) to service_role;
grant execute on function public.push_key() to authenticated;

-- 4. Zeitplan. pg_cron = Wecker in der Datenbank, pg_net = die Datenbank kann eine Adresse im Netz aufrufen.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Stoesst die Edge Function an. Solange niemand die Erinnerung an hat und ein Geraet angemeldet ist, passiert nichts
-- (spart Aufrufe). p_force = trotzdem anstossen (einmal nach dem Einrichten, damit das Schluesselpaar entsteht).
create function public.push_tick(p_force boolean default false)
returns bigint
language plpgsql security definer set search_path = ''
as $$
begin
  if not p_force and not exists (
    select 1 from public.profiles p join public.push_subs s on s.user_id = p.id where p.rem_on
  ) then
    return null;
  end if;
  return net.http_post(
    url := 'https://pkaetsawprvkrryndtha.supabase.co/functions/v1/push-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-mind-cron', (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'mind_push_cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000);
end;
$$;
revoke execute on function public.push_tick(boolean) from public, anon, authenticated;

-- Alle 5 Minuten nachsehen, wer dran ist (gleicher Takt wie TICK in erinnerung.js)
select cron.schedule('mind-push', '*/5 * * * *', 'select public.push_tick()');
-- Jede Nacht: Tipp-IDs loeschen, die aelter als 30 Tage sind (Tabelle aus 2026-11-11_haken-ohne-netz.sql)
select cron.schedule('mind-tipp-ids', '17 3 * * *',
  $$delete from public.checkin_ops where created_at < now() - interval '30 days'$$);

commit;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------------------------------------
-- Nach dem Ausrollen der Edge Function einmal anstossen, damit das Schluesselpaar entsteht:
--   select public.push_tick(true);
-- Nachsehen (zeigt nur die Namen, nie die Werte):
--   select name, created_at from vault.secrets where name like 'mind_%' order by name;
--   select jobname, schedule, active from cron.job where jobname like 'mind-%';
--   select status_code, content, error_msg, created from net._http_response order by created desc limit 5;
--
-- Erinnerung fuer alle anhalten (z. B. bei einem Problem), ohne etwas zu loeschen:
--   select cron.unschedule('mind-push');
--
-- Rueckweg (nur falls noetig):
--   select cron.unschedule('mind-push'); select cron.unschedule('mind-tipp-ids');
--   drop function public.push_tick(boolean), public.push_key(), public.push_keys_set(text, text), public.push_secrets();
--   drop table public.push_subs;
--   alter table public.profiles drop column rem_sent;
--   delete from vault.secrets where name like 'mind_%';
