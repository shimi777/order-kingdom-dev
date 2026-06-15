// ===================================================================
// sync.js — Google Drive CSV + Google Calendar push/fetch.
// ===================================================================

import { CHARACTERS, EDITABLE_CHARS, HEB_MONTHS, config } from './constants.js';
import { escapeHtml } from './util.js';
import { gameState } from './state.js';
import { showToast } from './render.js';

export function syncToGoogleDrive(actionDescription = "עדכון", isBackground = false) {
    if (!config.scriptUrl) {
        if (!isBackground) showToast("⚠️ חסר קישור", "אנא הגדירו את קישור ה-Web App של גוגל תחילה.");
        return;
    }

    const payload = {
        familyScore: gameState.score,
        personalScores: gameState.personalScores,
        lastAction: actionDescription
    };

    fetch(config.scriptUrl, {
        method: "POST",
        mode: "no-cors",
        cache: "no-cache",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).then(() => {
        if (!isBackground) showToast("☁️ סנכרן בהצלחה", "שורה חדשה נכתבה בקובץ ה-CSV בגוגל דרייב!");
        document.getElementById("sync-status-badge").className = "text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold";
        document.getElementById("sync-status-badge").innerText = "מחובר ומסונכרן";
    }).catch(() => {
        if (!isBackground) showToast("❌ שגיאת תקשורת", "הסנכרון נכשל. בידקו את הקישור שהזנתם.");
    });
}

// ===== סנכרון הלו״ז ליומן גוגל (דרך אותו Apps Script Web App) =====
export function buildCalendarPayload() {
    const ws = gameState.weeklySchedule || {};
    const acts = ws.activities || {}, dinners = ws.dinners || {}, breakfasts = ws.breakfasts || {};
    const weekly = [];
    for (let d = 0; d < 7; d++) {
        EDITABLE_CHARS.forEach(k => {
            const t = ((acts[d] && acts[d][k]) || "").trim();
            if (t) weekly.push({ day: d, label: CHARACTERS[k].name, text: t });
        });
        if (d === 6) {
            const b = (breakfasts[6] || "").trim();
            if (b) weekly.push({ day: 6, label: "🥐 ארוחת בוקר", text: b });
        }
        const din = (dinners[d] || "").trim();
        if (din) weekly.push({ day: d, label: "🍽️ ארוחת ערב", text: din });
    }
    return { type: "calendar", datedEvents: gameState.datedEvents || {}, weekly };
}

export function syncScheduleToCalendar() {
    if (!config.scriptUrl) {
        showToast("⚠️ חסר קישור", "הגדירו תחילה את קישור ה-Web App של גוגל במסך הראשי.");
        return;
    }
    showToast("🔄 שולח ליומן...", "מסנכרן את הלו״ז ליומן \"ממלכת הסדר\".");
    fetch(config.scriptUrl, {
        method: "POST", mode: "no-cors", cache: "no-cache",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCalendarPayload())
    }).then(() => {
        showToast("📅 נשלח ליומן", "הלו״ז נשלח. בדקו ביומן גוגל \"ממלכת הסדר 📅\".");
    }).catch(() => {
        showToast("❌ שגיאה", "הסנכרון ליומן נכשל. בדקו את הקישור.");
    });
}

// ===== קריאה מיומן גוגל → אפליקציה (JSONP, עוקף CORS) =====
export function fetchGcalEvents() {
    const status = document.getElementById("gcal-status");
    const box = document.getElementById("gcal-events");
    const nameInput = document.getElementById("gcal-name-input");
    const calName = (nameInput.value || "").trim();
    if (!config.scriptUrl) { status.innerText = "⚠️ חסר קישור Apps Script — הגדירו אותו במסך הראשי."; return; }
    if (!calName) { status.innerText = "⚠️ הזינו את שם היומן בגוגל ולחצו רענן."; return; }
    localStorage.setItem("kingdom_gcal_name", calName);
    status.innerText = "⏳ טוען אירועים מהיומן...";
    box.innerHTML = "";

    const cbName = "__gcalCb_" + Date.now();
    const fmt = d => d.toISOString().slice(0, 10);
    const from = new Date();
    const to = new Date(Date.now() + 120 * 86400000);
    let done = false;
    const script = document.createElement("script");
    function cleanup() { done = true; try { delete window[cbName]; } catch (e) { window[cbName] = undefined; } if (script.parentNode) script.remove(); }
    window[cbName] = function (resp) { if (done) return; renderGcalEvents(resp); cleanup(); };
    script.src = config.scriptUrl + "?action=getEvents&cal=" + encodeURIComponent(calName) +
        "&from=" + fmt(from) + "&to=" + fmt(to) + "&callback=" + cbName;
    script.onerror = function () { if (!done) { status.innerText = "❌ טעינה נכשלה. ודאו שהסקריפט פורסם מחדש (New version) ושההרשאה ל-Anyone."; cleanup(); } };
    document.body.appendChild(script);
    setTimeout(() => { if (!done) { status.innerText = "❌ אין תגובה מהשרת. בדקו את הקישור ואת הפרסום מחדש."; cleanup(); } }, 15000);
}

export function renderGcalEvents(resp) {
    const status = document.getElementById("gcal-status");
    const box = document.getElementById("gcal-events");
    if (!resp || !resp.ok) { status.innerText = "❌ שגיאה: " + ((resp && resp.error) || "לא ידועה. בדקו ששם היומן מדויק."); box.innerHTML = ""; return; }
    const events = resp.events || [];
    if (!events.length) { status.innerText = `אין אירועים ביומן "${resp.cal}" ב-120 הימים הקרובים.`; box.innerHTML = ""; return; }
    status.innerText = `נטענו ${events.length} אירועים מיומן "${resp.cal}".`;

    const groups = {};
    events.forEach(ev => { (groups[ev.dateStr] = groups[ev.dateStr] || []).push(ev); });
    box.innerHTML = Object.keys(groups).sort().map(dk => {
        const p = dk.split("-");
        const header = `${parseInt(p[2])} ב${HEB_MONTHS[parseInt(p[1]) - 1]} ${p[0]}`;
        const items = groups[dk].map(ev => `
            <div class="flex items-start gap-2 bg-white/70 border border-slate-100 rounded-xl px-3 py-2">
                <span class="text-xs font-bold text-sky-600 shrink-0 mt-0.5 w-14 text-center">${ev.timeStr || "כל היום"}</span>
                <div class="flex-1">
                    <div class="text-sm font-semibold text-slate-700">${escapeHtml(ev.title || "(ללא כותרת)")}</div>
                    ${ev.location ? `<div class="text-[10px] text-slate-400">📍 ${escapeHtml(ev.location)}</div>` : ""}
                </div>
            </div>`).join("");
        return `<div><div class="text-xs font-extrabold text-slate-500 mb-1.5 border-r-2 border-sky-300 pr-2">${header}</div><div class="space-y-1.5">${items}</div></div>`;
    }).join("");
}
