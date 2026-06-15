// ===================================================================
// prizes.js — Friday reveal (weekly bonus), 100% family rewards,
// prize editor, weekly-reset confirmation.
// Owns `prizeEditTarget` (reassigned only here).
// ===================================================================

import { CHARACTERS, PERSONAL_ROOMS, WEEKLY_BONUS_PTS, PROTECTED_PRIZE_ID, WEEK_MS } from './constants.js';
import { gameState, saveGameState, getWeekAvg, resetToInitial } from './state.js';
import { showToast } from './render.js';
import { editMode } from './tasks.js';
import { syncToGoogleDrive } from './sync.js';

export function openFridayReveal()  { renderFridayReveal(); document.getElementById("friday-modal").classList.remove("hidden"); }
export function closeFridayReveal() { document.getElementById("friday-modal").classList.add("hidden"); }

export function claimWeeklyPrize(roomId, prizeId) {
    const entry = gameState.weeklyBonusLog && gameState.weeklyBonusLog[roomId];
    if (!entry || entry.prize) return;
    entry.prize = prizeId;
    if (prizeId === 'points') {
        const char = PERSONAL_ROOMS[roomId];
        if (!gameState.carryOverBonus) gameState.carryOverBonus = {};
        gameState.carryOverBonus[char] = (gameState.carryOverBonus[char] || 0) + WEEKLY_BONUS_PTS;
    }
    saveGameState(`חשיפת שישי — בחירת פרס חדר ${roomId}`);
    renderFridayReveal();
    updateFridayBadge();
}

export function updateFridayBadge() {
    const currentWeek = Math.floor(Date.now() / WEEK_MS);
    const hasUnclaimed = Object.entries(PERSONAL_ROOMS).some(([id]) => {
        const entry = gameState.weeklyBonusLog && gameState.weeklyBonusLog[parseInt(id)];
        return entry && entry.week === currentWeek && !entry.prize;
    });
    const badge = document.getElementById("friday-badge");
    if (badge) badge.classList.toggle("hidden", !hasUnclaimed);
}

