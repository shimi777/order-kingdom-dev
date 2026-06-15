// ===================================================================
// schedule.js — weekly schedule, monthly calendar, shopping list,
// dinner-menu editor, date editor, schedule view sub-tabs.
// Owns `scheduleSub` and `calMonth` (both reassigned only here).
// ===================================================================

import { CHARACTERS, EDITABLE_CHARS, DAY_NAMES, HEB_MONTHS } from './constants.js';
import { escapeHtml, escapeAttr, dateKey } from './util.js';
import { gameState, persistGame, persistGameDebounced } from './state.js';
import { showToast } from './render.js';
import { fetchGcalEvents } from './sync.js';

let scheduleSub = 'weekly';
let calMonth = null; // תאריך ראשון-בחודש המוצג; מאותחל ב-initSchedule
export { scheduleSub };

// אתחול הלו״ז (מוחלף את שורות window.onload המקוריות): חודש נוכחי + רינדור ראשוני
export function initSchedule() {
    const _now = new Date();
    calMonth = new Date(_now.getFullYear(), _now.getMonth(), 1);
    renderSchedule(); renderMonth();
}

export function switchScheduleSub(sub) {
    scheduleSub = sub;
    const subs = { weekly: "sub-weekly", monthly: "sub-monthly", gcal: "sub-gcal" };
    const tabs = { weekly: "subtab-weekly", monthly: "subtab-monthly", gcal: "subtab-gcal" };
    const activeCls = "py-1.5 px-4 bg-amber-500 text-white border border-amber-500 rounded-xl text-xs font-bold shadow-sm";
    const idleCls   = "py-1.5 px-4 bg-white/80 hover:bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold shadow-sm";
    Object.keys(subs).forEach(key => {
        document.getElementById(subs[key]).classList.toggle("hidden", key !== sub);
        document.getElementById(tabs[key]).className = (key === sub) ? activeCls : idleCls;
    });
    if (sub === 'monthly') renderMonth();
    else if (sub === 'weekly') renderSchedule();
    else if (sub === 'gcal')  fetchGcalEvents();
}

// ===== תצוגה שבועית =====
export function renderSchedule() {
    const thead = document.getElementById("schedule-thead");
    const tbody = document.getElementById("schedule-tbody");
    if (!thead || !tbody) return;
    const ws = gameState.weeklySchedule || {};
    const acts = ws.activities || {};
    const dinners = ws.dinners || {};
    const breakfasts = ws.breakfasts || {};

    let head = `<tr><th class="p-2 text-center text-slate-400 font-bold">יום</th>`;
    EDITABLE_CHARS.forEach(k => {
        const c = CHARACTERS[k];
        head += `<th class="p-2 text-center min-w-[110px]"><div class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-br ${c.color} ${c.text} font-bold text-[11px]">${c.emoji} ${escapeHtml(c.name)}</div></th>`;
    });
    head += `<th class="p-2 text-center min-w-[130px]"><div class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-100 text-rose-700 font-bold text-[11px]">🍽️ ארוחת ערב</div></th></tr>`;
    thead.innerHTML = head;

    // תאריכי השבוע הנוכחי (ראשון=0 ... שבת=6)
    const today = new Date();
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const todayK = dateKey(today);

    let rows = "";
    for (let d = 0; d < 7; d++) {
        const cellDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + d);
        const dateLabel = cellDate.getDate() + "." + (cellDate.getMonth() + 1);
        const isToday = dateKey(cellDate) === todayK;
        rows += `<tr class="border-t border-slate-100">`;
        rows += `<td class="p-2 text-center align-top whitespace-nowrap ${isToday ? 'bg-amber-50/60 rounded-xl' : ''}">
            <div class="font-bold text-slate-700">${DAY_NAMES[d]}</div>
            <div class="text-[10px] ${isToday ? 'text-amber-600 font-bold' : 'text-slate-400'}">${dateLabel}</div>
        </td>`;
        EDITABLE_CHARS.forEach(k => {
            const val = (acts[d] && acts[d][k]) || "";
            rows += `<td class="p-1 align-top"><textarea rows="2" oninput="updateScheduleCell(${d},'${k}',this.value)" placeholder="—" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs focus:outline-none focus:border-amber-300 resize-y">${escapeHtml(val)}</textarea></td>`;
        });
        if (d === 6) {
            const bVal = breakfasts[6] || "";
            const dVal = dinners[6] || "";
            rows += `<td class="p-1 align-top">
                <label class="block text-[9px] font-bold text-amber-600 mb-0.5">🥐 בוקר</label>
                <textarea rows="1" oninput="updateBreakfastCell(6,this.value)" placeholder="—" class="w-full bg-amber-50/70 border border-amber-100 rounded-xl py-1.5 px-2 text-xs focus:outline-none focus:border-amber-300 resize-y mb-1.5">${escapeHtml(bVal)}</textarea>
                <label class="block text-[9px] font-bold text-rose-600 mb-0.5">🍽️ ערב</label>
                <select onchange="updateDinnerCell(6,this.value)" class="w-full bg-rose-50/60 border border-rose-100 rounded-xl py-1.5 px-2 text-xs focus:outline-none focus:border-amber-300">${dinnerOptionsHtml(dVal)}</select>
            </td>`;
        } else {
            const dVal = dinners[d] || "";
            rows += `<td class="p-1 align-top"><select onchange="updateDinnerCell(${d},this.value)" class="w-full bg-rose-50/50 border border-rose-100 rounded-xl py-1.5 px-2 text-xs focus:outline-none focus:border-amber-300">${dinnerOptionsHtml(dVal)}</select></td>`;
        }
        rows += `</tr>`;
    }
    tbody.innerHTML = rows;
    renderShoppingList();
}

