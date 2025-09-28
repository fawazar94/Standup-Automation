/***** CONFIG *****/
const USER_NAME       = 'Fawaz';
const WORK_HOURS_TEXT = '11 to 4';      // shown verbatim in the post
const TZ              = 'Europe/Berlin';
/******************/

const HEADERS = ['Date','Name','Hours Text','Day Total','Week Total','Yesterday','Today'];
const COL = {DATE:1, NAME:2, HOURS_TEXT:3, DAY_TOTAL:4, WEEK:5, YEST:6, TODAY:7};

/** ===== MENUS ===== **/
function Init() {
  const sh = getOrCreateMainSheet_();
  ensureHeaders_(sh);
  SpreadsheetApp.getActive().setSpreadsheetTimeZone(TZ);
  SpreadsheetApp.getUi().createMenu('Standup')
    .addItem('End of Day (One Click)', 'endOfDay')
    .addSeparator()
    .addItem('Backfill a Date', 'backfillDate')
    .addToUi();
}
function onOpen() { Init(); }

/** ===== ONE-CLICK END OF DAY (multiline dialog, Slack-ready copy) ===== **/
function endOfDay() {
  const sh = getOrCreateMainSheet_();
  ensureHeaders_(sh);

  const today = dateOnly_(new Date());
  const row = findOrCreateRowForDate_(sh, today);

  // Basics
  sh.getRange(row, COL.NAME).setValue(USER_NAME);
  sh.getRange(row, COL.HOURS_TEXT).setValue(WORK_HOURS_TEXT);

  // Yesterday by date
  const yTxt = getYesterdayText_(sh, today);
  if (yTxt) sh.getRange(row, COL.YEST).setValue(yTxt);

  // Prompt (semicolon-separated to avoid newline loss)
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    "Today’s tasks",
    "Enter tasks separated by semicolons ;  (include hours like (2) or (0.25))",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const tasks = (resp.getResponseText() || "").trim();
  sh.getRange(row, COL.TODAY).setValue(tasks);

  // Totals
  sh.getRange(row, COL.DAY_TOTAL).setValue(parseHoursFromTasks_(tasks));
  reComputeAllWeekTotals_(sh);

  // Build post (single cell with real newlines)
  const post = generatePostText_();
  const postSheet = getOrCreateSheet_('Post');
  postSheet.clear();
  postSheet.getRange(1,1).setValue(post);
  postSheet.getRange(1,1).setWrap(true);
  postSheet.setColumnWidths(1,1,800);

  ui.alert('Post ready on “Post” sheet. Copy A1 and paste in Slack.');
}
/** ===== SERVER HELPERS FOR DIALOG ===== **/
function getExistingTodayText_() {
  const sh = getOrCreateMainSheet_();
  const row = findOrCreateRowForDate_(sh, dateOnly_(new Date()));
  return (sh.getRange(row, COL.TODAY).getValue() || '').toString();
}

function saveTasksAndMakePost_(tasks) {
  const sh = getOrCreateMainSheet_();
  ensureHeaders_(sh);

  const today = dateOnly_(new Date());
  const row = findOrCreateRowForDate_(sh, today);

  // Fill basics
  sh.getRange(row, COL.NAME).setValue(USER_NAME);
  sh.getRange(row, COL.HOURS_TEXT).setValue(WORK_HOURS_TEXT);

  // Yesterday by closest previous DATE (safe with backfills)
  const yTxt = getYesterdayText_(sh, today);
  if (yTxt) sh.getRange(row, COL.YEST).setValue(yTxt);

  // Save today's tasks exactly as typed (keeps real newlines)
  const cleanTasks = (tasks || '').toString();
  sh.getRange(row, COL.TODAY).setValue(cleanTasks);

  // Day total & week totals
  const dayTotal = parseHoursFromTasks_(cleanTasks);
  sh.getRange(row, COL.DAY_TOTAL).setValue(dayTotal);
  reComputeAllWeekTotals_(sh);

  // Return Slack-ready post text for copy
  return generatePostText_();
}

function generatePostText_() {
  const sh = getOrCreateMainSheet_();
  const row = findOrCreateRowForDate_(sh, dateOnly_(new Date()));
  const vals = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];

  const d        = Utilities.formatDate(vals[COL.DATE-1], TZ, 'MMMM d, yyyy');
  const name     = vals[COL.NAME-1]       || USER_NAME;
  const hoursTxt = vals[COL.HOURS_TEXT-1] || WORK_HOURS_TEXT;
  const week     = vals[COL.WEEK-1]       || computeWeekTotalForRow_(sh, row);
  const yday     = (vals[COL.YEST-1]      || '').toString();
  const today    = (vals[COL.TODAY-1]     || '').toString();

  const postText =
    `${name}’s Daily Standup\n\n` +
    `Today’s Date: ${d}\n\n` +
    `TOTAL HOURS THIS WEEK: ${week}\n\n` +
    `My Hours Today: ${hoursTxt}\n\n` +
    `yesterday:\n${formatBlock_(yday)}\n\n` +
    `today:\n${formatBlock_(today)}`;

  // Also save to Post!A1 for reference
  const postSheet = getOrCreateSheet_('Post');
  postSheet.clear();
  postSheet.getRange(1,1).setValue(postText);
  postSheet.getRange(1,1).setWrap(true);
  postSheet.setColumnWidths(1,1,800);

  return postText;
}

