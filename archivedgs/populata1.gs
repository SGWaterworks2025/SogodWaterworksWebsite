/**
 * Sogod Waterworks Appointment System Populator & Validator
 * --------------------------------------------------------
 * This script provides robust, non-destructive population and validation of Google Sheets and Forms
 * for the Sogod Waterworks appointment system. Use the functions below as needed.
 *
 * === HOW TO USE ===
 *
 * 1. Validate resources (see what needs to be created or fixed):
 *    const report = validateResources(sheetId);
 *    // sheetId: The ID of your target Google Sheet
 *
 * 2. Populate or repair resources (create/fix only what is needed):
 *    modernPopulateResources(sheetId, { repairOnly: false });
 *    // Set repairOnly: true to only repair headers/forms, not create missing ones
 *
 * 3. Check cross-resource consistency:
 *    const consistency = validateConsistency(sheetId);
 *
 * 4. Check data quality in all response and availability tabs:
 *    const quality = validateDataQuality(sheetId);
 *
 * 5. Email all Google Form embed links to the script owner:
 *    sendFormLinksEmail(sheetId);
 *
 * All functions log their actions and return structured reports (where applicable).
 * You can run these from the Apps Script editor, custom menus, or triggers as needed.
 */

// populata1.gs - Refactored population logic for Sogod Waterworks Appointment System
// PHASE 1: VARIABLES & CONSTANTS
// --------------------------------
// Global configuration and constants for Sogod Waterworks Appointment System

// Script versioning and environment
const SCRIPT_VERSION = 'v4';
const CACHE_KEY = SCRIPT_VERSION + '_counts';
const SUBMIT_COUNT_KEY = SCRIPT_VERSION + '_submit_counter';
const IS_DEV = false;

// Form and sheet registry
const FORM_REGISTRY = [
  {
    formId: '1a7K-SKOU5n3mYlCMM7y0bUqvaO_u5LHtDDS3eLq3mhs',
    sheetName: 'Form Responses 1',
    spreadsheetId: '1SZqf77i655xHA1FI6YzeZ332E6M4Y_dpFmz_h1tM6xQ',
    availabilitySheetName: 'Availability_Form1'
  },
  {
    formId: '1AGsTaMbhv-aCR_B7fEJZ534jwdcHhxB4HcreOfj6Dq0',
    sheetName: 'ForConnection',
    spreadsheetId: '1SZqf77i655xHA1FI6YzeZ332E6M4Y_dpFmz_h1tM6xQ',
    availabilitySheetName: 'Availability_Connection'
  },
  {
    formId: '1sCsIcymP-cIJK7ziMPA_tjWph5ER62n5nscJl3qyEo4',
    sheetName: 'ForDisconnection',
    spreadsheetId: '1SZqf77i655xHA1FI6YzeZ332E6M4Y_dpFmz_h1tM6xQ',
    availabilitySheetName: 'Availability_Disconnection'
  },
  {
    formId: '1lfrpxChZ6K1vvO4-v--ww7nWzT5yIyXqeX2PYr5aBpg',
    sheetName: 'ForReconnection',
    spreadsheetId: '1SZqf77i655xHA1FI6YzeZ332E6M4Y_dpFmz_h1tM6xQ',
    availabilitySheetName: 'Availability_Reconnection'
  },
  {
    formId: '16pTBxWONNrs4jUb_EXmXKyLkglSjYT7I6S2BZaPIPu4',
    sheetName: 'ForRepairandMaintenance',
    spreadsheetId: '1SZqf77i655xHA1FI6YzeZ332E6M4Y_dpFmz_h1tM6xQ',
    availabilitySheetName: 'Availability_Repair'
  },
  {
    formId: '1jeVbs7nAIhaGhiJEyqcAygwgTNVixV6gt81xwdUWrYs',
    sheetName: 'ForWaterTruckRequest',
    spreadsheetId: '1SZqf77i655xHA1FI6YzeZ332E6M4Y_dpFmz_h1tM6xQ',
    availabilitySheetName: 'Availability_WaterTruck'
  },
  {
    formId: '19acXAZfOnMunLOg9enl9JrSJCfzjqbqwn45_QD9vX4g',
    sheetName: 'ForOtherConcerns',
    spreadsheetId: '1SZqf77i655xHA1FI6YzeZ332E6M4Y_dpFmz_h1tM6xQ',
    availabilitySheetName: 'Availability_Other'
  }
];

