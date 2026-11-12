// MIND – kleine Helfer für die Oberfläche und HTML-Bausteine, die mehrere Ansichten brauchen.
import {DAYS,COLS,ICONS,ICO,DT,UNIT_MAX} from "../config.js";
import {parseDay} from "../logic.js";

export const $=id=>document.getElementById(id);
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); // Text sicher in HTML einsetzen
export const fmt=(d,o)=>d.toLocaleDateString("de-DE",o);
export const dtLabel=d=>({morgen:"Morgen",mittag:"Mittag",abend:"Abend"})[d]||(d?d+" Uhr":"");
const dm=k=>fmt(parseDay(k),{day:"numeric",month:"short"});
export const pauseLabel=p=>p.to?"Pausiert bis "+dm(p.to):"Pausiert seit "+dm(p.from); // p = laufende Pause {from, to}

// Symbole
export const CHECK='<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg>';
const svgI=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
const ini=s=>([...s.trim()][0]||"?").toUpperCase();
export const icoOf=h=>h.icon?svgI(h.icon):esc(ini(h.name)); // Symbol oder Anfangsbuchstabe

// KI (Paket 3): der Funke in Koralle ist das Zeichen für die KI, die Plakette markiert, was später zu Pro gehört.
// Solange es kein bezahltes Pro gibt, ist alles für alle frei (Roadmap A5), die Plakette sperrt nichts.
export const SPARK='<svg class="sp" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3.5l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z"/><path d="M18 13.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>';
export const PRO='<span class="pro">PRO</span>';

// Auswahl-Bausteine für "Neues Habit" (p = "a") und "Bearbeiten" (p = "e")
export const daysHtml=(sel,attr)=>DAYS.map((d,i)=>`<button type="button" class="${sel.includes(i)?"on":""}" data-${attr}="${i}" aria-pressed="${sel.includes(i)}">${d[0]}</button>`).join("");
export const colsHtml=(cur,p)=>`<div class="cols" role="radiogroup" aria-label="Farbe">${COLS.map(([k,l,x])=>`<button type="button" role="radio" aria-checked="${k===cur}" aria-label="${l}" data-${p}col="${k}" style="--c:${x}">${k===cur?CHECK:""}</button>`).join("")}</div>`;
export const icosHtml=(cur,p,hex)=>`<div class="icos" role="radiogroup" aria-label="Symbol" style="--c:${hex}"><button type="button" role="radio" aria-checked="${!cur}" aria-label="Kein Symbol, Anfangsbuchstabe" data-${p}ico="">Aa</button>${ICONS.map(([k,l])=>`<button type="button" role="radio" aria-checked="${k===cur}" aria-label="${l}" data-${p}ico="${k}">${svgI(k)}</button>`).join("")}</div>`;
// "Mehr Optionen": Tagesziel, Tageszeit und Einheit (un = Einzahl oder freier Text, up = Mehrzahl)
export function optsHtml(p,t,dt,tm,un,up){
  return `<div class="opts"><label>Wie oft am Tag?<input type="number" id="${p}tg" min="1" max="20" step="1" inputmode="numeric" value="${esc(t)}"></label><label>Tageszeit<select id="${p}dt" data-tm="${p}tm">${DT.map(([v,l])=>`<option value="${v}"${v===dt?" selected":""}>${l}</option>`).join("")}</select></label><input type="time" class="full" id="${p}tm" value="${esc(tm)}" aria-label="Uhrzeit"${dt==="zeit"?"":" hidden"}><label>Einheit (optional)<input id="${p}un" maxlength="${UNIT_MAX}" placeholder="z. B. Glas" value="${esc(un)}"></label><label>Mehrzahl<input id="${p}up" maxlength="${UNIT_MAX}" placeholder="z. B. Gläser" value="${esc(up)}"></label><p class="note full">Steht auf der Kachel, z. B. „noch 3 Gläser“. Bei einmal am Tag einfach so, wie du es schreibst, z. B. „5 Minuten“.</p></div>`;
}