// בונה את ה-<option>-ים לרשימת ארוחות הערב (כולל ערך נבחר שאינו ברשימה)
export function dinnerOptionsHtml(selected) {
    const opts = (gameState.dinnerOptions || []).slice();
    let html = `<option value="">—</option>`;
    if (selected && opts.indexOf(selected) === -1) {
        html += `<option value="${escapeAttr(selected)}" selected>${escapeHtml(selected)}</option>`;
    }
    opts.forEach(o => {
        html += `<option value="${escapeAttr(o)}"${o === selected ? ' selected' : ''}>${escapeHtml(o)}</option>`;
    });
    return html;
}

export function updateScheduleCell(day, charKey, value) {
    if (!gameState.weeklySchedule.activities[day]) gameState.weeklySchedule.activities[day] = {};
    gameState.weeklySchedule.activities[day][charKey] = value;
    persistGameDebounced();
}
export function updateDinnerCell(day, value) {
    gameState.weeklySchedule.dinners[day] = value;
    persistGame();
}

// ===== ניהול תפריט ארוחות הערב (רשימה נפתחת שניתן לערוך) =====
export function openDinnerEditor() { renderDinnerEditor(); document.getElementById("dinner-editor-modal").classList.remove("hidden"); }
export function closeDinnerEditor() { document.getElementById("dinner-editor-modal").classList.add("hidden"); }
export function renderDinnerEditor() {
    const list = document.getElementById("dinner-options-list");
    const opts = gameState.dinnerOptions || [];
    if (!opts.length) { list.innerHTML = `<p class="text-center text-slate-400 text-xs py-2">הרשימה ריקה — הוסיפו מנה.</p>`; return; }
    list.innerHTML = opts.map((o, i) => `
        <div class="flex items-center gap-2 bg-white/70 border border-slate-100 rounded-xl px-3 py-2">
            <span class="flex-1 text-sm text-slate-700">🍽️ ${escapeHtml(o)}</span>
            <button onclick="deleteDinnerOption(${i})" class="text-rose-400 hover:text-rose-600 text-sm shrink-0">🗑️</button>
        </div>`).join("");
}
export function addDinnerOption() {
    const input = document.getElementById("dinner-option-input");
    const val = input.value.trim();
    if (!val) return;
    if (!gameState.dinnerOptions) gameState.dinnerOptions = [];
    if (gameState.dinnerOptions.indexOf(val) !== -1) { showToast("כבר קיים", `"${val}" כבר בתפריט.`); input.value = ""; return; }
    gameState.dinnerOptions.push(val);
    input.value = "";
    persistGame();
    renderDinnerEditor();
    renderSchedule();
}
export function deleteDinnerOption(idx) {
    if (!gameState.dinnerOptions) return;
    gameState.dinnerOptions.splice(idx, 1);
    persistGame();
    renderDinnerEditor();
    renderSchedule();
}
export function updateBreakfastCell(day, value) {
    if (!gameState.weeklySchedule.breakfasts) gameState.weeklySchedule.breakfasts = {};
    gameState.weeklySchedule.breakfasts[day] = value;
    persistGameDebounced();
}

