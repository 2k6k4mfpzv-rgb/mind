// MIND – Zeichnen: Jede Ansicht meldet hier an, was sie zeichnet. render() zeichnet alles neu.
// So müssen sich die Ansichten nicht gegenseitig kennen.
const parts=[];
export const onRender=fn=>{parts.push(fn)};
// keep = die Kacheln auf "Heute" nicht neu bauen (nach dem Antippen einer Kachel, damit sie sich animiert füllt)
export const render=keep=>{parts.forEach(fn=>fn(keep))};
