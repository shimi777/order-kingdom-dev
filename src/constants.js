// ===================================================================
// constants.js — קבועים מבניים + אובייקט config לזמן-ריצה.
//
// ⚠️ נתונים שמתאימים אישית (שמות, חדרים, משימות, פרסים, תמונות) אינם
//    כאן — הם בקובץ ./config.js. קובץ זה מכיל רק קבועים מבניים שלא
//    משתנים ממשפחה למשפחה, וכן re-export של כל ההגדרות מ-config.js כדי
//    ששאר המודולים ימשיכו לייבא הכל מ-'./constants.js' ללא שינוי.
//
// Zero DOM, side-effect-free.
// ===================================================================

// ===== re-export של כל ההתאמות האישיות מ-config.js =====
// (כך ש-state.js / render.js / tasks.js וכו' לא צריכים לדעת על config.js)
export {
    APP_TITLE, APP_EMOJI, APP_TAGLINE, APP_FAMILY_LINE,
    CHARACTERS, EDITABLE_CHARS,
    INITIAL_STATE, DEFAULT_REWARDS_100,
    DEFAULT_PRIZE_OPTIONS, DEFAULT_DINNER_OPTIONS,
    PERSONAL_ROOMS, WEEKLY_BONUS_PTS, DAILY_TASK_IDS,
    IMAGE_BASE_URL, STATIC_ROOM_IMAGES,
} from './config.js';

// ===== קבועי זמן =====
export const DAY_MS  = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

// ===== רקעי גרדיאנט לחדרים (גיבוי כשאין תמונה) =====
// ממופה לפי room.id. חדר ללא ערך כאן ייפול ל-DEFAULT_GRADIENT.
export const DEFAULT_GRADIENT = "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)";
export const GRADIENT_FALLBACKS = { 1: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", 2: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)", 3: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", 4: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)", 5: "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)", 6: "linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)", 7: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)" };

// ===== מצב עריכה גלובלי (מוגן בסיסמת הורים) =====
export const EDIT_PW_KEY = "kingdom_edit_password";

// הפרס "points" מיוחד — מעביר נקודות לשבוע הבא; לא ניתן למחיקה כדי לשמור על המנגנון
export const PROTECTED_PRIZE_ID = "points";

// ===== עריכת דמויות (אווטאר) — מאגר אימוג'י לבחירה =====
export const AVATAR_CHOICES = ["👑","🛡️","🪄","🧚","🦸","🦸‍♀️","🧜‍♀️","🦄","🐉","🦁","🐯","🐼","🦊","🐱","🐶","🐰","🌟","⚡","🌈","🚀","🦖","🦋","🐢","🦉","🍭","🎨","⚽","🎮"];

// ===== לו״ז משפחתי — תוויות עבריות =====
export const DAY_NAMES  = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const HEB_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

// ===== הגדרות ריצה משותפות (scriptUrl/geminiKey נכתבות בזמן-ריצה מה-UI) =====
// אובייקט משותף: כתיבה לשדה גלויה לכל המודולים המייבאים, ללא בעיית live-binding.
export const config = { scriptUrl: "", geminiKey: "" };
