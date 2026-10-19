-- A1: Reihenfolge der Habits (Verschieben). Einmal in Supabase SQL Editor ausfuehren.
alter table public.habits add column if not exists pos integer not null default 0;

-- Bestehende Habits nach Anlegedatum nummerieren (pro Nutzer)
update public.habits h
set pos = s.rn
from (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from public.habits
) s
where h.id = s.id;
