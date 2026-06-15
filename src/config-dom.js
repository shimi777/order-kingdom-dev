// ===================================================================
// config-dom.js — מיישם את ערכי config.js על ה-HTML הסטטי בעת העלייה:
//   כותרת הדפדפן, טקסטים בכותרת העליונה, והרשימות הנפתחות של הדמויות.
// כך שעריכת config.js בלבד מעדכנת את כל מה שנראה למשתמש.
// ===================================================================

import { APP_TITLE, APP_EMOJI, APP_TAGLINE, APP_FAMILY_LINE, CHARACTERS, EDITABLE_CHARS } from './constants.js';

export function applyConfigToDom() {
    // כותרת הדפדפן
    document.title = `${APP_TITLE} - משחק משימות משפחתי`;

    // כותרת עליונה
    setText("app-emoji", APP_EMOJI);
    setText("app-title", APP_TITLE);
    setText("app-tagline", APP_TAGLINE);
    setText("app-family-line", APP_FAMILY_LINE);
    setText("tab-chores", `${APP_EMOJI} ${APP_TITLE}`);

    // רשימות נפתחות של דמויות (נבנות מ-CHARACTERS כדי להישאר כלליות)
    fillCharSelect("deed-doer",      { placeholder: "מי עשה את החסד?" });
    fillCharSelect("deed-edit-doer", {});
    fillCharSelect("task-edit-char", { includeEveryone: true, withEmoji: true });
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function option(key, c, withEmoji) {
    const label = withEmoji && c.emoji ? `${c.emoji} ${c.name}` : c.name;
    return `<option value="${key}">${label}</option>`;
}

function fillCharSelect(id, { placeholder, includeEveryone, withEmoji } = {}) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const opts = [];
    if (placeholder) opts.push(`<option value="">${placeholder}</option>`);
    if (includeEveryone && CHARACTERS["כולם"]) opts.push(option("כולם", CHARACTERS["כולם"], withEmoji));
    EDITABLE_CHARS.forEach(key => {
        const c = CHARACTERS[key];
        if (c) opts.push(option(key, c, withEmoji));
    });
    sel.innerHTML = opts.join("");
}
