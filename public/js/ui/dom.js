// MIND – kleine Helfer für die Oberfläche und HTML-Bausteine, die mehrere Ansichten brauchen.
import {DAYS,COLS,ICONS,ICO,DT} from "../config.js";

export const $=id=>document.getElementById(id);
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); // Text sicher in HTML einsetzen
export const fmt=(d,o)=>d.toLocaleDateString("de-DE",o);
export const dtLabel=d=>({morgen:"Morgen",mittag:"Mittag",abend:"Abend"})[d]||(d?d+" Uhr":"");

// Symbole
export const CHECK='<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg>';
const svgI=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
const ini=s=>([...s.trim()][0]||"?").toUpperCase();
export const icoOf=h=>h.icon?svgI(h.icon):esc(ini(h.name)); // Symbol oder Anfangsbuchstabe

// Auswahl-Bausteine für "Neues Habit" (p = "a") und "Bearbeiten" (p = "e")
export const daysHtml=(sel,attr)=>DAYS.map((d,i)=>`<button type="button" class="${sel.includes(i)?"on":""}" data-${attr}="${i}" aria-pressed="${sel.includes(i)}">${d[0]}</button>`).join("");
export const colsHtml=(cur,p)=>`<div class="cols" role="radiogroup" aria-label="Farbe">${COLS.map(([k,l,x])=>`<button type="button" role="radio" aria-checked="${k===cur}" aria-label="${l}" data-${p}col="${k}" style="--c:${x}">${k===cur?CHECK:""}</button>`).join("")}</div>`;
export const icosHtml=(cur,p,hex)=>`<div class="icos" role="radiogroup" aria-label="Symbol" style="--c:${hex}"><button type="button" role="radio" aria-checked="${!cur}" aria-label="Kein Symbol, Anfangsbuchstabe" data-${p}ico="">Aa</button>${ICONS.map(([k,l])=>`<button type="button" role="radio" aria-checked="${k===cur}" aria-label="${l}" data-${p}ico="${k}">${svgI(k)}</button>`).join("")}</div>`;
// "Mehr Optionen": Tagesziel und Tageszeit
export function optsHtml(p,t,dt,tm){
  return `<div class="opts"><label>Wie oft am Tag?<input type="number" id="${p}tg" min="1" max="20" step="1" inputmode="numeric" value="${esc(t)}"></label><label>Tageszeit<select id="${p}dt" data-tm="${p}tm">${DT.map(([v,l])=>`<option value="${v}"${v===dt?" selected":""}>${l}</option>`).join("")}</select></label><input type="time" class="full" id="${p}tm" value="${esc(tm)}" aria-label="Uhrzeit"${dt==="zeit"?"":" hidden"}></div>`;
}