// Sheet/slot configuration
const SLOT_CAP = 20;
const FUTURE_DAYS = 60;
const RESPONSE_RETENTION_DAYS = 60;
const RESP_DATE_COL = 6;
const AVAIL_BOOKED_COL = 2;
const AVAIL_LEFT_COL = 3;
const MAX_ADVANCE_DAYS = 60;
const BUSINESS_DAYS_WINDOW = 60;
const BATCH_DAYS_WINDOW = 30;
const CHUNK_SIZE = 50;

// Throttling and timeouts
const THROTTLE_INTERVAL_MS = 60000;
const LOCK_TIMEOUT_MS = 30000;
const EMAIL_THROTTLE_MS = 24 * 60 * 60 * 1000;

// Calendar API limits
const CALENDAR_API_CALL_LIMIT_PER_RUN = 20;
const CALENDAR_API_CALL_LIMIT_PER_DAY = 2000;

// Calendar and event tags
const EVENT_COLOR_AVAILABLE = CalendarApp.EventColor.GREEN;
const EVENT_COLOR_FULL = CalendarApp.EventColor.RED;
const HOLIDAY_CAL_ID = 'en.philippines#holiday@group.v.calendar.google.com';
const HOLIDAY_CACHE_KEY = SCRIPT_VERSION + '_holidays';
const HOLIDAY_CACHE_TTL = 12 * 60 * 60; // 12 hours
const FULL_SUMMARY_TAG = '📅';
const APPT_EVENT_TAG = '[APPOINTMENT]';
const TAG_HOLIDAY = '[AUTO_HOLIDAY]';

// Field mapping for forms
const FIELD_ID_MAP = {
  'Last Name': '1111111111111111111',
  'First Name': '2222222222222222222',
  'Purok': '3333333333333333333',
  'Barangay': '4444444444444444444',
  'Date of Appointment': '5555555555555555555'
};

// Timezone and core services
const TZ = Session.getScriptTimeZone();
const CACHE = CacheService.getScriptCache();
const CAL = CalendarApp.getDefaultCalendar();

// Barangay dropdown values
const BARANGAY_LIST = [
  'AMPONGOL', 'BAGAKAY', 'BAGATAYAM', 'BAWO', 'CABALAWAN', 'CABANGAHAN',
  'CALUMBOYAN', 'DAKIT', 'DAMOLOG', 'IBABAO', 'LIKI', 'LUBO', 'MOHON',
  'NAHUS-AN', 'PANSOY', 'POBLACION', 'TABUNOK', 'TAKAY'
];

// Caches and counters (for use in logic, not config)
let _ssCache = {};
let _formCache = {};
let calendarCallsThisRun = 0;
let calendarCallsToday = 0;

// Modern HolidayService config (logic will be added in later phases)
const HolidayService = {
  _holidayCalendar: null,
  _initialized: false,
  _calendarAvailable: false,
  _manualHolidays: [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 4, day: 9, name: 'Araw ng Kagitingan' },
    { month: 5, day: 1, name: 'Labor Day' },
    { month: 6, day: 12, name: 'Independence Day' },
    { month: 7, day: 15, name: 'SOGOD MUNICIPAL FIESTA' },
    { month: 8, day: 21, name: 'Ninoy Aquino Day' },
    { month: 11, day: 1, name: "All Saints' Day" },
    { month: 11, day: 2, name: "All Souls' Day" },
    { month: 11, day: 30, name: 'Bonifacio Day' },
    { month: 12, day: 8, name: 'Feast of the Immaculate Conception' },
    { month: 12, day: 25, name: 'Christmas Day' },
    { month: 12, day: 30, name: 'Rizal Day' },
    { month: 12, day: 31, name: "New Year's Eve" }
  ],
  _excludedHolidayNames: new Set([
    'Amun Jadid', 'Maulid un-Nabi', 'Mawlid al-Nabi', 'Lailatul Isra Wal Mi Raj',
    'Eid al-Adha Day 2', 'Eid al-Adha Day 3', 'Eid al-Fitr Day 2', 'Eid al-Fitr Day 3',
    'Hijri New Year', 'Ashura', 'Arba\'een', 'Laylat al-Bara\'ah', 'Laylat al-Qadr',
    'Waqf al-Arafa', 'Ramadan Start', 'Ramadan End', 'Laylat al-Raghaib', 'Eid al-Ghadir'
  ]),
  _overrideWorkingDays: new Set()
};