// ===== תצוגה חודשית (לוח שנה) =====
export function renderMonth() {
    if (!calMonth) { const n = new Date(); calMonth = new Date(n.getFullYear(), n.getMonth(), 1); }
    const title = document.getElementById("month-title");
    const namesRow = document.getElementById("month-daynames");
    const grid = document.getElementById("month-grid");
    if (!grid) return;

    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    title.innerText = `${HEB_MONTHS[month]} ${year}`;
    namesRow.innerHTML = DAY_NAMES.map(n => `<div class="text-center text-[10px] font-bold text-slate-400 py-1">${n}</div>`).join("");

    const startDay = new Date(year, month, 1).getDay();      // 0 = ראשון
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = dateKey(new Date());
    const events = gameState.datedEvents || {};

    let cells = "";
    for (let i = 0; i < startDay; i++) cells += `<div class="aspect-square"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
        const key = dateKey(new Date(year, month, day));
        const ev = events[key] || "";
        const isToday = key === todayKey;
        const lines = ev ? ev.split("\n").filter(l => l.trim()) : [];
        let preview = "";
        lines.slice(0, 2).forEach(l => {
            preview += `<div class="text-[8px] leading-tight text-amber-800 bg-amber-50 rounded px-1 mb-0.5 truncate">${escapeHtml(l)}</div>`;
        });
        if (lines.length > 2) preview += `<div class="text-[8px] text-slate-400 px-1">+${lines.length - 2}</div>`;
        cells += `<div onclick="openDateEditor('${key}')" class="aspect-square rounded-xl border p-1 cursor-pointer overflow-hidden flex flex-col transition-all ${isToday ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-300' : 'border-slate-100 bg-white/60 hover:border-amber-200 hover:bg-amber-50/30'}">
            <div class="text-[10px] font-bold ${isToday ? 'text-amber-700' : 'text-slate-500'} mb-0.5">${day}</div>
            <div class="flex-1 overflow-hidden">${preview}</div>
        </div>`;
    }
    grid.innerHTML = cells;
}

export function monthPrev()  { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderMonth(); }
export function monthNext()  { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderMonth(); }
export function monthToday() { const t = new Date(); calMonth = new Date(t.getFullYear(), t.getMonth(), 1); renderMonth(); }

// ===== עורך תאריך (אירוע חד-פעמי) =====
export function openDateEditor(dateStr) {
    document.getElementById("date-editor-key").value = dateStr;
    const parts = dateStr.split("-");
    document.getElementById("date-editor-title").innerText = `📅 ${parseInt(parts[2])} ב${HEB_MONTHS[parseInt(parts[1]) - 1]}`;
    document.getElementById("date-editor-text").value = (gameState.datedEvents && gameState.datedEvents[dateStr]) || "";
    document.getElementById("date-editor-modal").classList.remove("hidden");
    setTimeout(() => document.getElementById("date-editor-text").focus(), 50);
}
export function closeDateEditor() { document.getElementById("date-editor-modal").classList.add("hidden"); }
export function saveDateEditor() {
    const key = document.getElementById("date-editor-key").value;
    const text = document.getElementById("date-editor-text").value.trim();
    if (!gameState.datedEvents) gameState.datedEvents = {};
    if (text) gameState.datedEvents[key] = text;
    else delete gameState.datedEvents[key];
    persistGame();
    renderMonth();
    closeDateEditor();
}

// ===== רשימת קניות =====
export function renderShoppingList() {
    const list = document.getElementById("shopping-list");
    if (!list) return;
    const items = gameState.shoppingList || [];
    if (items.length === 0) {
        list.innerHTML = `<p class="text-center text-slate-400 text-xs py-2">הרשימה ריקה — הוסיפו מצרך ראשון 🛒</p>`;
        return;
    }
    list.innerHTML = items.map(it => `
        <div class="flex items-center gap-2 bg-white/70 border border-slate-100 rounded-xl px-3 py-2">
            <button onclick="toggleShoppingItem('${it.id}')" class="w-5 h-5 shrink-0 rounded border flex items-center justify-center ${it.done ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-slate-300'}">${it.done ? '✓' : ''}</button>
            <span class="flex-1 text-sm ${it.done ? 'line-through text-slate-400' : 'text-slate-700'}">${escapeHtml(it.text)}</span>
            <button onclick="deleteShoppingItem('${it.id}')" class="text-rose-400 hover:text-rose-600 text-sm shrink-0">🗑️</button>
        </div>`).join("");
}
export function addShoppingItem() {
    const input = document.getElementById("shopping-input");
    const text = input.value.trim();
    if (!text) return;
    if (!gameState.shoppingList) gameState.shoppingList = [];
    gameState.shoppingList.push({ id: "s" + Date.now(), text, done: false });
    input.value = "";
    persistGame();
    renderShoppingList();
}
export function toggleShoppingItem(id) {
    const it = (gameState.shoppingList || []).find(x => x.id === id);
    if (it) { it.done = !it.done; persistGame(); renderShoppingList(); }
}
export function deleteShoppingItem(id) {
    gameState.shoppingList = (gameState.shoppingList || []).filter(x => x.id !== id);
    persistGame();
    renderShoppingList();
}
export function clearBoughtItems() {
    gameState.shoppingList = (gameState.shoppingList || []).filter(x => !x.done);
    persistGame();
    renderShoppingList();
}
