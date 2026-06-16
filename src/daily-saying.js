// ===================================================================
// daily-saying.js — מציג "משפט חכם" אחד ליום, מתחלף בכל חצות (שעון מקומי).
// הבחירה דטרמיניסטית לפי התאריך, כך שכל המכשירים רואים את אותו משפט באותו יום.
// ===================================================================

import { SAYINGS } from './sayings.js';
import { escapeHtml } from './util.js';

const DAY = 86400000;

// המשפט של היום: לפי מספר הימים מאז 1970 (בתאריך המקומי) מודולו אורך המאגר.
export function todaysSaying(date = new Date()) {
    if (!SAYINGS.length) return null;
    const dayNum = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
    return SAYINGS[((dayNum % SAYINGS.length) + SAYINGS.length) % SAYINGS.length];
}

export function renderDailySaying() {
    const box = document.getElementById("daily-saying");
    if (!box) return;
    const s = todaysSaying();
    if (!s) { box.innerHTML = ""; return; }

    const speaker = s.speaker
        ? `<span class="text-sm font-bold text-amber-700 whitespace-nowrap">— ${escapeHtml(s.speaker)}</span>` : "";
    const wisdom = s.wisdom
        ? `<p class="text-xs text-slate-500 mt-2 leading-relaxed">✨ ${escapeHtml(s.wisdom)}</p>` : "";
    const source = s.source
        ? (s.url
            ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="text-[10px] text-slate-400 hover:text-amber-600 mt-2 inline-block">📖 ${escapeHtml(s.source)}</a>`
            : `<span class="text-[10px] text-slate-400 mt-2 inline-block">📖 ${escapeHtml(s.source)}</span>`)
        : "";

    box.innerHTML = `
        <div class="flex items-center gap-2 mb-1.5">
            <span class="text-2xl">💡</span>
            <span class="text-xs font-bold uppercase tracking-wide text-amber-600">משפט חכם להיום</span>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p class="text-lg md:text-xl font-extrabold text-slate-800 leading-snug">"${escapeHtml(s.quote)}"</p>
            ${speaker}
        </div>
        ${wisdom}
        ${source}
    `;
}