// ... variables and constants will be added here ...

// PHASE 2: MAIN MODERN POPULATOR FUNCTION
// ---------------------------------------
/**
 * Main modern populator function for Sogod Waterworks Appointment System.
 * Only creates or repairs missing/invalid tabs/forms, preserves valid data, supports repairOnly mode, and logs actions.
 * @param {string} sheetId - The ID of the Google Sheet to populate/repair.
 * @param {Object} [options] - { repairOnly: boolean, validationReport: object }
 */
function modernPopulateResources(sheetId, options) {
  options = options || {};
  const repairOnly = !!options.repairOnly;
  // Use a validation report if provided, otherwise run validation (to be implemented in helpers)
  const report = options.validationReport || (typeof validateResources === 'function' ? validateResources(sheetId) : { missingTabs: [], invalidTabs: [], missingForms: [], invalidForms: [] });
  let ss;
  try {
    ss = SpreadsheetApp.openById(sheetId);
  } catch (e) {
    Logger.log('Permission error: ' + e);
    return;
  }

  // --- Handle Tabs ---
  // Create missing tabs (unless repairOnly)
  if (!repairOnly && report.missingTabs && report.missingTabs.length) {
    report.missingTabs.forEach(tabName => {
      let sheet = ss.getSheetByName(tabName);
      if (!sheet) {
        sheet = ss.insertSheet(tabName);
        Logger.log('Created missing tab: ' + tabName);
        // Add headers if known
        if (FORM_REGISTRY.some(e => e.sheetName === tabName)) {
          sheet.getRange(1, 1, 1, 6).setValues([
            ['Timestamp', 'Last Name', 'First Name', 'Purok', 'Barangay', 'Date of Appointment']
          ]);
        } else if (FORM_REGISTRY.some(e => e.availabilitySheetName === tabName)) {
          sheet.getRange(1, 1, 1, 3).setValues([
            ['Date', 'Booked', 'Slots Left']
          ]);
        } else if (tabName === 'ListOfAppointments') {
          sheet.getRange(1, 1).setValue('Unified Appointment List');
          sheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
        }
      }
    });
  }
  // Repair invalid tabs (add/fix headers only, do not clear data)
  if (report.invalidTabs && report.invalidTabs.length) {
    report.invalidTabs.forEach(tabName => {
      let sheet = ss.getSheetByName(tabName);
      if (!sheet) return;
      if (FORM_REGISTRY.some(e => e.sheetName === tabName)) {
        sheet.getRange(1, 1, 1, 6).setValues([
          ['Timestamp', 'Last Name', 'First Name', 'Purok', 'Barangay', 'Date of Appointment']
        ]);
        Logger.log('Repaired headers for tab: ' + tabName);
      } else if (FORM_REGISTRY.some(e => e.availabilitySheetName === tabName)) {
        sheet.getRange(1, 1, 1, 3).setValues([
          ['Date', 'Booked', 'Slots Left']
        ]);
        Logger.log('Repaired headers for tab: ' + tabName);
      }
    });
  }

  // --- Handle Forms ---
  // Create missing forms (unless repairOnly)
  if (!repairOnly && report.missingForms && report.missingForms.length) {
    report.missingForms.forEach(sheetName => {
      const entry = FORM_REGISTRY.find(e => e.sheetName === sheetName);
      if (!entry) return;
      try {
        let form = FormApp.create(entry.sheetName + ' (Demo)');
        form.setTitle(entry.sheetName + ' Appointment Form');
        form.addParagraphTextItem().setTitle('Last Name').setRequired(true);
        form.addParagraphTextItem().setTitle('First Name').setRequired(true);
        form.addParagraphTextItem().setTitle('Purok').setRequired(true);
        form.addListItem().setTitle('Barangay').setChoiceValues(BARANGAY_LIST).setRequired(true);
        form.addListItem().setTitle('Date of Appointment').setChoiceValues([]).setRequired(true);
        if (entry.sheetName === 'ForDisconnection') {
          form.addParagraphTextItem().setTitle('Reason for Disconnection').setRequired(true);
        }
        Logger.log('Created missing form: ' + entry.sheetName);
      } catch (err) {
        Logger.log('Error creating form for ' + entry.sheetName + ': ' + err);
      }
    });
  }
  // Repair invalid forms (remove and re-add correct items)
  if (report.invalidForms && report.invalidForms.length) {
    report.invalidForms.forEach(sheetName => {
      const entry = FORM_REGISTRY.find(e => e.sheetName === sheetName);
      if (!entry) return;
      try {
        let form = FormApp.openById(entry.formId);
        // Remove all items and re-add correct ones
        const items = form.getItems();
        for (let i = items.length - 1; i >= 0; i--) {
          form.deleteItem(items[i]);
        }
        form.addParagraphTextItem().setTitle('Last Name').setRequired(true);
        form.addParagraphTextItem().setTitle('First Name').setRequired(true);
        form.addParagraphTextItem().setTitle('Purok').setRequired(true);
        form.addListItem().setTitle('Barangay').setChoiceValues(BARANGAY_LIST).setRequired(true);
        form.addListItem().setTitle('Date of Appointment').setChoiceValues([]).setRequired(true);
        if (entry.sheetName === 'ForDisconnection') {
          form.addParagraphTextItem().setTitle('Reason for Disconnection').setRequired(true);
        }
        Logger.log('Repaired form: ' + entry.sheetName);
      } catch (err) {
        Logger.log('Error repairing form for ' + entry.sheetName + ': ' + err);
      }
    });
  }
  Logger.log('Modern population complete. Repair only: ' + repairOnly);
}

