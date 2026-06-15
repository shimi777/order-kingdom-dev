// ===================================================================
// state.js — owns gameState + persistence + scoring + lifecycle.
// gameState is reassigned ONLY here (loadGameState / resetToInitial);
// importers read the live binding and mutate properties only.
// ===================================================================

import {
    INITIAL_STATE, DEFAULT_REWARDS_100, DEFAULT_PRIZE_OPTIONS, DEFAULT_DINNER_OPTIONS,
    DAILY_TASK_IDS, DAY_MS, WEEK_MS, PERSONAL_ROOMS, EDITABLE_CHARS, config
} from './constants.js';
// Runtime-only cross-module calls (safe cycles): render + sync.
import { renderAll, updateProgressDOM, showToast } from './render.js';
import { syncToGoogleDrive } from './sync.js';

export let gameState = {};

// תדירות המשימה: מעדיף את שדה freq, ונופל חזרה לרשימה ההיסטורית למשימות ישנות
export function isDaily(task) {
    if (task.freq === 'daily')  return true;
    if (task.freq === 'weekly') return false;
    return DAILY_TASK_IDS.has(task.id);
}
// מזהה פנוי למשימה חדשה
export function nextTaskId() {
    let max = 0;
    gameState.rooms.forEach(r => r.tasks.forEach(t => { if (t.id > max) max = t.id; }));
    return max + 1;
}
// ניקוד מקסימלי = סכום כל המשימות המשפחתיות (מתעדכן אוטומטית בעריכה)
export function computeMaxScore() {
    let sum = 0;
    gameState.rooms.forEach(r => r.tasks.forEach(t => { if (t.isFamily && !t.hidden) sum += (t.points || 0); }));
    return sum || 1;
}

export function loadGameState() {
    const savedState = localStorage.getItem("kingdom_of_order_save_v4");
    const savedUrl = localStorage.getItem("kingdom_of_order_script_url");
    const savedKey = localStorage.getItem("kingdom_of_order_gemini_key");
    if (savedUrl) {
        config.scriptUrl = savedUrl;
        document.getElementById("script-url-input").value = savedUrl;
    }
    if (savedKey) {
        config.geminiKey = savedKey;
        document.getElementById("gemini-api-key-input").value = savedKey;
    }
    if (savedState) {
        try {
            gameState = JSON.parse(savedState);
            // מיזוג חדרים חדשים שנוספו מאז השמירה האחרונה
            const savedRoomIds = new Set(gameState.rooms.map(r => r.id));
            INITIAL_STATE.rooms.forEach(room => {
                if (!savedRoomIds.has(room.id)) gameState.rooms.push(JSON.parse(JSON.stringify(room)));
            });
            // הוספת שדות חסרים למשימות קיימות (תאימות לאחור)
            gameState.rooms.forEach(r => r.tasks.forEach(t => {
                if (t.completedAt === undefined) t.completedAt = null;
            }));
            if (!gameState.roomHistory)    gameState.roomHistory    = {};
            if (!gameState.weeklyBonusLog) gameState.weeklyBonusLog = {};
            if (!gameState.carryOverBonus) gameState.carryOverBonus = {};
            ensureGameDefaults();
            // migrate old weeklyBonusLog format (number → object)
            Object.keys(gameState.weeklyBonusLog).forEach(k => {
                if (typeof gameState.weeklyBonusLog[k] === 'number')
                    gameState.weeklyBonusLog[k] = { week: gameState.weeklyBonusLog[k], avg: null, prize: null };
            });
            // עדכון maxScore אם השתנה
            gameState.maxScore = INITIAL_STATE.maxScore;
            // איפוס משימות שפג תוקפן
            decayTasks();
            sampleRoomHistory();
        } catch(e) { resetToInitial(); }
    } else { resetToInitial(); }
}