export function renderFridayReveal() {
    const currentWeek = Math.floor(Date.now() / WEEK_MS);
    const body = document.getElementById("friday-reveal-body");
    if (!body) return;
    body.innerHTML = "";

    Object.entries(PERSONAL_ROOMS).forEach(([id, char]) => {
        const roomId = parseInt(id);
        const c = CHARACTERS[char];
        const entry = gameState.weeklyBonusLog && gameState.weeklyBonusLog[roomId];
        const earned = entry && entry.week === currentWeek;
        const claimed = earned && entry.prize;
        const avg = getWeekAvg(roomId);

        const card = document.createElement("div");
        card.className = `rounded-2xl border p-4 ${earned ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`;

        let inner = `
            <div class="flex items-center gap-3 mb-3">
                <span class="text-3xl">${c.emoji}</span>
                <div>
                    <div class="font-extrabold text-sm text-slate-800">${c.name}</div>
                    <div class="text-[10px] text-slate-400">${avg !== null ? `ממוצע שבועי: ${avg}%` : 'אין עדיין מספיק נתונים'}</div>
                </div>
                <div class="mr-auto text-right">
                    ${earned ? '<span class="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">🌟 זכאי/ת לפרס!</span>' : '<span class="text-xs text-slate-400">לא הגיע/ה ל-70%</span>'}
                </div>
            </div>`;

        if (earned && !claimed) {
            inner += `<div class="grid grid-cols-1 gap-2">`;
            (gameState.prizeOptions || []).forEach(p => {
                inner += `<button onclick="claimWeeklyPrize(${roomId}, '${p.id}')"
                    class="flex items-center gap-3 w-full text-right p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-all">
                    <span class="text-2xl">${p.emoji}</span>
                    <div><div class="text-xs font-bold text-slate-800">${p.label}</div><div class="text-[10px] text-slate-400">${p.desc}</div></div>
                </button>`;
            });
            inner += `</div>`;
        } else if (claimed) {
            const prize = (gameState.prizeOptions || []).find(p => p.id === entry.prize);
            inner += `<div class="flex items-center gap-3 bg-white rounded-xl p-3 border border-amber-200">
                <span class="text-2xl">${prize ? prize.emoji : '🎁'}</span>
                <div><div class="text-xs font-bold text-emerald-700">✅ נבחר: ${prize ? prize.label : 'פרס'}</div><div class="text-[10px] text-slate-400">${prize ? prize.desc : ''}</div></div>
            </div>`;
        } else {
            inner += `<div class="text-[10px] text-slate-400 text-center py-1">יש להגיע לממוצע שבועי של 70% ומעלה כדי לזכות בפרס 🏅</div>`;
        }

        card.innerHTML = inner;
        body.appendChild(card);
    });

    // עריכת מאגר פרסי שישי (מצב עריכה בלבד)
    if (editMode) {
        const editBox = document.createElement("div");
        editBox.className = "rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-4";
        let html = `<div class="text-xs font-bold text-amber-700 mb-2">⚙️ עריכת מאגר פרסי שישי</div><div class="space-y-2">`;
        (gameState.prizeOptions || []).forEach(p => {
            const locked = p.id === PROTECTED_PRIZE_ID;
            html += `<div class="flex items-center justify-between gap-2 bg-white rounded-xl p-2 border border-slate-200">
                <div class="flex items-center gap-2"><span class="text-lg">${p.emoji}</span><span class="text-[11px] font-bold text-slate-700">${p.label}</span></div>
                <div class="flex gap-1">
                    <button onclick="openPrizeEditor('prizeOptions','${p.id}')" class="w-6 h-6 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-600 text-[10px] flex items-center justify-center border border-amber-100">✏️</button>
                    ${locked ? '' : `<button onclick="deletePrize('prizeOptions','${p.id}')" class="w-6 h-6 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] flex items-center justify-center border border-rose-100">🗑️</button>`}
                </div>
            </div>`;
        });
        html += `</div><button onclick="openPrizeEditor('prizeOptions', null)" class="w-full mt-2 py-2 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 text-[11px] font-bold hover:bg-amber-50">➕ הוסף פרס שישי</button>`;
        editBox.innerHTML = html;
        body.appendChild(editBox);
    }
}

// ===== עריכת פרסים =====
let prizeEditTarget = null; // 'rewards100' | 'prizeOptions'

export function openPrizeEditor(target, prizeId) {
    prizeEditTarget = target;
    const list = gameState[target] || [];
    const prize = prizeId != null ? list.find(p => p.id === prizeId) : null;
    const isReward = target === 'rewards100';
    document.getElementById("prize-editor-title").innerText = prize
        ? "✏️ עריכת פרס"
        : (isReward ? "➕ פרס יעד 100% חדש" : "➕ פרס שישי חדש");
    document.getElementById("prize-edit-id").value = prize ? prize.id : "";
    // שדה אימוג'י רק לפרסי שישי
    document.getElementById("prize-emoji-wrap").style.display = isReward ? "none" : "block";
    document.getElementById("prize-edit-emoji").value = prize ? (prize.emoji || "") : "";
    document.getElementById("prize-title-label").innerText = isReward ? "כותרת הפרס (כולל אימוג'י)" : "שם הפרס";
    document.getElementById("prize-edit-title").value = prize ? (isReward ? prize.title : prize.label) : "";
    document.getElementById("prize-edit-desc").value = prize ? prize.desc : "";
    document.getElementById("prize-editor-modal").classList.remove("hidden");
}

export function closePrizeEditor() { document.getElementById("prize-editor-modal").classList.add("hidden"); }