// PHASE 3: REMAINING IMPLEMENTATION
// ---------------------------------

/**
 * Validation Before Population
 * Checks if all required resources (tabs, forms) exist and are valid.
 * Reports what needs to be created, updated, or repaired. Does not modify anything.
 * @param {string} sheetId - The ID of the Google Sheet to validate.
 * @return {Object} Validation report
 */
function validateResources(sheetId) {
  const report = {
    missingTabs: [],
    invalidTabs: [],
    missingForms: [],
    invalidForms: [],
    permissionErrors: [],
    summary: []
  };
  let ss;
  try {
    ss = SpreadsheetApp.openById(sheetId);
  } catch (e) {
    report.permissionErrors.push('Cannot open sheet: ' + e);
    Logger.log('Permission error: ' + e);
    return report;
  }
  // Required tabs: all response/availability tabs, ListOfAppointments
  const requiredTabs = [
    ...FORM_REGISTRY.map(e => e.sheetName),
    ...FORM_REGISTRY.map(e => e.availabilitySheetName),
    'ListOfAppointments'
  ];
  requiredTabs.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      report.missingTabs.push(tabName);
      report.summary.push(`Tab missing: ${tabName}`);
    } else {
      // Validate headers for response/availability tabs
      if (tabName === 'ListOfAppointments') return;
      let expectedHeaders = null;
      if (FORM_REGISTRY.some(e => e.sheetName === tabName)) {
        expectedHeaders = ['Timestamp', 'Last Name', 'First Name', 'Purok', 'Barangay', 'Date of Appointment'];
      } else if (FORM_REGISTRY.some(e => e.availabilitySheetName === tabName)) {
        expectedHeaders = ['Date', 'Booked', 'Slots Left'];
      }
      if (expectedHeaders) {
        const headers = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
        if (!expectedHeaders.every((h, i) => headers[i] === h)) {
          report.invalidTabs.push(tabName);
          report.summary.push(`Tab invalid headers: ${tabName}`);
        }
      }
    }
  });
  // Validate Google Forms
  FORM_REGISTRY.forEach(entry => {
    try {
      let form;
      try {
        form = FormApp.openById(entry.formId);
      } catch (e) {
        report.missingForms.push(entry.sheetName);
        report.summary.push(`Form missing: ${entry.sheetName}`);
        return;
      }
      // Validate questions
      const items = form.getItems();
      const titles = items.map(i => i.getTitle());
      const expected = [
        'Last Name',
        'First Name',
        'Purok',
        'Barangay',
        'Date of Appointment'
      ];
      if (entry.sheetName === 'ForDisconnection') expected.push('Reason for Disconnection');
      let valid = true;
      expected.forEach(title => {
        if (!titles.includes(title)) valid = false;
      });
      // Check types and required status
      items.forEach(item => {
        const title = item.getTitle();
        if (['Last Name', 'First Name', 'Purok'].includes(title)) {
          if (item.getType() !== FormApp.ItemType.PARAGRAPH_TEXT || !item.asParagraphTextItem().isRequired()) valid = false;
        }
        if (title === 'Barangay') {
          if (item.getType() !== FormApp.ItemType.LIST || !item.asListItem().isRequired()) valid = false;
        }
        if (title === 'Date of Appointment') {
          if (item.getType() !== FormApp.ItemType.LIST || !item.asListItem().isRequired()) valid = false;
        }
        if (title === 'Reason for Disconnection') {
          if (item.getType() !== FormApp.ItemType.PARAGRAPH_TEXT || !item.asParagraphTextItem().isRequired()) valid = false;
        }
      });
      if (!valid) {
        report.invalidForms.push(entry.sheetName);
        report.summary.push(`Form invalid: ${entry.sheetName}`);
      }
    } catch (err) {
      report.permissionErrors.push('Form error for ' + entry.sheetName + ': ' + err);
      Logger.log('Form error for ' + entry.sheetName + ': ' + err);
    }
  });
  Logger.log('Validation report: ' + JSON.stringify(report, null, 2));
  return report;
}

