-- Puls Schritt 1: Farbe und Symbol pro Habit. Einmal in Supabase ausfuehren, BEVOR der neue Code getestet wird
-- (die Vorschau-Seite nutzt dieselbe echte Datenbank). Vorher Backup der Tabelle habits.
-- Der alte Code auf main stoert sich nicht an den neuen Spalten.

-- Farbe. Leer = automatisch (die App waehlt eine feste Farbe aus der ID). Erlaubt sind die 8 Puls-Farben.
alter table public.habits
  add column if not exists color text not null default '';

alter table public.habits
  add constraint habits_color_valid check (
    color in ('', 'himmel', 'salbei', 'lavendel', 'apricot', 'sonne', 'rose', 'petrol', 'koralle')
  );

-- Symbol. Leer = Anfangsbuchstabe des Namens. Erlaubt sind die 16 Symbole der App.
alter table public.habits
  add column if not exists icon text not null default '';

alter table public.habits
  add constraint habits_icon_valid check (
    icon in ('', 'tropfen', 'blatt', 'buch', 'hantel', 'puls', 'sonne', 'mond', 'stift',
             'herz', 'apfel', 'pille', 'note', 'sprache', 'hut', 'haus', 'handy')
  );

-- Bestehende Habits bekommen einmalig der Reihe nach eine Farbe (pro Nutzer, in der Reihenfolge pos).
-- Die Reihenfolge wechselt zwischen kuehlen und warmen Farben, damit Nachbar-Kacheln gut unterscheidbar sind.
-- Symbole bleiben leer, die waehlt Paul selbst. Sonst wird nichts an den Habits geaendert.
update public.habits h
set color = (array['himmel', 'salbei', 'lavendel', 'apricot', 'sonne', 'rose', 'petrol', 'koralle'])[((s.rn - 1) % 8) + 1]
from (
  select id, row_number() over (partition by user_id order by pos, created_at) as rn
  from public.habits
) s
where h.id = s.id and h.color = '';