export function ensureGameDefaults() {
    if (!gameState.rewards100)   gameState.rewards100   = JSON.parse(JSON.stringify(DEFAULT_REWARDS_100));
    if (!gameState.prizeOptions) gameState.prizeOptions = JSON.parse(JSON.stringify(DEFAULT_PRIZE_OPTIONS));
    // ===== לו״ז שבועי =====
    if (!gameState.weeklySchedule) gameState.weeklySchedule = {};
    const ws = gameState.weeklySchedule;
    if (!ws.activities) ws.activities = {};
    for (let d = 0; d < 7; d++) {
        if (!ws.activities[d]) ws.activities[d] = {};
        EDITABLE_CHARS.forEach(k => {
            if (ws.activities[d][k] === undefined) ws.activities[d][k] = "";
        });
    }
    if (!ws.dinners) ws.dinners = {};
    for (let d = 0; d < 7; d++) { if (ws.dinners[d] === undefined) ws.dinners[d] = ""; }
    if (!ws.breakfasts) ws.breakfasts = {};
    if (ws.breakfasts[6] === undefined) ws.breakfasts[6] = ""; // ארוחת בוקר — שבת בלבד
    // ===== רשימת קניות ואירועים חודשיים =====
    if (!gameState.shoppingList) gameState.shoppingList = [];
    if (!gameState.datedEvents)  gameState.datedEvents  = {};
    // ===== תפריט ארוחות ערב =====
    if (!gameState.dinnerOptions) gameState.dinnerOptions = DEFAULT_DINNER_OPTIONS.slice();
}

// איפוס שבועי — שומר על המשימות והפרסים שההורים הגדירו, מאפס רק השלמות וניקוד
export function resetToInitial() {
    const keepRooms     = gameState.rooms;
    const keepRewards   = gameState.rewards100;
    const keepPrizes    = gameState.prizeOptions;
    const keepSchedule  = gameState.weeklySchedule;   // הלו״ז השבועי שורד איפוס
    const keepShopping  = gameState.shoppingList;     // רשימת הקניות שורדת איפוס
    const keepEvents    = gameState.datedEvents;      // אירועי הלוח החודשי שורדים איפוס
    const keepDinnerOpts = gameState.dinnerOptions;   // תפריט ארוחות הערב שורד איפוס
    const keepOverrides = gameState.characterOverrides; // אווטארים/שמות שורדים איפוס
    gameState = JSON.parse(JSON.stringify(INITIAL_STATE));
    if (keepRooms) {
        gameState.rooms = keepRooms;
        gameState.rooms.forEach(r => r.tasks.forEach(t => { t.completed = false; t.completedAt = null; }));
    }
    if (keepRewards)   gameState.rewards100        = keepRewards;
    if (keepPrizes)    gameState.prizeOptions      = keepPrizes;
    if (keepSchedule)  gameState.weeklySchedule    = keepSchedule;
    if (keepShopping)  gameState.shoppingList      = keepShopping;
    if (keepEvents)    gameState.datedEvents       = keepEvents;
    if (keepDinnerOpts) gameState.dinnerOptions    = keepDinnerOpts;
    if (keepOverrides) gameState.characterOverrides = keepOverrides;
    ensureGameDefaults();
}

export function sampleRoomHistory() {
    const now = Date.now();
    if (!gameState.roomHistory)    gameState.roomHistory    = {};
    if (!gameState.weeklyBonusLog) gameState.weeklyBonusLog = {};
    Object.keys(PERSONAL_ROOMS).forEach(id => {
        const roomId = parseInt(id);
        const room = gameState.rooms.find(r => r.id === roomId);
        if (!room) return;
        if (!gameState.roomHistory[roomId]) gameState.roomHistory[roomId] = [];
        const history = gameState.roomHistory[roomId];
        const last = history[history.length - 1];
        if (last && now - last.t < 60 * 60 * 1000) return; // max once/hour
        history.push({ t: now, pct: getRoomFreshnessPct(room) });
        // שמור רק 7 ימים אחורה
        gameState.roomHistory[roomId] = history.filter(s => s.t > now - WEEK_MS);
    });
}

export function getWeekAvg(roomId) {
    const history = gameState.roomHistory && gameState.roomHistory[roomId];
    if (!history || history.length < 3) return null;
    const recent = history.filter(s => s.t > Date.now() - WEEK_MS);
    if (recent.length < 3) return null;
    return Math.round(recent.reduce((sum, s) => sum + s.pct, 0) / recent.length);
}