/**
 * Cross-Resource Consistency Check
 * Ensures all resources (sheets, forms, calendar) are in sync.
 * Reports any mismatches or issues. Does not modify anything.
 * @param {string} sheetId - The ID of the Google Sheet to check.
 * @return {Object} Consistency report
 */
function validateConsistency(sheetId) {
  const report = {
    formToSheetMismatch: [],
    sheetToFormMismatch: [],
    calendarIssues: [],
    summary: []
  };
  let ss;
  try {
    ss = SpreadsheetApp.openById(sheetId);
  } catch (e) {
    report.summary.push('Cannot open sheet: ' + e);
    Logger.log('Consistency check: Permission error: ' + e);
    return report;
  }
  // Check each form's destination sheet
  FORM_REGISTRY.forEach(entry => {
    try {
      let form;
      try {
        form = FormApp.openById(entry.formId);
      } catch (e) {
        report.formToSheetMismatch.push({ form: entry.sheetName, issue: 'Form missing' });
        report.summary.push(`Form missing: ${entry.sheetName}`);
        return;
      }
      const sheet = ss.getSheetByName(entry.sheetName);
      if (!sheet) {
        report.formToSheetMismatch.push({ form: entry.sheetName, issue: 'Destination sheet missing' });
        report.summary.push(`Destination sheet missing for form: ${entry.sheetName}`);
        return;
      }
      const expectedHeaders = ['Timestamp', 'Last Name', 'First Name', 'Purok', 'Barangay', 'Date of Appointment'];
      const headers = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
      if (!expectedHeaders.every((h, i) => headers[i] === h)) {
        report.formToSheetMismatch.push({ form: entry.sheetName, issue: 'Sheet headers mismatch' });
        report.summary.push(`Sheet headers mismatch for form: ${entry.sheetName}`);
      }
    } catch (err) {
      report.formToSheetMismatch.push({ form: entry.sheetName, issue: 'Error: ' + err });
      report.summary.push(`Error for form ${entry.sheetName}: ${err}`);
    }
  });
  // Check each sheet is referenced by a form (if applicable)
  const allSheetNames = ss.getSheets().map(s => s.getName());
  allSheetNames.forEach(sheetName => {
    if (FORM_REGISTRY.some(e => e.sheetName === sheetName)) return;
    if (FORM_REGISTRY.some(e => e.availabilitySheetName === sheetName)) return;
    if (['ListOfAppointments', 'DistributedQueue_FIFO_v1', 'DistributedQueue_DLQ_v1'].includes(sheetName)) return;
    report.sheetToFormMismatch.push(sheetName);
    report.summary.push(`Sheet not referenced by any form: ${sheetName}`);
  });
  // Optionally, check calendar event creation (stub)
  // report.calendarIssues.push('Calendar check not implemented');
  Logger.log('Consistency report: ' + JSON.stringify(report, null, 2));
  return report;
}

/**
 * Data Quality Assurance
 * Scans all form response and availability tabs for data entry errors and validation issues.
 * Reports any data quality issues found. Does not modify any data.
 * @param {string} sheetId - The ID of the Google Sheet to check.
 * @return {Object} Data quality report
 */
