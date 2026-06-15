// ===================================================================
// main.js — entry point.
// 1) imports every module (module top-levels are side-effect-free)
// 2) re-attaches to window every function referenced by an inline on*=
//    handler in index.html (and inside innerHTML template strings),
//    plus the shared window.charEditStaging object
// 3) runs init() = the old window.onload body + the 5-minute setInterval
// ===================================================================

import * as state from './state.js';
import * as render from './render.js';
import * as tasks from './tasks.js';
import * as schedule from './schedule.js';
import * as prizes from './prizes.js';
import * as sync from './sync.js';
import * as rooms from './rooms.js';
import { applyConfigToDom } from './config-dom.js';

// ---- Window exposure: every identifier reachable from an inline handler ----
Object.assign(window, {
    // tasks.js
    toggleGlobalEdit: tasks.toggleGlobalEdit,
    changeEditPassword: tasks.changeEditPassword,
    openCharacterEditor: tasks.openCharacterEditor,
    closeCharacterEditor: tasks.closeCharacterEditor,
    saveCharacterEditor: tasks.saveCharacterEditor,
    pickAvatar: tasks.pickAvatar,
    openTaskEditor: tasks.openTaskEditor,
    closeTaskEditor: tasks.closeTaskEditor,
    saveTaskEditor: tasks.saveTaskEditor,
    deleteTask: tasks.deleteTask,
    toggleHideTask: tasks.toggleHideTask,
    toggleTask: tasks.toggleTask,
    markAllRoomTasksCompleted: tasks.markAllRoomTasksCompleted,
    // render.js
    switchView: render.switchView,
    // rooms.js
    clearFilter: rooms.clearFilter,
    submitGoodDeed: rooms.submitGoodDeed,
    openGoodDeedEditor: rooms.openGoodDeedEditor,
    closeGoodDeedEditor: rooms.closeGoodDeedEditor,
    saveGoodDeedEditor: rooms.saveGoodDeedEditor,
    deleteGoodDeed: rooms.deleteGoodDeed,
    // state.js
    saveScriptUrl: state.saveScriptUrl,
    // sync.js
    syncToGoogleDrive: sync.syncToGoogleDrive,
    syncScheduleToCalendar: sync.syncScheduleToCalendar,
    fetchGcalEvents: sync.fetchGcalEvents,
    // prizes.js
    openRewardModal: prizes.openRewardModal,
    closeRewardModal: prizes.closeRewardModal,
    triggerResetConfirmation: prizes.triggerResetConfirmation,
    closeConfirmModal: prizes.closeConfirmModal,
    confirmReset: prizes.confirmReset,
    openFridayReveal: prizes.openFridayReveal,
    closeFridayReveal: prizes.closeFridayReveal,
    claimWeeklyPrize: prizes.claimWeeklyPrize,
    openPrizeEditor: prizes.openPrizeEditor,
    closePrizeEditor: prizes.closePrizeEditor,
    savePrizeEditor: prizes.savePrizeEditor,
    deletePrize: prizes.deletePrize,
    // schedule.js
    switchScheduleSub: schedule.switchScheduleSub,
    openDinnerEditor: schedule.openDinnerEditor,
    closeDinnerEditor: schedule.closeDinnerEditor,
    addDinnerOption: schedule.addDinnerOption,
    deleteDinnerOption: schedule.deleteDinnerOption,
    updateScheduleCell: schedule.updateScheduleCell,
    updateBreakfastCell: schedule.updateBreakfastCell,
    updateDinnerCell: schedule.updateDinnerCell,
    monthPrev: schedule.monthPrev,
    monthNext: schedule.monthNext,
    monthToday: schedule.monthToday,
    openDateEditor: schedule.openDateEditor,
    closeDateEditor: schedule.closeDateEditor,
    saveDateEditor: schedule.saveDateEditor,
    addShoppingItem: schedule.addShoppingItem,
    toggleShoppingItem: schedule.toggleShoppingItem,
    deleteShoppingItem: schedule.deleteShoppingItem,
    clearBoughtItems: schedule.clearBoughtItems,
});

// charEditStaging must exist on window before any character-editor render runs;
// it is reassigned by openCharacterEditor and mutated by an inline oninput handler.
window.charEditStaging = {};

// ---- init: faithful port of the original window.onload (+ setInterval) ----
function init() {
    applyConfigToDom();   // כותרת + רשימות נפתחות מתוך config.js
    state.loadGameState();
    tasks.applyCharacterOverrides();
    state.calculateAllScores();
    render.renderAll();
    render.updateEditButtons();
    // חודש נוכחי + רינדור ראשוני של הלו״ז (היה inline ב-window.onload)
    schedule.initSchedule();
    const _gcalName = localStorage.getItem("kingdom_gcal_name");
    if (_gcalName) document.getElementById("gcal-name-input").value = _gcalName;
    render.switchView('chores');
    // עדכון אחוזי טריות, דגימה, ובונוס שבועי — כל 5 דקות
    setInterval(() => { state.sampleRoomHistory(); state.decayTasks(); state.calculateAllScores(); render.renderAll(); }, 5 * 60 * 1000);
}

// Module scripts are deferred, so the DOM is parsed by the time this runs.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
