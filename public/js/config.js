// MIND – Konfiguration und feste Werte. Hier steht nichts, was rechnet oder zeichnet.

// Supabase: Adresse und öffentlicher anon-Key. Der Key darf im Code stehen, weil die Datenbank jede Zeile
// per Row Level Security schützt. Der service_role-Key darf NIE hier stehen.
export const SUPA_URL="https://pkaetsawprvkrryndtha.supabase.co";
export const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrYWV0c2F3cHJ2a3JyeW5kdGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUwMDYsImV4cCI6MjEwNzY0MTAwNn0.PE4PaCBQtBYZZSFDP5lZM1NTXpBeyxDkVVUMDfYYN9A";

// Grenzen an einer Stelle (später auch für Gratis und Pro, siehe Roadmap Grundregel 3)
export const TARGET_MAX=20; // höchstes Tagesziel, gleiche Grenze wie in der Datenbank

export const RKEY="habits-rem"; // localStorage: an welchem Tag dieses Gerät schon erinnert hat
export const TKEY="mind-theme"; // localStorage: gewähltes Theme, damit die Seite gleich in der richtigen Farbe startet (auch in index.html)
export const SKEY="mind-seen";  // localStorage: bis zu wie vielen Tagen dieses Gerät die Sammlung schon gesehen hat
export const UNIT_MAX=20;       // längste Einheit, gleiche Grenze wie in der Datenbank
export const DAYS=["Mo","Di","Mi","Do","Fr","Sa","So"];
// Tageszeit-Auswahl im Formular
export const DT=[["","Keine"],["morgen","Morgen"],["mittag","Mittag"],["abend","Abend"],["zeit","Uhrzeit"]];

// 8 Habit-Farben: [Schlüssel in der Spalte color, Name, Farbwert]. Leer = automatisch aus der ID.
export const COLS=[["himmel","Himmel","#5AA9E6"],["salbei","Salbei","#7FB58A"],["lavendel","Lavendel","#9B8AE6"],["apricot","Apricot","#F5A25D"],["sonne","Sonne","#F2C94C"],["rose","Rose","#E88AAE"],["petrol","Petrol","#3A9A99"],["koralle","Koralle","#F26B4F"]];
export const HEX=Object.fromEntries(COLS.map(c=>[c[0],c[2]]));

// 16 Symbole: [Schlüssel in der Spalte icon, Name, SVG-Pfade]. Leer = Anfangsbuchstabe des Namens.
export const ICONS=[
 ["tropfen","Wasser",'<path d="M12 3.5c3.6 4.3 5.6 7.5 5.6 10.2a5.6 5.6 0 0 1-11.2 0c0-2.7 2-5.9 5.6-10.2z"/>'],
 ["blatt","Natur",'<path d="M5 19C5 11 10.5 5.5 19 5c-.5 8.5-6 14-14 14z"/><path d="M5 19l7.5-7.5"/>'],
 ["buch","Lesen",'<path d="M12 6.5C10.5 5 8.3 4.5 4 4.5v14c4.3 0 6.5.5 8 2 1.5-1.5 3.7-2 8-2v-14c-4.3 0-6.5.5-8 2zM12 6.5v14"/>'],
 ["hantel","Training",'<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'],
 ["puls","Bewegung",'<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>'],
 ["sonne","Morgen",'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'],
 ["mond","Schlaf",'<path d="M20 13.2A8 8 0 1 1 10.8 4a6.3 6.3 0 0 0 9.2 9.2z"/>'],
 ["stift","Schreiben",'<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'],
 ["herz","Gesundheit",'<path d="M19.8 5.6a4.9 4.9 0 0 0-7 0L12 6.4l-.8-.8a4.9 4.9 0 0 0-7 7l.8.8L12 20.4l7-7 .8-.8a4.9 4.9 0 0 0 0-7z"/>'],
 ["apfel","Essen",'<path d="M12 7.5c-1.6-1.2-6-1.4-6.8 2.6-.8 4 1.6 10 4.3 10.4 1.2.2 1.7-.6 2.5-.6s1.3.8 2.5.6c2.7-.4 5.1-6.4 4.3-10.4-.8-4-5.2-3.8-6.8-2.6z"/><path d="M12 7.5c0-2 .8-3.3 2.8-4"/>'],
 ["pille","Medizin",'<rect x="2.8" y="8.8" width="18.4" height="6.4" rx="3.2" transform="rotate(-45 12 12)"/><path d="M9.7 9.7l4.6 4.6"/>'],
 ["note","Musik",'<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'],
 ["sprache","Sprache",'<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-9l-4.5 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5z"/>'],
 ["hut","Lernen",'<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.6v4.4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4.4M21.5 9.5v5"/>'],
 ["haus","Zuhause",'<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5M10 20v-5h4v5"/>'],
 ["handy","Handy",'<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>']
];
export const ICO=Object.fromEntries(ICONS.map(i=>[i[0],i[2]]));

// Themes der Sammlung: [Schlüssel (profiles.theme und data-theme am <html>), Name, frei ab so vielen Tagen insgesamt].
// Die Farben stehen in css/tokens.css. Das Standard-Theme "Puls" (Schlüssel leer) ist immer frei.
export const THEMES=[["nebel","Morgennebel",7],["wald","Wald",30],["sand","Sand",60],["tiefsee","Tiefsee",100],["abendrot","Abendrot",150],["mitternacht","Mitternacht",250]];