export function decayTasks() {
    const now = Date.now();
    let changed = false;
    gameState.rooms.forEach(r => {
        r.tasks.forEach(t => {
            if (!t.completedAt) t.completedAt = null; // ensure field exists
            if (t.completed && t.completedAt) {
                const limit = isDaily(t) ? DAY_MS : WEEK_MS;
                if (now - t.completedAt > limit) {
                    t.completed = false;
                    t.completedAt = null;
                    changed = true;
                }
            }
        });
    });
    return changed;
}

export function saveGameState(actionName = "עדכון כללי") {
    sampleRoomHistory();
    localStorage.setItem("kingdom_of_order_save_v4", JSON.stringify(gameState));
    calculateAllScores();
    renderAll();
    syncToGoogleDrive(actionName, true);
}

export function saveScriptUrl() {
    const url = document.getElementById("script-url-input").value.trim();
    const key = document.getElementById("gemini-api-key-input").value.trim();
    config.scriptUrl = url;
    config.geminiKey = key;
    localStorage.setItem("kingdom_of_order_script_url", url);
    localStorage.setItem("kingdom_of_order_gemini_key", key);
    updateProgressDOM();
    showToast("🔒 ההגדרות נשמרו", "כתובת ה-API ומפתח Gemini עודכנו בהצלחה!");
}

export function calculateAllScores() {
    Object.keys(gameState.personalScores).forEach(k => gameState.personalScores[k] = 0);
    let familyScore = 0;

    gameState.rooms.forEach(room => {
        room.tasks.forEach(task => {
            if (task.completed && !task.hidden) {
                if (task.isFamily) familyScore += task.points;
                else if (gameState.personalScores[task.char] !== undefined) gameState.personalScores[task.char] += task.points;
            }
        });
    });
    gameState.goodDeeds.forEach(deed => familyScore += deed.points);
    gameState.score = familyScore;
    gameState.maxScore = computeMaxScore();

    // הוספת נקודות carry-over שנבחרו בחשיפת שישי
    if (gameState.carryOverBonus) {
        Object.entries(gameState.carryOverBonus).forEach(([char, pts]) => {
            if (gameState.personalScores[char] !== undefined) gameState.personalScores[char] += pts;
        });
    }

    // רישום זכאות לבונוס שישי (ללא נקודות אוטומטיות — הזוכה בוחר בשישי)
    const currentWeek = Math.floor(Date.now() / WEEK_MS);
    if (!gameState.weeklyBonusLog) gameState.weeklyBonusLog = {};
    Object.entries(PERSONAL_ROOMS).forEach(([id]) => {
        const roomId = parseInt(id);
        const entry = gameState.weeklyBonusLog[roomId];
        const entryWeek = entry && (typeof entry === 'number' ? entry : entry.week);
        if (entryWeek === currentWeek) return; // already logged this week
        const avg = getWeekAvg(roomId);
        if (avg !== null && avg >= 70) {
            gameState.weeklyBonusLog[roomId] = { week: currentWeek, avg, prize: null };
        }
    });
}

export function getRoomFreshnessPct(room) {
    if (!room.tasks || room.tasks.length === 0) return 0;
    const now = Date.now();
    let totalW = 0, freshW = 0;
    room.tasks.filter(t => !t.hidden).forEach(t => {
        const period = isDaily(t) ? DAY_MS : WEEK_MS;
        let f = 0;
        if (t.completed) {
            f = t.completedAt ? Math.max(0, 1 - (now - t.completedAt) / period) : 1;
        }
        freshW += f * t.points;
        totalW += t.points;
    });
    return totalW > 0 ? Math.round(freshW / totalW * 100) : 0;
}

// שמירה קלה ללא רינדור/סנכרון — שומרת על פוקוס/סמן בזמן הקלדה
export function persistGame() {
    localStorage.setItem("kingdom_of_order_save_v4", JSON.stringify(gameState));
}
let _persistTimer = null;
export function persistGameDebounced() {
    clearTimeout(_persistTimer);
    _persistTimer = setTimeout(persistGame, 600);
}
