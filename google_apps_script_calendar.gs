/***********************************************************************
 * סנכרון לו״ז → יומן גוגל ("ממלכת הסדר 📅")
 * -------------------------------------------------------------------
 * הוסיפו את הקוד הזה ל-Apps Script הקיים שמסנכרן את הניקוד ל-CSV.
 *
 * שלב 1 — בתחילת doPost הקיים שלכם, הוסיפו את שתי השורות המסומנות:
 *
 *   function doPost(e) {
 *     var data = JSON.parse(e.postData.contents);
 *     if (data.type === 'calendar') return syncCalendar(data);   // <== הוסיפו
 *     // ... כאן נשאר כל הקוד הקיים שכותב שורת CSV ...
 *   }
 *
 *   (אם ה-doPost שלכם לא עושה JSON.parse — הוסיפו גם את שורת ה-var data.)
 *
 * שלב 2 — אם אין לכם doGet בכלל — הדביקו גם את doGet שבהמשך הקובץ.
 *         (אם כבר יש לכם doGet, הוסיפו בתחילתו:
 *            if (e.parameter.action === 'getEvents') return getEventsJsonp(e.parameter);)
 * שלב 3 — הדביקו את כל שאר הקוד שמתחת לכאן.
 * שלב 4 — Deploy → Manage deployments → עריכה → New version → Deploy.
 *         חשוב: "Who has access" = Anyone (כדי שהקריאה מהיומן תעבוד בלי התחברות).
 *         בפעם הראשונה גוגל יבקש הרשאה ליומן — אשרו.
 * שלב 5 — באפליקציה:
 *         • דחיפה ליומן: מסך "לו״ז" → "🔄 סנכרן ליומן גוגל".
 *         • קריאה מהיומן: מסך "לו״ז" → טאב "🌐 יומן גוגל" → שם היומן → רענן.
 *
 * הערות:
 * - דחיפה (אפליקציה→יומן) נכתבת ליומן ייעודי "ממלכת הסדר 📅".
 * - קריאה (יומן→אפליקציה) קוראת מ*כל* יומן לפי שם שתזינו באפליקציה.
 * - כל סנכרון-דחיפה מוחק את מה שהאפליקציה יצרה קודם ובונה מחדש (היומן ייעודי,
 *   אז זה בטוח — אל תוסיפו אירועים אישיים ליומן "ממלכת הסדר 📅" ידנית).
 * - אם הטקסט מתחיל בשעה (למשל "16:00") — נוצר אירוע בשעה הזו לשעה.
 *   אחרת — אירוע "כל היום".
 * - לו״ז שבועי נוצר כאירוע *חוזר* כל שבוע. אירוע חודשי = חד-פעמי בתאריך.
 ***********************************************************************/

var KINGDOM_CAL_NAME = 'ממלכת הסדר 📅';

// ====== קריאה מיומן גוגל → אפליקציה (JSONP) ======
// אם אין לכם doGet אחר — השאירו את הפונקציה הזו כמות שהיא.
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getEvents') {
    return getEventsJsonp(e.parameter);
  }
  return ContentService.createTextOutput('Kingdom of Order — OK');
}

function getEventsJsonp(p) {
  var callback = p.callback || 'callback';
  try {
    var calName = (p.cal || '').trim();
    var cals = calName
      ? CalendarApp.getCalendarsByName(calName)
      : [CalendarApp.getDefaultCalendar()];
    if (!cals.length) {
      return jsonp(callback, { ok: false, error: 'לא נמצא יומן בשם "' + calName + '"' });
    }
    var cal = cals[0];
    var tz = cal.getTimeZone();
    var from = p.from ? new Date(p.from) : new Date();
    var to = p.to ? new Date(p.to) : new Date(Date.now() + 120 * 86400000);

    var events = cal.getEvents(from, to).map(function (ev) {
      return {
        title: ev.getTitle(),
        dateStr: Utilities.formatDate(ev.getStartTime(), tz, 'yyyy-MM-dd'),
        timeStr: ev.isAllDayEvent() ? '' : Utilities.formatDate(ev.getStartTime(), tz, 'HH:mm'),
        allDay: ev.isAllDayEvent(),
        location: ev.getLocation(),
        desc: ev.getDescription()
      };
    });
    return jsonp(callback, { ok: true, cal: calName || cal.getName(), events: events });
  } catch (err) {
    return jsonp(callback, { ok: false, error: String(err) });
  }
}

function jsonp(callback, obj) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(obj) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function syncCalendar(data) {
  var cals = CalendarApp.getCalendarsByName(KINGDOM_CAL_NAME);
  var cal = cals.length ? cals[0] : CalendarApp.createCalendar(KINGDOM_CAL_NAME);

  clearKingdomEvents(cal);

  // ----- אירועים חד-פעמיים (התצוגה החודשית) -----
  var dated = data.datedEvents || {};
  Object.keys(dated).forEach(function (key) {
    var text = (dated[key] || '').trim();
    if (!text) return;
    var p = key.split('-');                 // YYYY-MM-DD
    var y = +p[0], mo = +p[1] - 1, da = +p[2];
    var lines = text.split('\n').filter(function (l) { return l.trim(); });
    var title = lines[0] || 'אירוע';
    var tm = title.match(/(\d{1,2}):(\d{2})/);
    if (tm) {
      var s = new Date(y, mo, da, +tm[1], +tm[2]);
      cal.createEvent(title, s, new Date(s.getTime() + 3600000), { description: text });
    } else {
      cal.createAllDayEvent(title, new Date(y, mo, da), { description: text });
    }
  });

  // ----- לו״ז שבועי חוזר -----
  (data.weekly || []).forEach(function (it) {
    var title = it.label + ': ' + it.text;
    var first = nextWeekday(it.day);        // התאריך הקרוב שנופל על אותו יום-בשבוע
    var rec = CalendarApp.newRecurrence().addWeeklyRule();
    var tm = ('' + it.text).match(/(\d{1,2}):(\d{2})/);
    if (tm) {
      var s = new Date(first.getFullYear(), first.getMonth(), first.getDate(), +tm[1], +tm[2]);
      cal.createEventSeries(title, s, new Date(s.getTime() + 3600000), rec);
    } else {
      cal.createAllDayEventSeries(title, first, rec);
    }
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// מוחק את כל מה שהאפליקציה יצרה קודם ביומן הייעודי
function clearKingdomEvents(cal) {
  var now = new Date();

  // סדרות שבועיות — סריקת שבועיים מספיקה כדי לפגוש כל יום בשבוע פעם אחת
  var seriesEnd = new Date(now.getTime() + 15 * 86400000);
  var seen = {};
  cal.getEvents(now, seriesEnd).forEach(function (ev) {
    if (ev.isRecurringEvent()) {
      var s = ev.getEventSeries(), id = s.getId();
      if (!seen[id]) { seen[id] = true; s.deleteEventSeries(); }
    }
  });

  // אירועים חד-פעמיים בטווח רחב (שבוע אחורה עד ~13 חודשים קדימה)
  var start = new Date(now.getTime() - 7 * 86400000);
  var end = new Date(now.getTime() + 400 * 86400000);
  cal.getEvents(start, end).forEach(function (ev) {
    if (!ev.isRecurringEvent()) ev.deleteEvent();
  });
}

function nextWeekday(dow) {                  // 0 = ראשון ... 6 = שבת
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return d;
}