export function savePrizeEditor() {
    const target = prizeEditTarget;
    if (!target) return;
    const isReward = target === 'rewards100';
    const idVal = document.getElementById("prize-edit-id").value;
    const titleVal = document.getElementById("prize-edit-title").value.trim();
    const descVal  = document.getElementById("prize-edit-desc").value.trim();
    const emojiVal = document.getElementById("prize-edit-emoji").value.trim() || "🎁";
    if (!titleVal) { showToast("⚠️ חסר שם", "יש להזין שם לפרס."); return; }
    if (!gameState[target]) gameState[target] = [];
    const list = gameState[target];

    if (idVal) {
        const p = list.find(x => x.id === idVal);
        if (p) {
            p.desc = descVal;
            if (isReward) p.title = titleVal;
            else { p.label = titleVal; p.emoji = emojiVal; }
        }
        showToast("✏️ הפרס עודכן", `"${titleVal}" נשמר.`);
    } else {
        const newId = "px_" + Date.now();
        if (isReward) list.push({ id: newId, title: titleVal, desc: descVal });
        else          list.push({ id: newId, emoji: emojiVal, label: titleVal, desc: descVal });
        showToast("➕ פרס נוסף", `"${titleVal}" נוסף לרשימה.`);
    }
    closePrizeEditor();
    saveGameState("עריכת פרסים");
    if (isReward) openRewardModal(100); else renderFridayReveal();
}

export function deletePrize(target, prizeId) {
    if (prizeId === PROTECTED_PRIZE_ID) { showToast("🔒 פרס מוגן", "לא ניתן למחוק את פרס העברת הנקודות."); return; }
    const list = gameState[target] || [];
    const p = list.find(x => x.id === prizeId);
    if (!p) return;
    if (!confirm(`למחוק את הפרס "${p.title || p.label}"?`)) return;
    gameState[target] = list.filter(x => x.id !== prizeId);
    showToast("🗑️ הפרס נמחק", `"${p.title || p.label}" הוסר.`);
    saveGameState("מחיקת פרס");
    if (target === 'rewards100') openRewardModal(100); else renderFridayReveal();
}

export function openRewardModal(target) {
    const modal = document.getElementById("reward-modal"); const list = document.getElementById("modal-rewards-list");
    list.innerHTML = ""; modal.classList.remove("hidden");
    (gameState.rewards100 || []).forEach(reward => {
        const item = document.createElement("div"); item.className = "p-3 border rounded-xl bg-white text-right flex items-center justify-between gap-2";
        const info = document.createElement("div");
        info.className = "flex-1 cursor-pointer";
        info.onclick = () => { gameState.selectedReward100 = reward.id; closeRewardModal(); saveGameState(`בחירת פרס: ${reward.title}`); };
        info.innerHTML = `<h4 class="text-xs font-bold">${reward.title}</h4><p class="text-[10px] text-slate-400">${reward.desc}</p>`;
        item.appendChild(info);
        if (editMode) {
            const ctr = document.createElement("div"); ctr.className = "flex flex-col gap-1";
            ctr.innerHTML = `
                <button onclick="openPrizeEditor('rewards100','${reward.id}')" class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs flex items-center justify-center border border-amber-100">✏️</button>
                <button onclick="deletePrize('rewards100','${reward.id}')" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs flex items-center justify-center border border-rose-100">🗑️</button>`;
            item.appendChild(ctr);
        } else {
            item.className += " hover:bg-slate-50 cursor-pointer";
        }
        list.appendChild(item);
    });
    if (editMode) {
        const addBtn = document.createElement("button");
        addBtn.onclick = () => openPrizeEditor('rewards100', null);
        addBtn.className = "w-full py-2.5 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 text-xs font-bold hover:bg-amber-50";
        addBtn.innerText = "➕ הוסף פרס יעד 100%";
        list.appendChild(addBtn);
    }
}
export function closeRewardModal() { document.getElementById("reward-modal").classList.add("hidden"); }
export function triggerResetConfirmation() { document.getElementById("confirm-modal").classList.remove("hidden"); }
export function closeConfirmModal() { document.getElementById("confirm-modal").classList.add("hidden"); }
export function confirmReset() { syncToGoogleDrive("איפוס שבוע לקראת שבוע חדש"); resetToInitial(); closeConfirmModal(); saveGameState("איפוס שבועי חדש"); }
