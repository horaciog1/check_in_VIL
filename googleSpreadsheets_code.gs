// ──────────────────────────────────────────
// Config
// ──────────────────────────────────────────
const SHEET_EVENTS = 'Events';
const TZ           = Session.getScriptTimeZone();

// ──────────────────────────────────────────
// Shared row-writing logic
// ──────────────────────────────────────────
function handle(body) {
  const out = c => ContentService
    .createTextOutput(JSON.stringify(c))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin','*');

  try {
    // 1) Only accept these modes:
    const valid = ['checkin','checkout','points','nopoints'];
    if (!valid.includes(body.type)) {
      return out({status:'error', message:'Invalid type: '+body.type});
    }

    // 2) Sheet setup
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const sheet   = ss.getSheetByName(SHEET_EVENTS);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // 3) Find today's date header (displayed as "Wednesday, May 28")
    const todayLabel = Utilities.formatDate(new Date(), TZ, 'EEEE, MMMM d');
    const headerRow  = sheet
      .getRange(1, 1, 1, lastCol)
      .getDisplayValues()[0];
    const idx0 = headerRow.indexOf(todayLabel);
    if (idx0 < 0) {
      return out({status:'error', message:'No column for date '+todayLabel});
    }

    // 4) Compute the 4-column group under that date:
    //    C=checkin, D=checkout, E=firstPoint, F=secondPoint
    const groupStart     = idx0 + 1;   // 1-based (C=3, etc)
    const checkinCol     = groupStart;
    const checkoutCol    = groupStart + 1;
    const firstPointCol  = groupStart + 2;
    const secondPointCol = groupStart + 3;

    // 5) Find the student's row (IDs in A3:A)
    const ids = sheet
      .getRange(3, 1, lastRow - 2, 1)
      .getValues()
      .flat();
    const rIdx = ids.findIndex(id => String(id) === String(body.student_id));
    if (rIdx < 0) {
      return out({status:'error', message:'Student ID not found: '+body.student_id});
    }
    const rowNum = rIdx + 3;

    // 6) Handle each mode
    if (body.type === 'checkin' || body.type === 'checkout') {
      // write a timestamp once
      const targetCol = body.type === 'checkin' ? checkinCol : checkoutCol;
      const cell = sheet.getRange(rowNum, targetCol);
      if (!cell.getValue()) {
        const ts = body.timestamp ? new Date(body.timestamp) : new Date();
        cell.setValue(ts);
      }

    } else {
      // points / nopoints -> 1st or 2nd point slot
      const ts = body.timestamp ? new Date(body.timestamp) : new Date();
      // get hour/minute in your TZ
      const h = parseInt(Utilities.formatDate(ts, TZ, 'H'), 10);
      const m = parseInt(Utilities.formatDate(ts, TZ, 'm'), 10);
      const isFirst = (h < 12 || (h === 12 && m < 30));

      const targetCol = isFirst ? firstPointCol : secondPointCol;
      const cell      = sheet.getRange(rowNum, targetCol);
      if (!cell.getValue()) {
        cell.setValue(body.type === 'points' ? 1 : 0);
      }
    }

    return out({status:'ok'});

  } catch (err) {
    return out({status:'error', message: err.toString()});
  }
}

// ──────────────────────────────────────────
// Entry points
// ──────────────────────────────────────────
function doGet(e)    { return handle(e.parameter); }
function doPost(e)   { return handle(JSON.parse(e.postData.contents)); }
function doOptions() {
  return ContentService.createTextOutput('')
    .setHeader('Access-Control-Allow-Origin','*')
    .setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers','Content-Type');
}