/** ===== BACKFILL (counts in weeks; won’t hijack “yesterday”) ===== **/
function backfillDate() {
  const ui = SpreadsheetApp.getUi();
  const sh = getOrCreateMainSheet_();
  ensureHeaders_(sh);

  const dResp = ui.prompt('Backfill Date', 'Enter a past date as YYYY-MM-DD:', ui.ButtonSet.OK_CANCEL);
  if (dResp.getSelectedButton() !== ui.Button.OK) return;
  const dateStr = dResp.getResponseText().trim();
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) { ui.alert('Invalid date format. Use YYYY-MM-DD.'); return; }
  const date = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  const today = dateOnly_(new Date());
  if (date.getTime() >= today.getTime()) { ui.alert('Please choose a past date.'); return; }

  const tResp = ui.prompt('Tasks for '+dateStr, 'One task per line (or “;”). Include hours like (2), (0.25).', ui.ButtonSet.OK_CANCEL);
  if (tResp.getSelectedButton() !== ui.Button.OK) return;
  const tasks = tResp.getResponseText().trim();

  const row = findOrCreateRowForDate_(sh, date);
  sh.getRange(row, COL.NAME).setValue(USER_NAME);
  sh.getRange(row, COL.HOURS_TEXT).setValue(WORK_HOURS_TEXT);
  sh.getRange(row, COL.TODAY).setValue(tasks);

  const dayTotal = parseHoursFromTasks_(tasks);
  sh.getRange(row, COL.DAY_TOTAL).setValue(dayTotal);

  reComputeAllWeekTotals_(sh);
  ui.alert('Backfill saved and week totals updated.');
}

/** ===== HELPERS ===== **/
function getOrCreateMainSheet_() {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName('Standup') || ss.insertSheet('Standup');
}
function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function ensureHeaders_(sh) {
  const rng = sh.getRange(1,1,1,HEADERS.length);
  const first = rng.getValues()[0];
  const need = HEADERS.some((h,i)=> first[i] !== h);
  if (need) rng.setValues([HEADERS]);
  sh.setFrozenRows(1);
}
function dateOnly_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function findOrCreateRowForDate_(sh, date) {
  const last = sh.getLastRow();
  for (let r=2; r<=last; r++) {
    const val = sh.getRange(r, COL.DATE).getValue();
    if (val && dateOnly_(val).getTime() === date.getTime()) return r;
  }
  const newRow = last + 1;
  sh.getRange(newRow, COL.DATE).setValue(date);
  return newRow;
}
// "Yesterday" = closest previous calendar date (ignores when you edited/backfilled)
function getYesterdayText_(sh, forDate) {
  const last = sh.getLastRow();
  let bestDate = null;
  let bestText = '';
  for (let r=2; r<=last; r++) {
    const d = sh.getRange(r, COL.DATE).getValue();
    if (!d) continue;
    const dd = dateOnly_(d);
    if (dd.getTime() < dateOnly_(forDate).getTime()) {
      if (!bestDate || dd.getTime() > bestDate.getTime()) {
        bestDate = dd;
        bestText = (sh.getRange(r, COL.TODAY).getValue() || '').toString();
      }
    }
  }
  return bestText.trim();
}
// Turn multi-line/semicolon/bullet text into "- task" lines with real newlines
function formatBlock_(txt) {
  if (!txt) return '-';
  const parts = txt.replace(/\r\n?/g, '\n')
                   .split(/\n|;|•|\u2022/g)
                   .map(s => s.trim())
                   .filter(Boolean);
  if (!parts.length) return '-';
  return parts.map(l => (/^[-•\u2022]\s?/.test(l) ? l.replace(/^[-•\u2022]\s?/, '- ') : `- ${l}`))
              .join('\n');
}
// Sum "(#)" with dot or comma decimals: (2), (0.25), (0,25)
function parseHoursFromTasks_(text) {
  const matches = (text || '').match(/\((\d+(?:[.,]\d+)?)\)/g) || [];
  return matches.reduce((sum, m) => {
    const n = parseFloat(m.replace(/[()]/g,'').replace(',','.'));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
}
// Monday–Sunday week total using Day Total
function computeWeekTotalForRow_(sh, row) {
  const date = dateOnly_(sh.getRange(row, COL.DATE).getValue());
  const monday = startOfISOWeek_(date);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()+6);
  let sum = 0;
  const last = sh.getLastRow();
  for (let r=2; r<=last; r++) {
    const d = sh.getRange(r, COL.DATE).getValue();
    if (!d) continue;
    const dd = dateOnly_(d);
    if (dd >= monday && dd <= sunday) {
      const h = Number(sh.getRange(r, COL.DAY_TOTAL).getValue()) || 0;
      sum += h;
    }
  }
  return sum;
}
function startOfISOWeek_(d) {
  const tmp = dateOnly_(d);
  const day = tmp.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // move to Monday
  return new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate()+diff);
}
// Recompute Week Total for every row (used after backfills)
function reComputeAllWeekTotals_(sh) {
  const last = sh.getLastRow();
  for (let r=2; r<=last; r++) {
    const dVal = sh.getRange(r, COL.DATE).getValue();
    if (!dVal) continue;
    sh.getRange(r, COL.WEEK).setValue(computeWeekTotalForRow_(sh, r));
  }
}
