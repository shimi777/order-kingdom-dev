// ===================================================================
// rooms.js — room/character filtering + good deeds.
// ===================================================================

import { gameState, saveGameState } from './state.js';
import { showToast } from './render.js';

export function clearFilter() { gameState.selectedCharacter = null; saveGameState("ביטול סינון"); }

export function submitGoodDeed(e) {
    e.preventDefault(); const doer = document.getElementById("deed-doer").value; const desc = document.getElementById("deed-desc").value;
    if (!doer) return;
    gameState.goodDeeds.push({ id: Date.now(), doer: doer, desc: desc, points: 10 });
    document.getElementById("deed-desc").value = "";
    saveGameState(`מעשה חסד של ${doer}`);
}

// ===== עריכה/מחיקה של מעשי חסד (מצב עריכת הורים בלבד) =====
export function openGoodDeedEditor(id) {
    const deed = (gameState.goodDeeds || []).find(d => d.id === id);
    if (!deed) return;
    document.getElementById("deed-edit-id").value = deed.id;
    document.getElementById("deed-edit-doer").value = deed.doer;
    document.getElementById("deed-edit-desc").value = deed.desc;
    document.getElementById("deed-editor-modal").classList.remove("hidden");
}

export function closeGoodDeedEditor() { document.getElementById("deed-editor-modal").classList.add("hidden"); }

export function saveGoodDeedEditor() {
    const id = parseInt(document.getElementById("deed-edit-id").value);
    const deed = (gameState.goodDeeds || []).find(d => d.id === id);
    if (!deed) { closeGoodDeedEditor(); return; }
    const doer = document.getElementById("deed-edit-doer").value;
    const desc = document.getElementById("deed-edit-desc").value.trim();
    if (!desc) { showToast("⚠️ חסר תיאור", "יש לכתוב מה קרה לפני השמירה."); return; }
    deed.doer = doer;
    deed.desc = desc;
    closeGoodDeedEditor();
    saveGameState(`עריכת מעשה חסד של ${doer}`);
    showToast("✏️ מעשה החסד עודכן", `"${desc}" נשמר.`);
}

export function deleteGoodDeed(id) {
    const deed = (gameState.goodDeeds || []).find(d => d.id === id);
    if (!deed) return;
    if (!confirm(`למחוק את מעשה החסד "${deed.desc}"? פעולה זו תוריד ${deed.points} נקודות משפחתיות.`)) return;
    gameState.goodDeeds = gameState.goodDeeds.filter(d => d.id !== id);
    showToast("🗑️ מעשה החסד נמחק", `"${deed.desc}" הוסר וניקודו ירד.`);
    saveGameState("מחיקת מעשה חסד");
}
