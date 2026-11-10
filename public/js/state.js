// MIND – Zustand der App im Browser: eine Stelle, die alle Module lesen.
// Daten (state) ändert nur data.js, die Oberfläche (ui) ändern die Ansichten.
import {startOfDay,iso} from "./logic.js";

// "Heute" wird beim Laden festgelegt. Wechselt der Tag, lädt app.js die Seite neu.
export const today=startOfDay(new Date());
export const TI=iso(today);

export const state={
  habits:[],                               // Habits mit Haken: h.done = {"JJJJ-MM-TT": Anzahl}
  prof:null,                               // Zeile aus der Tabelle profiles
  rem:{on:false,time:"20:00",last:""}      // Erinnerung (an/aus und Uhrzeit aus dem Profil, last nur auf diesem Gerät)
};

export const ui={
  offset:0,                // Verlauf: welche Woche aufgeklappt gezeigt wird (0 = diese, -1 = letzte ...)
  filter:"",               // Verlauf: gewählte Kategorie
  dfil:"",                 // Heute: gewählte Tageszeit
  sel:[0,1,2,3,4,5,6],     // Neues Habit: gewählte Wochentage
  acol:"",aico:"",         // Neues Habit: gewählte Farbe und Symbol
  openId:null,             // Verlauf: ID der aufgeklappten Karte
  ed:null,                 // Habit, das gerade bearbeitet wird (Formularwerte). sheet = im Blatt auf "Heute" statt in der Verlauf-Karte
  menu:null,               // Blatt der Kachel (lange drücken): {i: Habit, view: "main" | "pause" | "edit"}
  pausOpen:false,          // Heute: Liste der pausierten Habits aufgeklappt
  pend:-1                  // Verlauf: Habit, bei dem "Wirklich löschen?" steht
};
