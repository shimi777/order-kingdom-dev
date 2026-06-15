// ===================================================================
// render.js — DOM rendering, view switching, toast, sparkles.
// ===================================================================

import { CHARACTERS, GRADIENT_FALLBACKS, DEFAULT_GRADIENT, STATIC_ROOM_IMAGES, EDITABLE_CHARS, config } from './constants.js';
import { gameState, saveGameState, getRoomFreshnessPct, isDaily } from './state.js';
import { editMode, openTaskEditor } from './tasks.js';
import { renderSchedule, renderMonth, scheduleSub } from './schedule.js';
import { updateFridayBadge } from './prizes.js';

export function renderAll() { renderHeroDashboards(); renderRooms(); renderTasks(); renderGoodDeeds(); updateProgressDOM(); updateFridayBadge(); }

export function renderHeroDashboards() {
    const container = document.getElementById("avatars-container");
    container.innerHTML = "";
    EDITABLE_CHARS.forEach(key => {
        const c = CHARACTERS[key];
        const isSelected = gameState.selectedCharacter === key;
        const card = document.createElement("div");
        card.className = `cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center justify-between ${isSelected ? `bg-gradient-to-br ${c.color} border-amber-300 scale-[1.02]` : "bg-white/70 border-slate-100"}`;
        card.onclick = () => { gameState.selectedCharacter = isSelected ? null : key; saveGameState("סינון גיבורים"); };
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="text-3xl">${c.emoji}</div>
                <div><div class="font-extrabold text-sm text-slate-800">${c.name}</div><div class="text-[10px] text-slate-400">${c.role}</div></div>
            </div>
            <div class="bg-white/90 px-3 py-1 rounded-xl text-left border"><span class="block text-[8px] text-slate-400 font-bold">נקודות אישיות</span><span class="text-xs font-black text-indigo-600">${gameState.personalScores[key] || 0} ✨</span></div>
        `;
        container.appendChild(card);
    });
    document.getElementById("clear-filter-btn").className = gameState.selectedCharacter ? "w-full mt-4 py-2 bg-slate-100 text-xs font-bold rounded-xl block" : "hidden";
}

export function getCleanlinessStatus(pct) {
    if (pct >= 90) return "✨ מבריק!";
    if (pct >= 65) return "👑 נקי";
    if (pct >= 35) return "🧹 בטיפול";
    if (pct >  0)  return "🥀 זקוק לטיפוח";
    return "🥀 מחכה לקסם";
}

export function renderRooms() {
    const container = document.getElementById("rooms-map-grid");
    if (!container) return; container.innerHTML = "";
    gameState.rooms.forEach(room => {
        const isActive = gameState.selectedRoomId === room.id;
        const pct = getRoomFreshnessPct(room);
        const card = document.createElement("div");
        card.className = "room-medallion group cursor-pointer flex flex-col items-center transition-all";
        card.onclick = () => { gameState.selectedRoomId = room.id; saveGameState(`מעבר לחדר ${room.name}`); };
        card.innerHTML = `
            <div class="room-image-container relative w-full aspect-square rounded-3xl overflow-hidden border-2 ${isActive ? 'border-amber-400 ring-4 ring-amber-200/50' : 'border-slate-200/40 bg-white'}">
                <img id="room-img-${room.id}" class="w-full h-full object-cover" src="${STATIC_ROOM_IMAGES[room.id] || ''}" style="background: ${GRADIENT_FALLBACKS[room.id] || DEFAULT_GRADIENT}" onerror="this.style.opacity='0.3'">
                <div class="absolute bottom-1 left-1.5 pointer-events-none">
                    <span class="text-[10px] font-semibold text-white leading-tight" style="text-shadow:0 1px 4px rgba(0,0,0,0.9)">${room.icon} ${getCleanlinessStatus(pct)}</span>
                </div>
                <div class="absolute bottom-1 right-1.5 pointer-events-none">
                    <span class="text-lg font-black text-white" style="text-shadow:0 2px 6px rgba(0,0,0,0.9)">${pct}%</span>
                </div>
            </div>
            <div class="mt-1 text-xs font-bold text-slate-800 text-center">${room.name.split(' ').slice(1).join(' ')}</div>
        `;
        container.appendChild(card);
    });
}

export function renderTasks() {
    const listContainer = document.getElementById("tasks-list");
    listContainer.innerHTML = "";
    const activeRoom = gameState.rooms.find(r => r.id === gameState.selectedRoomId);
    if (!activeRoom) return;

    document.getElementById("active-room-title").innerText = activeRoom.name;
    document.getElementById("active-room-subtitle").innerText = activeRoom.subtitle;
    document.getElementById("active-room-rules").innerText = activeRoom.specialRules;

    // משימות מוסתרות מוצגות רק במצב עריכה
    let tasksToRender = activeRoom.tasks.filter(t => editMode || !t.hidden);
    if (gameState.selectedCharacter) tasksToRender = tasksToRender.filter(t => t.char === gameState.selectedCharacter || t.char === "כולם");

    tasksToRender.forEach(task => {
        const ch = CHARACTERS[task.char];
        const avatar = ch ? ch.emoji : "🏰";
        const card = document.createElement("div");
        card.className = `flex items-center justify-between p-3 rounded-2xl border ${task.hidden ? 'bg-slate-100/70 opacity-60' : task.completed ? 'bg-emerald-50/40 text-slate-400': 'bg-white'}`;
        const daily = isDaily(task);
        const editControls = editMode ? `
            <div class="flex flex-col gap-1">
                <button onclick="openTaskEditor(${task.id})" class="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs flex items-center justify-center border border-amber-100" title="עריכה">✏️</button>
                <button onclick="toggleHideTask(${task.id})" class="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs flex items-center justify-center border border-slate-200" title="${task.hidden ? 'הצג' : 'הסתר'}">${task.hidden ? '👁️' : '🙈'}</button>
                <button onclick="deleteTask(${task.id})" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs flex items-center justify-center border border-rose-100" title="מחיקה">🗑️</button>
            </div>` : "";
        card.innerHTML = `
            <div class="flex items-center gap-2.5">
                <button onclick="toggleTask(${task.id}, event)" class="w-5 h-5 shrink-0 rounded border flex items-center justify-center ${task.completed ? 'bg-emerald-500 text-white border-emerald-500':'bg-white border-slate-300'}">${task.completed ? '✓':''}</button>
                <div class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-lg ${ch ? 'bg-gradient-to-br '+ch.color : 'bg-slate-100'} border border-white shadow-sm" title="${ch ? ch.name : task.char}">${avatar}</div>
                <div><h4 class="font-bold text-xs ${task.completed ? 'line-through':''}">${task.title} ${task.hidden ? '<span class="text-[8px] text-slate-400">(מוסתרת)</span>' : ''}</h4><p class="text-[10px] text-slate-400">${task.desc}</p><p class="text-[9px] text-slate-300 mt-0.5">${ch ? ch.name : task.char}</p></div>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex flex-col items-end gap-1">
                    <span class="text-[9px] px-2 py-0.5 rounded font-bold border ${task.isFamily ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}">${task.isFamily ? '🏡 משפחתי' : '👤 אישי'} +${task.points}</span>
                    <span class="text-[9px] px-1.5 py-0.5 rounded font-semibold ${daily ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}">${daily ? '☀️ יומי' : '📅 שבועי'}</span>
                </div>
                ${editControls}
            </div>
        `;
        listContainer.appendChild(card);
    });
    if (editMode) {
        const addBtn = document.createElement("button");
        addBtn.onclick = () => openTaskEditor(null);
        addBtn.className = "w-full py-3 rounded-2xl border-2 border-dashed border-amber-300 text-amber-600 text-xs font-bold hover:bg-amber-50 transition-all";
        addBtn.innerText = "➕ הוסף משימה חדשה לחדר זה";
        listContainer.appendChild(addBtn);
    }
    const visible = activeRoom.tasks.filter(t => !t.hidden);
    document.getElementById("room-completed-count").innerText = `📌 הושלמו: ${visible.filter(t => t.completed).length}/${visible.length} משימות`;
}

export function updateEditButtons() {
    const btn = document.getElementById("global-edit-btn");
    const pwBtn = document.getElementById("global-edit-pw-btn");
    if (!btn) return;
    if (editMode) {
        btn.className = "py-1.5 px-3 bg-amber-500 text-white border border-amber-500 rounded-xl text-xs font-bold shadow-sm";
        btn.innerText = "✅ סיום עריכה";
        if (pwBtn) pwBtn.classList.remove("hidden");
        const cb = document.getElementById("global-edit-chars-btn"); if (cb) cb.classList.remove("hidden");
    } else {
        btn.className = "py-1.5 px-3 bg-white/80 hover:bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold shadow-sm";
        btn.innerText = "✏️ מצב עריכה (הורים)";
        if (pwBtn) pwBtn.classList.add("hidden");
        const cb = document.getElementById("global-edit-chars-btn"); if (cb) cb.classList.add("hidden");
    }
}

export function renderGoodDeeds() {
    const feed = document.getElementById("deeds-feed"); feed.innerHTML = "";
    if (gameState.goodDeeds.length === 0) { feed.innerHTML = `<p class="text-center text-slate-400 text-[11px]">אין מעשי חסד רשומים.</p>`; return; }
    [...gameState.goodDeeds].reverse().forEach(d => {
        const editControls = editMode ? `
            <button onclick="openGoodDeedEditor(${d.id})" class="w-6 h-6 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-600 text-[11px] flex items-center justify-center border border-amber-100" title="עריכה">✏️</button>
            <button onclick="deleteGoodDeed(${d.id})" class="w-6 h-6 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] flex items-center justify-center border border-rose-100" title="מחיקה">🗑️</button>` : "";
        feed.innerHTML += `<div class="p-2 bg-white rounded-xl border flex justify-between items-center gap-2"><span class="min-w-0 truncate">✨ ${d.doer}: ${d.desc}</span><span class="flex items-center gap-1.5 shrink-0"><span class="text-rose-500 font-bold">+${d.points} 🏡</span>${editControls}</span></div>`;
    });
}

export function updateProgressDOM() {
    const finalPct = Math.min(Math.round((gameState.score / gameState.maxScore) * 100), 100);
    if (document.getElementById("family-progress-bar")) document.getElementById("family-progress-bar").style.width = `${finalPct}%`;
    document.getElementById("score-text").innerText = gameState.score;
    const maxEl = document.getElementById("max-score-text");
    if (maxEl) maxEl.innerText = gameState.maxScore;
    document.getElementById("percentage-text").innerText = `${finalPct}%`;
    if (gameState.selectedReward100) {
        const found = (gameState.rewards100 || []).find(r => r.id === gameState.selectedReward100);
        document.getElementById("active-reward-display").innerText = found ? found.title : "טרם נבחר פרס לשבוע זה!";
    }
    if (config.scriptUrl) {
        document.getElementById("sync-status-badge").className = "text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold";
        document.getElementById("sync-status-badge").innerText = "מחובר ומסונכרן";
    }
}

export function createSparkles(x, y) {
    for (let i = 0; i < 15; i++) {
        const s = document.createElement('div'); s.className = 'sparkle text-xs'; s.innerText = '✨'; s.style.left = `${x}px`; s.style.top = `${y}px`;
        s.style.setProperty('--x', `${(Math.random() - 0.5) * 100}px`); s.style.setProperty('--y', `${(Math.random() - 0.5) * 100}px`); s.style.setProperty('--r', `${Math.random() * 360}deg`);
        document.body.appendChild(s); setTimeout(() => s.remove(), 1200);
    }
}

// ===== מעבר בין מסכים =====
export function switchView(name) {
    const chores = document.getElementById("view-chores");
    const sched  = document.getElementById("view-schedule");
    const tabC = document.getElementById("tab-chores");
    const tabS = document.getElementById("tab-schedule");
    const activeCls = "py-2 px-5 bg-amber-500 text-white border border-amber-500 rounded-2xl text-sm font-bold shadow-sm transition-all";
    const idleCls   = "py-2 px-5 bg-white/80 hover:bg-white text-slate-600 border border-slate-200 rounded-2xl text-sm font-bold shadow-sm transition-all";
    if (name === 'schedule') {
        chores.classList.add("hidden");
        sched.classList.remove("hidden");
        tabS.className = activeCls; tabC.className = idleCls;
        renderSchedule();
        if (scheduleSub === 'monthly') renderMonth();
    } else {
        sched.classList.add("hidden");
        chores.classList.remove("hidden");
        tabC.className = activeCls; tabS.className = idleCls;
    }
}

export async function fetchRoomImage(roomId, prompt) {
    const imgElement = document.getElementById(`room-img-${roomId}`);
    const spinner = document.getElementById(`room-spinner-${roomId}`);

    if (!config.geminiKey) {
        if (spinner) spinner.innerHTML = `<span class="text-[9px] text-center text-amber-700 px-2">חסר מפתח API ⚙️</span>`;
        return;
    }

    if (spinner) spinner.innerHTML = `<div class="w-4 h-4 border-2 border-amber-500 rounded-full animate-spin"></div>`;
    if (spinner) spinner.classList.remove("hidden");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${config.geminiKey}`;
    const payload = { instances: [{ prompt: prompt }], parameters: { sampleCount: 1 } };

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        const base64Data = result.predictions?.[0]?.bytesBase64Encoded;
        if (base64Data && imgElement && spinner) {
            const imageUrl = `data:image/png;base64,${base64Data}`;
            imgElement.src = imageUrl;
            imgElement.classList.remove("opacity-40");
            spinner.classList.add("hidden");
            localStorage.setItem(`room_img_cache_v3_${roomId}`, imageUrl);
        } else {
            const errMsg = result.error?.message || "שגיאה לא ידועה";
            if (spinner) spinner.innerHTML = `<span class="text-[9px] text-center text-rose-600 px-2">❌ ${errMsg}</span>`;
            console.error("Imagen error:", result);
        }
    } catch (e) {
        if (spinner) spinner.innerHTML = `<span class="text-[9px] text-center text-rose-600 px-2">❌ שגיאת רשת</span>`;
        console.error("fetchRoomImage error:", e);
    }
}

export function regenerateAllImages() {
    renderRooms();
}

export function showToast(title, message) {
    const toast = document.getElementById("custom-toast"); document.getElementById("toast-title").innerText = title; document.getElementById("toast-message").innerText = message;
    toast.classList.remove("opacity-0", "translate-y-20", "pointer-events-none"); setTimeout(() => toast.classList.add("opacity-0", "translate-y-20", "pointer-events-none"), 3500);
}