function validateDataQuality(sheetId) {
  const report = {
    responseSheetIssues: [],
    availabilitySheetIssues: [],
    summary: []
  };
  let ss;
  try {
    ss = SpreadsheetApp.openById(sheetId);
  } catch (e) {
    report.summary.push('Cannot open sheet: ' + e);
    Logger.log('Data quality check: Permission error: ' + e);
    return report;
  }
  // Check form response sheets
  FORM_REGISTRY.forEach(entry => {
    const sheet = ss.getSheetByName(entry.sheetName);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      // Check required fields
      if (!row[0] || !row[1] || !row[2] || !row[3] || !row[4] || !row[5]) {
        report.responseSheetIssues.push({ sheet: entry.sheetName, row: rowNum, issue: 'Missing required field(s)' });
        report.summary.push(`Missing required field(s) in ${entry.sheetName} row ${rowNum}`);
      }
      // Check Barangay is valid
      if (row[4] && BARANGAY_LIST.indexOf(row[4]) === -1) {
        report.responseSheetIssues.push({ sheet: entry.sheetName, row: rowNum, issue: 'Invalid Barangay' });
        report.summary.push(`Invalid Barangay in ${entry.sheetName} row ${rowNum}: ${row[4]}`);
      }
      // Check date format (yyyy-MM-dd)
      if (row[5] && !/^\d{4}-\d{2}-\d{2}/.test(row[5])) {
        report.responseSheetIssues.push({ sheet: entry.sheetName, row: rowNum, issue: 'Invalid date format' });
        report.summary.push(`Invalid date format in ${entry.sheetName} row ${rowNum}: ${row[5]}`);
      }
      // For ForDisconnection, check Reason for Disconnection (if present)
      if (entry.sheetName === 'ForDisconnection' && (!row[6] || row[6].trim() === '')) {
        report.responseSheetIssues.push({ sheet: entry.sheetName, row: rowNum, issue: 'Missing Reason for Disconnection' });
        report.summary.push(`Missing Reason for Disconnection in ${entry.sheetName} row ${rowNum}`);
      }
    }
  });
  // Check availability sheets
  FORM_REGISTRY.forEach(entry => {
    const sheet = ss.getSheetByName(entry.availabilitySheetName);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      // Check date format
      if (!row[0] || !/^\d{4}-\d{2}-\d{2}/.test(row[0])) {
        report.availabilitySheetIssues.push({ sheet: entry.availabilitySheetName, row: rowNum, issue: 'Invalid or missing date' });
        report.summary.push(`Invalid or missing date in ${entry.availabilitySheetName} row ${rowNum}: ${row[0]}`);
      }
      // Check Booked and Slots Left are numbers
      if (isNaN(row[1]) || isNaN(row[2])) {
        report.availabilitySheetIssues.push({ sheet: entry.availabilitySheetName, row: rowNum, issue: 'Booked/Slots Left not a number' });
        report.summary.push(`Booked/Slots Left not a number in ${entry.availabilitySheetName} row ${rowNum}`);
      }
    }
  });
  Logger.log('Data quality report: ' + JSON.stringify(report, null, 2));
  return report;
}

// Utility: Send Google Form embed links via email
/**
 * Sends an email to the script owner with Google Form links for each form in FORM_REGISTRY.
 * The email includes HTML <iframe> embed codes for each form, ready to be added to a website.
 * @param {string} sheetId - The ID of the Google Sheet (for context, not used directly).
 */
function sendFormLinksEmail(sheetId) {
  const recipient = Session.getActiveUser().getEmail();
  let html = '<h2>Google Form Embed Links</h2>';
  FORM_REGISTRY.forEach(entry => {
    try {
      const form = FormApp.openById(entry.formId);
      const formUrl = form.getPublishedUrl();
      const embed = `<iframe src="${formUrl}?embedded=true" width="640" height="1200" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>`;
      html += `<h3>${entry.sheetName}</h3><p>${embed}</p>`;
    } catch (e) {
      html += `<h3>${entry.sheetName}</h3><p><em>Form not found or not accessible.</em></p>`;
    }
  });
  MailApp.sendEmail({
    to: recipient,
    subject: 'Google Form Embed Links for Sogod Waterworks',
    htmlBody: html
  });
  Logger.log('Sent form embed links email to ' + recipient);
}

// ... rest of the implementation will be added here ... 