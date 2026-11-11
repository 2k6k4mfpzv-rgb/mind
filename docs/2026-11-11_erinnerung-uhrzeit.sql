-- MIND – Erinnerung: Eine geaenderte Uhrzeit gilt am selben Tag noch einmal (11.11.2026)
--
-- Problem: profiles.rem_sent merkt sich, an welchem Tag zuletzt erinnert wurde (hoechstens eine Nachricht am Tag).
-- Wer nach der Erinnerung die Uhrzeit auf spaeter stellt, bekam an dem Tag nichts mehr.
-- Loesung: Aendert sich rem_time und liegt die neue Uhrzeit noch vor uns (in der Zeitzone des Profils),
-- wird rem_sent geleert. Dann erinnert der naechste Lauf zur neuen Uhrzeit.
-- Liegt die neue Uhrzeit schon hinter uns, bleibt alles, wie es ist: Es kommt keine zweite Nachricht sofort.
--
-- Aendert keine Daten. Legt nur eine Funktion und einen Trigger auf profiles an.
-- Rueckgaengig:
--   drop trigger profiles_rem_reset on public.profiles;
--   drop function public.profiles_rem_reset();

begin;

create or replace function public.profiles_rem_reset() returns trigger
language plpgsql set search_path = '' as $$
begin
  begin
    if new.rem_time > to_char(now() at time zone coalesce(nullif(new.timezone, ''), 'Europe/Berlin'), 'HH24:MI') then
      new.rem_sent := null;
    end if;
  exception when others then
    null; -- unbekannte Zeitzone: nichts aendern, das Speichern der Uhrzeit darf daran nie scheitern
  end;
  return new;
end $$;

revoke all on function public.profiles_rem_reset() from public, anon, authenticated;

drop trigger if exists profiles_rem_reset on public.profiles;
create trigger profiles_rem_reset before update of rem_time on public.profiles
  for each row when (new.rem_time is distinct from old.rem_time)
  execute function public.profiles_rem_reset();

commit;
