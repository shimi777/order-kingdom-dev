// ===================================================================
// util.js — pure helpers. Zero imports.
// ===================================================================

// הימלטות תווים לפני הזרקה ל-innerHTML (תוכן textarea / תצוגת לוח)
export function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// מפתח תאריך YYYY-MM-DD (מקומי)
export function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
