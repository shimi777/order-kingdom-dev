# ממלכת הסדר 🏰 — משחק משימות משפחתי

אפליקציית ווב קלת-משקל שהופכת משימות בית למשחק: כל בן משפחה צובר נקודות
על חדרים ומשימות, יש לוח ניקוד אישי ומשפחתי, פרסים שבועיים, לו״ז משפחתי,
ורשימת קניות. הכל רץ בדפדפן, ללא שרת ולא בנייה (build) — רק HTML + מודולי
JavaScript טהורים.

זוהי **גרסה כללית (template)**: כל הנתונים שמתאימים למשפחה ספציפית מרוכזים
בקובץ אחד, כך שכל משפחה יכולה לאמץ אותה תוך דקות.

---

## ⚙️ התאמה אישית — קובץ אחד

כל מה שצריך לשנות נמצא ב-[`src/config.js`](src/config.js) בלבד:

| מה | איפה ב-`config.js` |
|----|---------------------|
| שם האפליקציה, סמל, שם המשפחה | `APP_TITLE`, `APP_EMOJI`, `APP_TAGLINE`, `APP_FAMILY_LINE` |
| הדמויות (שמות, אימוג'י, צבעים) | `CHARACTERS`, `EDITABLE_CHARS` |
| החדרים והמשימות | `INITIAL_STATE.rooms` |
| פרסי 100 נקודות | `DEFAULT_REWARDS_100` |
| פרסי הזוכה השבועי | `DEFAULT_PRIZE_OPTIONS` |
| אפשרויות ארוחת ערב | `DEFAULT_DINNER_OPTIONS` |
| חדרים אישיים לבונוס שבועי | `PERSONAL_ROOMS`, `WEEKLY_BONUS_PTS` |
| תמונות החדרים | `IMAGE_BASE_URL`, `STATIC_ROOM_IMAGES` |

שמרו את הקובץ, רעננו את הדף — אין שלב בנייה. שאר הקבצים ב-`src/` הם לוגיקה
כללית שלא צריך לגעת בה.

> **תמונות חדרים:** אם לא מגדירים תמונות, האפליקציה נופלת בחן לרקע גרדיאנט
> צבעוני לכל חדר. כדי להוסיף תמונות — הצביעו את `IMAGE_BASE_URL` לאחסון שלכם
> (למשל GitHub Pages) עם קבצים בשם `room_1.jpg`, `room_2.jpg` וכו'.

---

## ▶️ הרצה מקומית

האפליקציה משתמשת ב-ES Modules, שלא נטענים מ-`file://`. צריך לשרת דרך http:

```bash
py -m http.server 8000
# ואז לפתוח בדפדפן:
#   http://localhost:8000/
```

(כל שרת סטטי מתאים — `python -m http.server`, `npx serve`, וכו'.)

---

## 🚀 פריסה (GitHub Pages)

1. דחפו את התוכן לרפו GitHub.
2. Settings → Pages → Branch: `master` (או `main`), תיקייה `/ (root)`.
3. האפליקציה תהיה זמינה ב-`https://<user>.github.io/<repo>/`.

---

## ☁️ סנכרון יומן/דרייב (אופציונלי)

האפליקציה יכולה לכתוב את הניקוד לקובץ CSV ב-Google Drive ולסנכרן את הלו״ז
ליומן Google. זה אופציונלי לחלוטין — בלי הגדרה, האפליקציה עובדת מקומית מול
`localStorage`.

להפעלה: פרסו את [`google_apps_script_calendar.gs`](google_apps_script_calendar.gs)
כ-Google Apps Script Web App, והזינו את קישור ה-Web App במסך הראשי של האפליקציה.

---

## 🗂️ מבנה הקוד

```
index.html              — שלד ה-DOM + עיצוב (Tailwind via CDN)
src/
  config.js             — ⚙️ קובץ ההתאמה האישית היחיד (נתוני המשפחה)
  config-dom.js         — מיישם את config על הכותרת והרשימות הנפתחות
  constants.js          — קבועים מבניים + re-export מ-config.js
  state.js              — gameState, ניקוד, decay, שמירה ל-localStorage
  render.js             — רינדור DOM, מעבר מסכים, toast
  tasks.js              — לוגיקת משימות + עריכת דמויות (מוגן בסיסמת הורים)
  schedule.js           — לו״ז משפחתי, ארוחות, קניות
  prizes.js             — פרסים, הגרלת שישי, בונוס שבועי
  rooms.js              — חדרים, מסננים, מעשים טובים
  sync.js               — סנכרון Google Drive / Calendar
  util.js               — עזרי escape ועוד
  main.js               — נקודת הכניסה (init)
```

> **הערה למפתחים:** `saveGameState` כותב ל-localStorage *לפני*
> `calculateAllScores`, כך ששדה ה-`score` השמור מפגר בצעד אחד. זה לא מזיק כי
> `init()` מחשב ניקוד מחדש בטעינה. אל "תתקנו" בלי תשומת לב.
