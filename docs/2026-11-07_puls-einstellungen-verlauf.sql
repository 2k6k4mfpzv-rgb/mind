-- Puls 1.1, Fehler 1: Frühere Einstellungen pro Habit (Tage und Tagesziel), damit alte Haken nach einer Änderung richtig zählen.
-- Einmal in Supabase ausfuehren, BEVOR der neue Code getestet wird (die Vorschau nutzt dieselbe echte Datenbank).
-- Vorher Backup der Tabelle habits. Der alte Code auf main stoert sich nicht an der neuen Spalte.

-- settings_log: Liste von {"until": "JJJJ-MM-TT", "days": [0..6], "target": n}, aufsteigend nach until.
-- Bedeutung: Bis zum Tag "until" (ausschliesslich) galten diese Tage und dieses Tagesziel.
-- Leer = es galt immer die aktuelle Einstellung. Die App ergaenzt die Liste selbst, wenn man Tage oder Tagesziel aendert.
alter table public.habits
  add column if not exists settings_log jsonb not null default '[]'::jsonb;

alter table public.habits
  add constraint habits_settings_log_valid check (jsonb_typeof(settings_log) = 'array');

-- Einmalig: Vor A2 (06.11.2026) gab es kein Tagesziel, eine 1 hiess "geschafft".
-- Habits mit Tagesziel ueber 1, die vor dem 06.11.2026 angelegt wurden, bekommen deshalb den Eintrag: bis 06.11.2026 galt 1x.
-- Die Tage bleiben wie heute eingestellt. Die Haken selbst werden nicht veraendert. (Entschieden von Paul am 07.11.2026.)
update public.habits
set settings_log = jsonb_build_array(jsonb_build_object('until', '2026-11-06', 'days', to_jsonb(days), 'target', 1))
where target > 1 and created < '2026-11-06' and settings_log = '[]'::jsonb;
