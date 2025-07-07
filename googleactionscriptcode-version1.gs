/**
 * Sogod Waterworks Appointment System – Comprehensive Documentation
 * ================================================================
 * This file provides a complete reference for the modernized Sogod Waterworks
 * Google Apps Script appointment system, including setup, usage, architecture,
 * subsystem details, error handling, extensibility, and troubleshooting.
 *
 * For the main orchestrator code, see: googleactionscriptcode-version1.gs
 */

/**
 * WHAT'S NEW / CHANGELOG (2024-06)
 * --------------------------------
 * - Full CalendarSyncService: Robust, deduplicated, and quota-aware calendar sync for summary and appointment events.
 * - HolidayService: Now includes full logic for all holidays, including Muslim holidays (Eid al-Fitr, Eid al-Adha) and exclusions.
 * - Unified List Block Layout: Modern, configurable, and staff-friendly block layout for ListOfAppointments sheet.
 * - Form Dropdowns: All relevant flows now show slot availability in dropdown labels.
 * - Admin Tools: All admin "rebuild" and maintenance functions are robust, modular, and documented.
 * - Documentation: All new features, admin tools, and configuration options are now fully documented here.
 */

/**
 * SECTION 1: OVERVIEW
 * -------------------
 * The Sogod Waterworks Appointment System is a robust, modular, and maintainable
 * Google Apps Script solution for managing appointment bookings, resource validation,
 * distributed async job processing, and Google Calendar integration for the Sogod Waterworks office.
 *
 * The system is designed for reliability, idempotency, and ease of maintenance.
 * All logic is organized into clear subsystems, with strong error handling and diagnostics.
 */

/**
 * SECTION 2: FEATURES
 * -------------------
 * - Automated population and validation of Google Sheets, Forms, and Calendar resources
 * - Distributed queue and async job worker for scalable, non-blocking processing
 * - Comprehensive monitoring, diagnostics, and error handling (with throttled notifications)
 * - Free-tier optimized trigger management (stays well under Google Apps Script quotas)
 * - Modular, maintainable, and extensible codebase
 * - Robust calendar sync and quota management (CalendarSyncService)
 * - Full holiday logic, including Muslim holidays and exclusions (HolidayService)
 * - Modern, configurable unified list block layout for staff
 * - Form dropdowns show real-time slot availability
 * - Admin-friendly diagnostics, error history, and full rebuild/maintenance tools
 */

/**
 * SECTION 3: SETUP & DEPLOYMENT
 * -----------------------------
 * 1. **Copy the orchestrator code (`googleactionscriptcode-version1.gs`) to your Apps Script project.**
 * 2. **Run `setupFreeTierSystem()`** from the Apps Script editor to set up all triggers, initialize quotas, and create the unified appointment list.
 * 3. **(Optional) Configure the FORM_REGISTRY** at the top of the orchestrator file to match your forms and sheets.
 * 4. **(Optional) Review and adjust constants (e.g., SLOT_CAP, CALENDAR_API_CALL_LIMIT_PER_RUN) as needed.**
 */

/**
 * SECTION 4: USAGE – MAIN ENTRY POINTS
 * ------------------------------------
 *
 * // Validate resources (see what needs to be created or fixed):
 *   const report = validateResources(sheetId);
 *
 * // Populate or repair resources (create/fix only what is needed):
 *   modernPopulateResources(sheetId, { repairOnly: false });
 *
 * // Run system diagnostics:
 *   const diag = productionSystemDiagnostics();
 *
 * // Set up triggers and initialize system:
 *   setupFreeTierSystem();
 *
 * // Sync calendar events for a date range:
 *   CalendarSyncService.syncDateRange(start, end);
 *
 * // Check if a date is a holiday:
 *   HolidayService.isHoliday('YYYY-MM-DD');
 *
 * // Rebuild all form dropdowns with slot availability:
 *   rebuildAllFormDropdowns();
 *
 * // Generate the unified appointment list (block layout):
 *   generateUnifiedAppointmentList();
 *
 * // Check error history:
 *   ErrorService.getRecentErrors();
 *
 * // Clear error history:
 *   ErrorService.clearErrorHistory();
 */

/**
 * SECTION 5: MAINTENANCE & ADMIN TASKS
 * ------------------------------------
 * - **Run daily maintenance:**
 *     Trigger `dailyMaintenanceRoutine()` at 2 AM (set up automatically by `setupFreeTierSystem()`)
 * - **Purge old responses:**
 *     `purgeOldResponses()`
 * - **Emergency cleanup:**
 *     `emergencyFreeTierCleanup()` (clears stuck jobs, resets quotas, etc.)
 * - **Retry failed jobs from DLQ:**
 *     `retryFailedJobs(limit)`
 * - **Force release worker leases:**
 *     `forceReleaseWorkerLeases()`
 */

/**
 * SECTION 6: ARCHITECTURE & SUBSYSTEMS
 * ------------------------------------
 *
 * 1. **Populator/Validator Suite**
 *    - Resource creation, validation, and data quality checks for Sheets, Forms, and Calendar.
 *    - Functions: `modernPopulateResources`, `validateResources`, `validateConsistency`, `validateDataQuality`, `sendFormLinksEmail`.
 *
 * 2. **Distributed Queue & Async Worker**
 *    - Robust, idempotent, and concurrency-safe job processing.
 *    - Functions: `distributedQueueEnqueue`, `distributedQueueDequeueAtomic`, `distributedQueueComplete`, job handlers.
 *
 * 3. **Monitoring & Diagnostics**
 *    - Tracks queue depth, lock wait times, job metrics, and system health.
 *    - Functions: `ConcurrencyMonitor`, `productionSystemDiagnostics`, `monitorFreeTierSystem`.
 *
 * 4. **Trigger Management**
 *    - Free-tier optimized, minimal triggers for all forms, async worker, and daily maintenance.
 *    - Functions: `FreeTierTriggerManager`, `setupFreeTierSystem`, `dailyMaintenanceRoutine`.
 *
 * 5. **Error Handling & Utilities**
 *    - Structured error logging, throttled notifications, and error history.
 *    - Functions: `ErrorService`, `logError`, `sendThrottledError`, `getRecentErrors`, `clearErrorHistory`.
 *
 * 6. **Calendar/Quota Management & Sync**
 *    - Safe Google Calendar API usage, event deduplication, and quota enforcement.
 *    - Robust, deduplicated, and quota-aware calendar sync for summary and appointment events.
 *    - Functions: `CalendarQuotaManager`, `CalendarSyncService`, `syncSummaryEvents`, `syncAppointmentEvents`, `syncDateRange`.
 *
 * 7. **Holiday Logic**
 *    - Full logic for all holidays, including Muslim holidays and exclusions.
 *    - Functions: `HolidayService.isHoliday`, `HolidayService.fetchRange`.
 *
 * 8. **Unified List Block Layout**
 *    - Modern, configurable, and staff-friendly block layout for ListOfAppointments sheet.
 *    - Functions: `generateUnifiedAppointmentList`, `buildUnifiedBlockList`, `groupByDateBlock`, `renderUnifiedDateBlock`.
 *
 * 9. **Form Dropdowns with Slot Availability**
 *    - All relevant flows show slot availability in dropdown labels.
 *    - Functions: `rebuildAllFormDropdowns`.
 *
 * 10. **Utilities**
 *    - Date parsing/formatting, spreadsheet access, cache helpers, and logging.
 *    - Functions: `DateUtils`, `getSpreadsheet`, `logTS`, `safeCacheGet`, `safeCachePut`.
 */

/**
 * SECTION 7: ERROR HANDLING & TROUBLESHOOTING
 * -------------------------------------------
 * - All errors are logged with context and stack trace.
 * - Critical errors trigger throttled email notifications to the script owner.
 * - Recent errors are stored in script properties and can be retrieved with `ErrorService.getRecentErrors()`.
 * - To clear error history: `ErrorService.clearErrorHistory()`.
 * - For persistent issues, check the logs in the Apps Script editor and review the diagnostics report.
 */

/**
 * SECTION 8: EXTENSIBILITY & CONTRIBUTING
 * ---------------------------------------
 * - The codebase is modular and organized by subsystem.
 * - To add new features, create new functions or services in the appropriate section.
 * - Document all new functions and update this documentation as needed.
 * - For new forms or sheets, update the `FORM_REGISTRY` at the top of the orchestrator file.

 */

/**
 * SECTION 9: GLOSSARY OF MAIN FUNCTIONS
 * -------------------------------------
 * - `setupOrValidateSystem(sheetId, options)`: Main admin entry for validation and repair.
 * - `modernPopulateResources(sheetId, options)`: Populates/repairs resources as needed.
 * - `validateResources(sheetId)`: Returns a report of missing/invalid resources.
 * - `validateConsistency(sheetId)`: Checks cross-resource consistency.
 * - `validateDataQuality(sheetId)`: Checks data quality in all tabs.
 * - `sendFormLinksEmail(sheetId)`: Emails Google Form embed codes to the script owner.
 * - `productionSystemDiagnostics()`: Returns a full system health/diagnostics report.
 * - `setupFreeTierSystem()`: Sets up all triggers, quotas, and unified list.
 * - `CalendarSyncService.syncDateRange(start, end)`: Syncs all summary and appointment events for a date range (robust, deduplicated, quota-aware).
 * - `CalendarSyncService.syncSummaryEvents(dateStr, existingEvents, results)`: Ensures correct summary event for a date.
 * - `CalendarSyncService.syncAppointmentEvents(dateStr, existingEvents, results)`: Ensures correct appointment events for a date.
 * - `HolidayService.isHoliday(dateStr)`: Returns true if the date is a holiday (manual, ICS, or Muslim, with exclusions and overrides).
 * - `HolidayService.fetchRange(start, end)`: Returns a set of all holiday date strings in a range.
 * - `rebuildAllFormDropdowns()`: Rebuilds all form dropdowns to show slot availability.
 * - `generateUnifiedAppointmentList()`: Generates the unified appointment list in block layout.
 * - `ErrorService.getRecentErrors()`: Returns recent error logs.
 * - `ErrorService.clearErrorHistory()`: Clears error history.
 * - `emergencyFreeTierCleanup()`: Emergency system cleanup/reset.
 * - `retryFailedJobs(limit)`: Retry failed jobs from the DLQ.
 * - `forceReleaseWorkerLeases()`: Force release stuck worker leases.
 */

/**
 * SECTION 10: TROUBLESHOOTING & FAQ
 * ---------------------------------
 *
 * Q: Why are triggers not firing?
 * A: Run `setupFreeTierSystem()` to ensure all triggers are set up. Check the Apps Script dashboard for trigger errors.
 *
 * Q: Why are calendar events not syncing?
 * A: Check quota limits in diagnostics. Ensure `CalendarQuotaManager` is not exceeding daily/run limits.
 *
 * Q: How do I add a new form or service?
 * A: Add a new entry to `FORM_REGISTRY` and re-run `setupFreeTierSystem()`.
 *
 * Q: How do I get help or report a bug?
 * A: Check error logs with `ErrorService.getRecentErrors()`. For persistent issues, contact the system maintainer.
 *=================================================================
 * Sogod Waterworks Appointment System – Modern Refactored Version 1
 * ================================================================
 * This script is the main orchestrator for the Sogod Waterworks appointment system.
 * It integrates the populator/validator suite and all business logic.
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

/**
 * SOGOD WATERWORKS APPOINTMENT SYSTEM – MODERN REFACTORED VERSION 1
 * ================================================================
 * This file is the modern, maintainable, and robust version of the Sogod Waterworks
 * appointment booking system. It integrates the populator/validator suite from populata1.gs
 * for resource population, validation, and data quality assurance.
 *
 * === INTEGRATION POINTS ===
 * - All resource population, validation, and repair logic is handled by the populator suite.
 * - This file orchestrates the main business logic, distributed queue, and system operations.
 *
 * === PHASED REFACTOR STRUCTURE ===
 * 1. Imports and Populator Integration
 * 2. Main Orchestrator and Integration Points
 * 3. Business Logic, Queue, and System Functions
 * 4. Monitoring, Triggers, and Utilities
 */

// PHASE 1: UNIFIED GLOBAL VARIABLES & CONSTANTS
// ---------------------------------------------
// All global configuration, constants, and registry shared by all modules (populator, business logic, etc.)

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
// [REMOVE or COMMENT OUT]:
// const SLOT_CAP = 20;
// const FUTURE_DAYS = 60;
const RESPONSE_RETENTION_DAYS = 60;
const RESP_DATE_COL = 6;
const AVAIL_BOOKED_COL = 2;
const AVAIL_LEFT_COL = 3;
const MAX_ADVANCE_DAYS = 60;
const BUSINESS_DAYS_WINDOW = 60;
const BATCH_DAYS_WINDOW = 30;
// [REPLACE ALL USAGES]:
// SLOT_CAP -> ConfigService.get('SLOT_CAP', 20)
// FUTURE_DAYS -> ConfigService.get('FUTURE_DAYS', 60)
// CHUNK_SIZE -> ConfigService.get('CHUNK_SIZE', 500)
const CHUNK_SIZE = ConfigService.get('CHUNK_SIZE', 500);

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
  'Last Name': 'REPLACE_WITH_FIELD_ID', // TODO: Replace with actual field ID
  'First Name': 'REPLACE_WITH_FIELD_ID', // TODO: Replace with actual field ID
  'Purok': 'REPLACE_WITH_FIELD_ID', // TODO: Replace with actual field ID
  'Barangay': 'REPLACE_WITH_FIELD_ID', // TODO: Replace with actual field ID
  'Date of Appointment': 'REPLACE_WITH_FIELD_ID' // TODO: Replace with actual field ID
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
  _overrideWorkingDays: new Set(),

  /**
   * Initialize the holiday calendar (ICS/Google Calendar)
   */
  initHolidayCalendar() {
    if (this._initialized) return;
    try {
      this._holidayCalendar = CalendarApp.getCalendarById(HOLIDAY_CAL_ID);
      this._calendarAvailable = !!this._holidayCalendar;
      logTS('HolidayService: Calendar access verified');
    } catch (e) {
      this._calendarAvailable = false;
      logTS('HolidayService: Calendar access failed, will use fallbacks: ' + e);
    }
    this._initialized = true;
  },

  /**
   * Check if a holiday name should be excluded (e.g., multi-day or non-working Muslim holidays)
   * @param {string} summary - Event title or manual holiday name
   * @return {boolean} True if excluded
   */
  isExcludedName_(summary) {
    if (!summary) return false;
    return [...this._excludedHolidayNames].some(name => summary.includes(name));
  },

  /**
   * Check if a date is a holiday (manual, ICS, Muslim, override/exclusion aware)
   * @param {string} dateStr - YYYY-MM-DD
   * @return {boolean}
   */
  isHoliday(dateStr) {
    if (!dateStr) return false;
    // Admin override: force working day
    if (this._overrideWorkingDays.has(dateStr)) return false;
    const date = DateUtils.parseDate(dateStr);
    if (!date) return false;
    let isPotentialHoliday = false;
    if (!this._initialized) this.initHolidayCalendar();
    // 1. ICS/Google Calendar holidays (excluding excluded names)
    if (this._calendarAvailable) {
      try {
        const events = this._holidayCalendar.getEventsForDay(date);
        if (events.some(e => !this.isExcludedName_(e.getTitle()))) {
          isPotentialHoliday = true;
        }
      } catch (e) {
        this._calendarAvailable = false;
        logTS('HolidayService.isHoliday: ICS calendar error, falling back to manual: ' + e);
      }
    }
    // 2. Manual fixed-date holidays
    if (!isPotentialHoliday) {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      if (this._manualHolidays.some(h => h.month === month && h.day === day)) {
        isPotentialHoliday = true;
      }
    }
    // 3. Muslim holidays (Eid al-Fitr, Eid al-Adha) from ICS/Google Calendar
    if (!isPotentialHoliday && this._calendarAvailable) {
      try {
        const events = this._holidayCalendar.getEventsForDay(date);
        if (events.some(evt => {
          const t = (evt.getTitle() || '').toLowerCase();
          return t.includes('eid') && (t.includes('fitr') || t.includes('adha'));
        })) {
          isPotentialHoliday = true;
        }
      } catch (_) {}
    }
    if (!isPotentialHoliday) return false;
    // Exclusion: if any ICS event on that date matches excluded names, treat as working day
    if (this._calendarAvailable) {
      try {
        const events = this._holidayCalendar.getEventsForDay(date);
        if (events.some(e => this.isExcludedName_(e.getTitle()))) {
          return false;
        }
      } catch (_) {}
    }
    // Exclusion: if manual holiday name is in excluded list, skip it
    const month2 = date.getMonth() + 1;
    const day2 = date.getDate();
    const manual = this._manualHolidays.find(h => h.month === month2 && h.day === day2);
    if (manual && this._excludedHolidayNames.has(manual.name)) {
      return false;
    }
    return true;
  },

  /**
   * Fetch holiday dates within a range and cache them
   * @param {Date} start
   * @param {Date} end
   * @return {Set<string>} Set of holiday date strings in yyyy-MM-dd format
   */
  fetchRange(start, end) {
    this.initHolidayCalendar();
    const startStr = DateUtils.formatYMD(start);
    const endStr = DateUtils.formatYMD(end);
    const cacheKey = `${SCRIPT_VERSION}_holidays_${startStr}_${endStr}`;
    // Check cache first
    const cached = safeCacheGet(cacheKey);
    if (cached) {
      try {
        const dates = JSON.parse(cached);
        logTS(`HolidayService: cache hit for range ${startStr} to ${endStr}`);
        return new Set(dates);
      } catch (e) {
        logTS('HolidayService: cache parse error: ' + e);
      }
    }
    let dates = [];
    // Try CalendarApp first
    if (this._calendarAvailable) {
      try {
        const events = this._holidayCalendar.getEvents(start, end);
        dates = events
          .filter(ev => !this.isExcludedName_(ev.getTitle()))
          .map(ev => DateUtils.formatYMD(ev.getStartTime()));
        logTS(`HolidayService: CalendarApp fetched ${dates.length} holidays`);
      } catch (e) {
        logTS('HolidayService: CalendarApp fetch failed: ' + e);
        this._calendarAvailable = false;
        dates = [];
      }
    }
    // Fallback to manual rules if CalendarApp failed
    if (dates.length === 0) {
      const manualHolidays = [];
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      for (let year = startYear; year <= endYear; year++) {
        this._manualHolidays.forEach(holiday => {
          const holidayDate = DateUtils.buildDate(year, holiday.month, holiday.day);
          if (holidayDate >= start && holidayDate <= end) {
            manualHolidays.push(DateUtils.formatYMD(holidayDate));
          }
        });
      }
      dates = manualHolidays;
      logTS(`HolidayService: Manual rules generated ${dates.length} holidays`);
    }
    // Cache the results
    safeCachePut(cacheKey, JSON.stringify(dates), HOLIDAY_CACHE_TTL);
    return new Set(dates);
  }
};

/**
 * ConfigService: Centralized configuration management using a Configuration sheet.
 * - Reads config from the sheet, auto-replenishes missing/corrupted values from defaults.
 * - Use ConfigService.get('KEY', defaultValue) everywhere.
 */
const ConfigService = {
  CONFIG_SHEET: 'Configuration',
  CACHE_TTL: 300, // seconds
  _cache: {},
  _lastLoad: 0,
  _loadConfig() {
    const now = Date.now();
    if (now - this._lastLoad < this.CACHE_TTL * 1000 && Object.keys(this._cache).length > 0) {
      return this._cache;
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(this.CONFIG_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(this.CONFIG_SHEET);
      sheet.appendRow(['KEY', 'VALUE', 'DEFAULT']);
    }
    const data = sheet.getDataRange().getValues();
    const config = {};
    for (let i = 1; i < data.length; i++) {
      const [key, value, def] = data[i];
      if (key) config[key] = (value !== undefined && value !== '') ? value : def;
    }
    this._cache = config;
    this._lastLoad = now;
    return config;
  },
  get(key, defaultValue) {
    const config = this._loadConfig();
    if (config[key] !== undefined && config[key] !== '') return this._parse(config[key]);
    // If missing/corrupted, auto-replenish from defaultValue
    this.set(key, defaultValue, true);
    return defaultValue;
  },
  set(key, value, isDefault = false) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(this.CONFIG_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(this.CONFIG_SHEET);
      sheet.appendRow(['KEY', 'VALUE', 'DEFAULT']);
    }
    const data = sheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        if (isDefault) {
          sheet.getRange(i + 1, 3).setValue(value);
        } else {
          sheet.getRange(i + 1, 2).setValue(value);
        }
        found = true;
        break;
      }
    }
    if (!found) {
      const row = [key, isDefault ? '' : value, isDefault ? value : ''];
      sheet.appendRow(row);
    }
    this._cache[key] = value;
  },
  _parse(val) {
    if (typeof val === 'string' && /^\d+$/.test(val)) return parseInt(val, 10);
    if (typeof val === 'string' && /^\d+\.\d+$/.test(val)) return parseFloat(val);
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  },
  getRegistry() {
    // ... existing logic ...
    return FORM_REGISTRY;
  }
};

// PHASE 2: MAIN ORCHESTRATOR AND INTEGRATION POINTS
// --------------------------------------------------

/**
 * Main entry point for system setup, validation, and (optional) population/repair.
 * Runs validation, and if requested, runs population/repair. Logs a summary report.
 * @param {string} sheetId - The ID of the Google Sheet to check/setup.
 * @param {Object} [options] - { repair: boolean, repairOnly: boolean }
 *   - repair: if true, will run population/repair after validation
 *   - repairOnly: if true, will only repair (not create missing resources)
 * @return {Object} Summary report
 */
function setupOrValidateSystem(sheetId, options) {
  options = options || {};
  Logger.log('setupOrValidateSystem: Starting validation for sheet ' + sheetId);
  const validationReport = validateResources(sheetId);
  Logger.log('setupOrValidateSystem: Validation report: ' + JSON.stringify(validationReport, null, 2));
  let populationReport = null;
  if (options.repair) {
    Logger.log('setupOrValidateSystem: Running population/repair...');
    modernPopulateResources(sheetId, { repairOnly: !!options.repairOnly, validationReport });
    populationReport = 'Population/repair completed.';
  }
  // SubmissionQueue is no longer used in the new architecture
  const summary = {
    validation: validationReport,
    population: populationReport
  };
  Logger.log('setupOrValidateSystem: Summary: ' + JSON.stringify(summary, null, 2));
  return summary;
}

// PHASE 3: BUSINESS LOGIC, QUEUE, AND SYSTEM FUNCTIONS
// ----------------------------------------------------

// --- Distributed Queue System ---
// Modern FIFO job queue for async/background processing

const DIST_QUEUE_TAB_NAME = 'DistributedQueue_FIFO_v1';
const DLQ_TAB_NAME = 'DistributedQueue_DLQ_v1';

/**
 * Ensures the distributed queue sheet exists and returns it.
 */
function ensureDistributedQueueSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DIST_QUEUE_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DIST_QUEUE_TAB_NAME);
    sheet.appendRow(['id', 'payload', 'enqueuedAt', 'claimedAt', 'claimedBy', 'status']);
  }
  return sheet;
}

/**
 * Enqueue a new job in the distributed queue (agentic job model).
 * @param {Object} job - The job object. Must include taskName and args.
 * @return {string} Job ID
 */
function distributedQueueEnqueue(job) {
  // Validate job structure
  if (!job || typeof job !== 'object' || !job.taskName) {
    throw new Error('Job must have a taskName (matching TASK_REGISTRY)');
  }
  const sheet = ensureDistributedQueueSheet();
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  // Build agentic job payload
  const jobPayload = {
    id,
    taskName: job.taskName,
    args: job.args || {},
    state: job.state || {},
    priority: typeof job.priority === 'number' ? job.priority : 0,
    retries: typeof job.retries === 'number' ? job.retries : 0,
    status: 'PENDING',
    dependenciesResolved: typeof job.dependenciesResolved === 'boolean' ? job.dependenciesResolved : true
  };
  sheet.appendRow([id, JSON.stringify(jobPayload), now, '', '', 'PENDING']);
  return id;
}

/**
 * Atomically claim a job from the distributed queue (agentic job model).
 * @param {string} workerId - Unique worker identifier.
 * @param {number} [claimTimeoutSec=60] - Claim timeout in seconds.
 * @return {Object|null} Claimed job object or null if none available.
 */
function distributedQueueDequeueAtomic(workerId, claimTimeoutSec) {
  claimTimeoutSec = claimTimeoutSec || 60;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000); // Wait up to 5 seconds for the lock
    const sheet = ensureDistributedQueueSheet();
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    for (let i = 1; i < data.length; i++) { // skip header
      const row = data[i];
      const status = row[5];
      const claimedAt = row[3] ? new Date(row[3]) : null;
      let expired = false;
      if (status === 'CLAIMED' && claimedAt) {
        expired = ((now - claimedAt) / 1000) > claimTimeoutSec;
      }
      if (status === 'PENDING' || expired) {
        const rowIdx = i + 1; // 1-based
        const range = sheet.getRange(rowIdx, 6, 1, 1); // status col
        const currentStatus = range.getValue();
        if (currentStatus === status) { // compare-and-swap
          sheet.getRange(rowIdx, 4, 1, 3).setValues([[now.toISOString(), workerId, 'CLAIMED']]);
          // Parse agentic job payload
          let jobPayload;
          try {
            jobPayload = JSON.parse(row[1]);
          } catch (e) {
            // Legacy/old jobs: fallback to old payload
            jobPayload = { id: row[0], legacyPayload: row[1] };
          }
          return {
            ...jobPayload,
            row: rowIdx
          };
        }
      }
    }
    return null;
  } catch (e) {
    Logger.log('distributedQueueDequeueAtomic: Lock acquisition failed or error: ' + e);
    return null;
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Mark a job as completed (delete row from queue).
 * @param {number} rowIdx - 1-based row index to delete.
 */
function distributedQueueComplete(rowIdx) {
  const sheet = ensureDistributedQueueSheet();
  sheet.deleteRow(rowIdx);
}

/**
 * List all jobs in the distributed queue (agentic job model).
 * @return {Array<Object>} List of job objects.
 */
function distributedQueueListAll() {
  const sheet = ensureDistributedQueueSheet();
  const data = sheet.getDataRange().getValues();
  const jobs = [];
  for (let i = 1; i < data.length; i++) {
    let jobPayload;
    try {
      jobPayload = JSON.parse(data[i][1]);
    } catch (e) {
      // Legacy/old jobs: fallback to old payload
      jobPayload = { id: data[i][0], legacyPayload: data[i][1] };
    }
    jobs.push({
      ...jobPayload,
      enqueuedAt: data[i][2],
      claimedAt: data[i][3],
      claimedBy: data[i][4],
      status: data[i][5],
      row: i + 1
    });
  }
  return jobs;
}

/**
 * Enqueue a failed job into the Dead-Letter Queue (DLQ) for manual inspection.
 * @param {Object} job - The original job object that failed.
 * @param {string} reason - The error message or reason for failure.
 */
function deadLetterEnqueue(job, reason) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DLQ_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DLQ_TAB_NAME);
    sheet.appendRow(['FailedAt', 'JobID', 'Reason', 'Payload']);
  }
  const now = new Date().toISOString();
  const payloadStr = typeof job.payload === 'string' ? job.payload : JSON.stringify(job.payload);
  sheet.appendRow([now, job.id, reason, payloadStr]);
  Logger.log(`DLQ: Enqueued failed job ${job.id}. Reason: ${reason}`);
}

// --- Availability Service ---
// Modern, atomic, OCC-protected slot decrementing and integrity checks

const AVAIL_VERSION_COL = 4; // Column D (after Left)
const AVAIL_CHECKSUM_COL = 5; // Column E (after Version)

const AvailabilityService = {
  /**
   * Atomically decrements slots for all categories (forms) for a given date.
   * Uses OCC (version check), idempotency, and rollback on error.
   * Dependency Injection: Accepts an array of availability sheets (one per category) as parameter.
   * Now also accepts a lockManager dependency for testability.
   * @param {Array<Sheet>} sheets - Array of availability sheets (one per form/category)
   * @param {Date} dateObj - The appointment date.
   * @param {TransactionContext?} txn - Optional transaction context for rollback.
   * @param {string?} requestId - Unique idempotency key.
   * @param {Object} lockManager - Dependency-injected lock manager (default: LockContextManager)
   * @return {Array} New slots left for each category.
   */
  decrementSlotAllCategories(sheets, dateObj, txn = null, requestId = null, lockManager = LockContextManager) {
    const dateString = DateUtils.formatYMD(dateObj);
    // Idempotency: Check if already processed
    if (requestId && isAlreadyProcessed(requestId)) {
      Logger.log('Idempotency: Request ' + requestId + ' already processed, skipping.');
      return [];
    }
    // Per-date lock (with global fallback)
    let lockAcquired = lockManager.acquireDateLock(dateString, LOCK_TIMEOUT_MS);
    let globalLock = null;
    if (!lockAcquired && lockManager.FALLBACK_TO_GLOBAL_LOCK) {
      Logger.log('decrementSlotAllCategories: Per-date lock busy, trying global lock for ' + dateString);
      globalLock = lockManager.acquireGlobalLock(LOCK_TIMEOUT_MS);
      lockAcquired = !!globalLock;
    }
    if (!lockAcquired) throw new Error('System busy for this date, please try again.');
    txn = txn || new TransactionContext();
    try {
      const newLeftValues = [];
      for (const sheet of sheets) {
        try {
          const newLeft = AvailabilityService._performGuardedDecrement(sheet, dateObj, txn);
          newLeftValues.push(newLeft);
        } catch (e) {
          Logger.log('decrementSlotAllCategories: Error in sheet: ' + e);
          txn.rollback();
          throw e;
        }
      }
      if (requestId) markProcessed(requestId);
      return newLeftValues;
    } catch (err) {
      txn.rollback();
      throw err;
    } finally {
      if (globalLock) {
        globalLock.releaseLock();
      } else {
        lockManager.releaseDateLock(dateString);
      }
    }
  },

  /**
   * Atomically decrements a slot for a given row in the availability sheet.
   * Optimized: single read and single write for the row.
   * @param {Sheet} sheet
   * @param {number} rowIdx
   * @param {TransactionContext?} txn
   * @returns {number} slots left after decrement
   */
  _performGuardedDecrement(sheet, rowIdx, txn) {
    const rowRange = sheet.getRange(rowIdx, 1, 1, AVAIL_CHECKSUM_COL);
    const rowValues = rowRange.getValues()[0];
    const [date, booked, left, version] = rowValues;
    if (left <= 0) throw new Error('No slots left for ' + date);
    if (txn) txn.track(sheet, rowIdx, rowValues.slice());
    rowValues[1] = booked + 1;
    rowValues[2] = left - 1;
    rowValues[3] = (version || 1) + 1;
    rowValues[4] = computeRowChecksum(rowValues);
    rowRange.setValues([rowValues]);
    return rowValues[2];
  },

  /**
   * Ensures all business days in the next FUTURE_DAYS have rows in all Availability_* sheets.
   * Skips weekends and holidays. Safe to run nightly or on demand.
   */
  seedAvailabilityWindow() {
    for (const entry of ConfigService.getRegistry()) {
      try {
        const sheet = getSpreadsheet(entry).getSheetByName(entry.availabilitySheetName);
        if (!sheet) continue;
        ensureVersionColumn(sheet);
        ensureChecksumColumn(sheet);
        const existingDates = new Set();
        const lastRow = sheet.getLastRow();
        for (let i = 2; i <= lastRow; i++) {
          const dateStr = sheet.getRange(i, 1).getValue();
          if (typeof dateStr === 'string' && dateStr.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
            existingDates.add(dateStr);
          }
        }
        const futureDays = ConfigService.get('FUTURE_DAYS', 60);
        let current = new Date();
        for (let d = 0; d < futureDays; d++) {
          const dateStr = DateUtils.formatYMD(current);
          if (
            !DateUtils.isWeekend(current) &&
            !HolidayService.isHoliday(dateStr) &&
            !existingDates.has(dateStr)
          ) {
            const newRowData = [dateStr, 0, ConfigService.get('SLOT_CAP', 20), 1, ''];
            sheet.appendRow(newRowData);
            updateRowChecksum(sheet, sheet.getLastRow());
          }
          current.setDate(current.getDate() + 1);
        }
      } catch (e) {
        Logger.log('seedAvailabilityWindow: Error for ' + entry.availabilitySheetName + ': ' + e);
      }
    }
  }
};

/**
 * Ensures the version column exists in the sheet.
 */
function ensureVersionColumn(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.length < AVAIL_VERSION_COL || headers[AVAIL_VERSION_COL - 1] !== 'Version') {
    sheet.insertColumnAfter(AVAIL_LEFT_COL);
    sheet.getRange(1, AVAIL_VERSION_COL).setValue('Version');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      for (let i = 2; i <= lastRow; i++) {
        sheet.getRange(i, AVAIL_VERSION_COL).setValue(1);
      }
    }
  }
}

/**
 * Ensures the checksum column exists in the sheet.
 */
function ensureChecksumColumn(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.length < AVAIL_CHECKSUM_COL || headers[AVAIL_CHECKSUM_COL - 1] !== 'Checksum') {
    sheet.insertColumnAfter(AVAIL_VERSION_COL);
    sheet.getRange(1, AVAIL_CHECKSUM_COL).setValue('Checksum');
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      for (let i = 2; i <= lastRow; i++) {
        updateRowChecksum(sheet, i);
      }
    }
  }
}

/**
 * Computes a checksum for a row (date, booked, left, version).
 */
function computeRowChecksum(row) {
  const data = [row[0], row[1], row[2], row[3]].join('|');
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data));
}

/**
 * Updates the checksum for a given row in the sheet.
 */
function updateRowChecksum(sheet, rowIdx) {
  const row = sheet.getRange(rowIdx, 1, 1, AVAIL_CHECKSUM_COL - 1).getValues()[0];
  const checksum = computeRowChecksum(row);
  sheet.getRange(rowIdx, AVAIL_CHECKSUM_COL).setValue(checksum);
}

/**
 * Updates all checksums in a sheet.
 */
function updateAllChecksums(sheet) {
  const lastRow = sheet.getLastRow();
  for (let i = 2; i <= lastRow; i++) {
    updateRowChecksum(sheet, i);
  }
}

/**
 * Validates a row for integrity: date, slot counts, version, checksum.
 * Returns {valid, errors}.
 */
function validateRow(sheet, rowIdx) {
  const row = sheet.getRange(rowIdx, 1, 1, AVAIL_CHECKSUM_COL).getValues()[0];
  const dateStr = row[0];
  const booked = row[1];
  const left = row[2];
  const version = row[3];
  const checksum = row[4];
  let valid = true;
  let errors = [];
  if (!/\d{4}-\d{2}-\d{2}/.test(dateStr) || !DateUtils.parseDate(dateStr)) {
    valid = false;
    errors.push('Invalid date');
  }
  if (typeof booked !== 'number' || booked < 0 || typeof left !== 'number' || left < 0) {
    valid = false;
    errors.push('Invalid slot counts');
  }
  if (typeof version !== 'number' || version < 1) {
    valid = false;
    errors.push('Invalid version');
  }
  if (checksum !== computeRowChecksum(row)) {
    valid = false;
    errors.push('Checksum mismatch');
  }
  return { valid, errors };
}

// --- Transaction and Locking Utilities ---
// Modern concurrency control, rollback, and worker lease management

const PER_DATE_LOCK_TIMEOUT_MS = 5000;
const FALLBACK_TO_GLOBAL_LOCK = true;

const LockContextManager = {
  acquireDateLock(dateStr, timeoutMs = PER_DATE_LOCK_TIMEOUT_MS) {
    const cache = CacheService.getScriptCache();
    const lockKey = 'lock_' + dateStr;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (cache.get(lockKey) === null) {
        cache.put(lockKey, '1', Math.ceil(timeoutMs / 1000));
        return true;
      }
      Utilities.sleep(100);
    }
    return false;
  },
  releaseDateLock(dateStr) {
    const cache = CacheService.getScriptCache();
    cache.remove('lock_' + dateStr);
  },
  acquireGlobalLock(timeoutMs = LOCK_TIMEOUT_MS) {
    const lock = LockService.getScriptLock();
    if (lock.tryLock(timeoutMs)) return lock;
    return null;
  },
  FALLBACK_TO_GLOBAL_LOCK
};

/**
 * TransactionContext: Tracks changes for rollback on error.
 */
function TransactionContext() {
  this.changes = [];
}
TransactionContext.prototype.track = function(sheet, rowIdx, oldValues) {
  this.changes.push({ sheet, rowIdx, oldValues });
};
TransactionContext.prototype.rollback = function() {
  for (const change of this.changes) {
    change.sheet.getRange(change.rowIdx, 1, 1, change.oldValues.length).setValues([change.oldValues]);
  }
  this.changes = [];
};

const WorkerLeaseManager = {
  LEASE_KEY: 'worker_lease_lock',
  LEASE_DURATION_SEC: 120, // 2 minutes lease duration
  LEASE_RETRY_MS: 100,
  MAX_RETRY_MS: 5000,

  /**
   * Attempts to acquire a worker lease.
   * @param {string} workerId - Unique identifier for this worker
   * @return {boolean} True if lease acquired, false otherwise
   */
  acquireLease(workerId) {
    const cache = CacheService.getScriptCache();
    const startTime = Date.now();
    while (Date.now() - startTime < this.MAX_RETRY_MS) {
      const currentLease = cache.get(this.LEASE_KEY);
      if (!currentLease) {
        // No active lease, try to acquire
        const leaseData = {
          workerId: workerId,
          acquiredAt: Date.now(),
          expiresAt: Date.now() + (this.LEASE_DURATION_SEC * 1000)
        };
        const success = cache.put(this.LEASE_KEY, JSON.stringify(leaseData), this.LEASE_DURATION_SEC);
        if (success) {
          Logger.log(`WorkerLeaseManager: Lease acquired by ${workerId}`);
          return true;
        }
      } else {
        // Check if existing lease is expired
        try {
          const leaseData = JSON.parse(currentLease);
          if (Date.now() > leaseData.expiresAt) {
            // Lease expired, remove it and try again
            cache.remove(this.LEASE_KEY);
            continue;
          }
        } catch (e) {
          // Invalid lease data, remove it
          cache.remove(this.LEASE_KEY);
          continue;
        }
      }
      Utilities.sleep(this.LEASE_RETRY_MS);
    }
    Logger.log(`WorkerLeaseManager: Failed to acquire lease for ${workerId} after ${this.MAX_RETRY_MS}ms`);
    return false;
  },

  /**
   * Releases the worker lease.
   * @param {string} workerId - Worker ID that holds the lease
   */
  releaseLease(workerId) {
    const cache = CacheService.getScriptCache();
    const currentLease = cache.get(this.LEASE_KEY);
    if (currentLease) {
      try {
        const leaseData = JSON.parse(currentLease);
        if (leaseData.workerId === workerId) {
          cache.remove(this.LEASE_KEY);
          Logger.log(`WorkerLeaseManager: Lease released by ${workerId}`);
        } else {
          Logger.log(`WorkerLeaseManager: Lease not released - owned by ${leaseData.workerId}, not ${workerId}`);
        }
      } catch (e) {
        // Invalid lease data, remove it anyway
        cache.remove(this.LEASE_KEY);
        Logger.log(`WorkerLeaseManager: Removed invalid lease data`);
      }
    }
  },

  /**
   * Checks if a lease is currently active.
   * @return {Object|null} Lease data if active, null otherwise
   */
  getCurrentLease() {
    const cache = CacheService.getScriptCache();
    const currentLease = cache.get(this.LEASE_KEY);
    if (!currentLease) return null;
    try {
      const leaseData = JSON.parse(currentLease);
      if (Date.now() > leaseData.expiresAt) {
        // Lease expired, remove it
        cache.remove(this.LEASE_KEY);
        return null;
      }
      return leaseData;
    } catch (e) {
      // Invalid lease data, remove it
      cache.remove(this.LEASE_KEY);
      return null;
    }
  },

  /**
   * Force releases any existing lease (emergency cleanup).
   */
  forceReleaseLease() {
    const cache = CacheService.getScriptCache();
    cache.remove(this.LEASE_KEY);
    Logger.log('WorkerLeaseManager: Force released lease');
  }
};

// --- Date and Utility Helpers ---
// Modern date formatting, parsing, and safe spreadsheet access

/**
 * getSpreadsheet: Safe, cached spreadsheet access for registry entries.
 * @param {Object} registryEntry - The form registry entry with spreadsheetId
 * @return {Spreadsheet} The Spreadsheet instance
 */
function getSpreadsheet(registryEntry) {
  if (!registryEntry || typeof registryEntry.spreadsheetId !== 'string') {
    throw new Error('Invalid registryEntry');
  }
  if (!_ssCache[registryEntry.spreadsheetId]) {
    _ssCache[registryEntry.spreadsheetId] = SpreadsheetApp.openById(registryEntry.spreadsheetId);
  }
  return _ssCache[registryEntry.spreadsheetId];
}

/**
 * DateUtils: Modern date formatting and parsing helpers.
 */
const DateUtils = {
  formatYMD(date) {
    if (!(date instanceof Date)) throw new Error('formatYMD: not a Date');
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  },
  parseDate(str) {
    if (!str || typeof str !== 'string') return null;
    const m = str.match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(str.slice(0, 4)), Number(str.slice(5, 7)) - 1, Number(str.slice(8, 10)));
    return isNaN(d.getTime()) ? null : d;
  },
  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }
};

/**
 * logTS: Timestamped logger for debugging (stub).
 * @param {string} msg - The message to log
 */
function logTS(msg) {
  Logger.log(`[${new Date().toISOString()}] ${msg}`);
}

/**
 * safeCacheGet: Safe cache getter (stub).
 * @param {string} key - The cache key
 * @return {string|null} The cached value or null
 */
function safeCacheGet(key) {
  try {
    return CACHE.get(key);
  } catch (e) {
    Logger.log('safeCacheGet: Error: ' + e);
    return null;
  }
}

/**
 * safeCachePut: Safe cache setter (stub).
 * @param {string} key - The cache key
 * @param {string} value - The value to store
 * @param {number} ttl - Time to live in seconds
 */
function safeCachePut(key, value, ttl) {
  try {
    CACHE.put(key, value, ttl);
  } catch (e) {
    Logger.log('safeCachePut: Error: ' + e);
  }
}

// --- Other System Functions ---
// (To be migrated: auditAvailabilitySheets, rebuildSlotCounters, rebuildAllFormDropdowns, rebuildAppointmentEventsAllForms, generateUnifiedAppointmentList, etc.)
// These functions handle system-wide rebuilds, audits, and unified reporting.

/**
 * Audits all availability sheets for integrity and auto-corrects checksums if needed.
 */
function auditAvailabilitySheets() {
  Logger.log('auditAvailabilitySheets: start');
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet(entry).getSheetByName(entry.availabilitySheetName);
      if (!sheet) continue;
      ensureVersionColumn(sheet);
      ensureChecksumColumn(sheet);
      const lastRow = sheet.getLastRow();
      let issues = 0;
      for (let i = 2; i <= lastRow; i++) {
        const { valid, errors } = validateRow(sheet, i);
        if (!valid) {
          issues++;
          Logger.log(`auditAvailabilitySheets: Issue in ${entry.availabilitySheetName} row ${i}: ${errors.join(', ')}`);
          // Auto-correct checksum only
          if (errors.includes('Checksum mismatch')) {
            updateRowChecksum(sheet, i);
            Logger.log(`auditAvailabilitySheets: Auto-corrected checksum for row ${i}`);
          }
        }
      }
      Logger.log(`auditAvailabilitySheets: ${entry.availabilitySheetName} - ${issues} issues found`);
    } catch (e) {
      Logger.log('auditAvailabilitySheets: Error auditing ' + entry.availabilitySheetName + ': ' + e);
    }
  }
  Logger.log('auditAvailabilitySheets: end');
}

/**
 * Utility: Run a batch job with trigger-based continuation using ContinuationManager.
 * @param {Object} options - { taskName, batchFn, doneFn, batchSize, softTimeLimitMs, startRowKey, sheet, getLastRowFn, continuationFnName }
 * @param {Object} [e] - Optional Apps Script event object (for trigger continuation)
 */
function runBatchJobWithContinuation(options, e) {
  const taskName = options.taskName;
  let state = e && e.state ? e.state : ContinuationManager.loadState(taskName, {});
  const startTime = Date.now();
  const softTimeLimit = options.softTimeLimitMs || 5 * 60 * 1000;
  // Use dynamic batch size unless explicitly overridden in state or options
  let batchSize = state.batchSize;
  if (!batchSize) {
    batchSize = ContinuationManager.getDynamicBatchSize(
      taskName,
      options.batchSize || 500,
      options.apiLimit
    );
    state.batchSize = batchSize;
  }
  let lastProcessed = state[options.startRowKey] || 2;
  const lastRow = options.getLastRowFn(options.sheet);
  state.startTime = state.startTime || startTime;
  state.rowsProcessedThisRun = state.rowsProcessedThisRun || 0;
  state.apiCalls = state.apiCalls || 0;
  while (lastProcessed <= lastRow) {
    const numRows = Math.min(batchSize, lastRow - lastProcessed + 1);
    const rows = options.sheet.getRange(lastProcessed, 1, numRows, options.sheet.getLastColumn()).getValues();
    options.batchFn(state, rows, lastProcessed);
    lastProcessed += numRows;
    state[options.startRowKey] = lastProcessed;
    state.rowsProcessedThisRun += rows.length;
    if (!ContinuationManager.shouldContinue(startTime, softTimeLimit)) {
      ContinuationManager.saveState(taskName, state);
      ContinuationManager.saveAndContinue(taskName, state, options.continuationFnName);
      return;
    }
  }
  if (options.doneFn) options.doneFn(state);
  ContinuationManager.finish(taskName, options.continuationFnName, state);
}

// Refactor rebuildSlotCounters to use ContinuationManager
function rebuildSlotCounters(e) {
  for (const entry of ConfigService.getRegistry()) {
    try {
      const sheet = getSpreadsheet(entry).getSheetByName(entry.availabilitySheetName);
      if (!sheet) continue;
      const taskName = 'BATCH_CONTINUATION_STATE_rebuildSlotCounters_' + entry.availabilitySheetName;
      let state = e && e.state ? e.state : ContinuationManager.loadState(taskName, {});
      if (!state.reset) {
        const lastRow = sheet.getLastRow();
        for (let i = 2; i <= lastRow; i++) {
          sheet.getRange(i, 2, 1, 2).setValues([[0, ConfigService.get('SLOT_CAP', 20)]]);
        }
        state.reset = true;
      }
      runBatchJobWithContinuation({
        taskName,
        continuationFnName: 'rebuildSlotCounters',
        batchFn: (state, rows) => {
          // Optimization: Use a map to avoid looping the availability sheet every time.
          // The map is built once per continuation run.
          if (!state.availabilityMap) {
            const availData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
            state.availabilityMap = availData.reduce((acc, [date, booked, left], index) => {
              if (date) acc[date] = { row: index + 2, booked, left }; // Store 1-based row index and values
              return acc;
            }, {});
          }

          for (let i = 0; i < rows.length; i++) {
            const dateChoice = rows[i][RESP_DATE_COL - 1];
            if (!dateChoice) continue;
            const dateStr = typeof dateChoice === 'string' ? dateChoice.split(' ')[0] : '';

            const availEntry = state.availabilityMap[dateStr];
            if (availEntry) {
              availEntry.booked++;
              availEntry.left--;
            } else {
              // This part for creating a new row if date not found remains the same.
              const newRow = sheet.getLastRow() + 1;
              sheet.getRange(newRow, 1, 1, 3).setValues([[dateStr, 1, ConfigService.get('SLOT_CAP', 20) - 1]]);
              state.availabilityMap[dateStr] = { row: newRow, booked: 1, left: ConfigService.get('SLOT_CAP', 20) - 1 };
            }
            state.apiCalls = (state.apiCalls || 0) + 2; // Example: 2 API calls per row
          }
        },
        doneFn: (state) => {
          // Write back the updated counts in a single batch operation
          const updatedData = Object.values(state.availabilityMap).map(entry => [entry.booked, entry.left]);
          const startRow = 2; // Assuming data starts at row 2
          if (updatedData.length > 0) {
            sheet.getRange(startRow, AVAIL_BOOKED_COL, updatedData.length, 2).setValues(updatedData);
          }
          updateAllChecksums(sheet);
        },
        batchSize: state.batchSize || ConfigService.get('CHUNK_SIZE', 500),
        softTimeLimitMs: 5 * 60 * 1000,
        startRowKey: 'lastRow',
        sheet: getSpreadsheet(entry).getSheetByName(entry.sheetName),
        getLastRowFn: s => s.getLastRow()
      }, e);
    } catch (e) {
      Logger.log('rebuildSlotCounters: Error for ' + entry.availabilitySheetName + ': ' + e);
    }
  }
}


/**
 * Rebuilds the date dropdown for all forms from scratch based on latest availability.
 * Shows slot availability in the dropdown label for each date.
 */
function rebuildAllFormDropdowns() {
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet(entry).getSheetByName(entry.availabilitySheetName);
      if (!sheet) continue;
      const lastRow = sheet.getLastRow();
      const dateLabels = [];
      for (let i = 2; i <= lastRow; i++) {
        const row = sheet.getRange(i, 1, 1, 3).getValues()[0];
        const dateStr = row[0];
        const slotsLeft = row[2];
        if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/) && slotsLeft > 0) {
          dateLabels.push(`${dateStr} (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)`);
        }
      }
      dateLabels.sort();
      const form = FormApp.openById(entry.formId);
      const items = form.getItems(FormApp.ItemType.LIST);
      for (const item of items) {
        const title = item.getTitle();
        if (title.toLowerCase().includes('date')) {
          const list = item.asListItem();
          list.setChoiceValues(dateLabels);
        }
      }
    } catch (e) {
      Logger.log('rebuildAllFormDropdowns: Error for ' + entry.formId + ': ' + e);
    }
  }
}


// === Unified List Block Layout Configuration ===
const UNIFIED_LIST_BLOCK_ROWS = 23; // Total rows per date block (including header)
const UNIFIED_LIST_VIEW_COLS = 4;   // Number of columns per block
const UNIFIED_LIST_TITLE = 'Unified Appointment List';
const UNIFIED_LIST_HEADERS = ['Form', 'Full Name', 'Purok, Barangay', 'Reason/Status'];

/**
 * Generates a unified appointment list from all forms, deduplicated and validated, in a modern block layout.
 * The layout is configurable and staff-friendly, with clear date blocks and headers.
 */
function generateUnifiedAppointmentList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(UNIFIED_LIST_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(UNIFIED_LIST_SHEET);
  }
  // Clear only the main view columns
  sheet.getRange(1, 1, sheet.getMaxRows(), UNIFIED_LIST_VIEW_COLS).clearContent();

  let rowPtr = 1;
  // Write title
  sheet.getRange(rowPtr, 1).setValue(UNIFIED_LIST_TITLE);
  sheet.getRange(rowPtr, 1).setFontWeight('bold').setFontSize(14);
  rowPtr++;

  // Build the unified list (array of objects)
  const unifiedList = buildUnifiedBlockList();
  const grouped = groupByDateBlock(unifiedList);

  // Write each date block
  for (const [dateKey, appointments] of grouped) {
    renderUnifiedDateBlock(sheet, dateKey, appointments, rowPtr);
    rowPtr += UNIFIED_LIST_BLOCK_ROWS;
  }

  // Freeze panes at Row 2
  sheet.setFrozenRows(2);

  // Apply bold+bg for date rows (every block start row)
  let dateRowPtr = 2;
  for (const [dateKey] of grouped) {
    sheet.getRange(dateRowPtr, 1, 1, UNIFIED_LIST_VIEW_COLS)
      .setBackground('#e6f3ff')
      .setFontWeight('bold');
    dateRowPtr += UNIFIED_LIST_BLOCK_ROWS;
  }
}

/**
 * Builds the unified appointment list as an array of objects for block layout.
 * @return {Array<Object>} Array of appointment objects.
 */
function buildUnifiedBlockList() {
  const rows = [];
  const seen = new Set();
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet(entry).getSheetByName(entry.sheetName);
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) { // skip header
        const [timestamp, lastName, firstName, purok, barangay, dateChoice, reason] = data[i];
        if (!timestamp || !dateChoice) continue;
        const dateStr = typeof dateChoice === 'string' ? dateChoice.split(' ')[0] : '';
        const rowId = entry.formId + '_' + i;
        if (seen.has(rowId)) continue;
        seen.add(rowId);
        const dateObj = DateUtils.parseDate(dateStr);
        if (!dateObj) continue;
        const status = dateObj >= new Date() ? 'Upcoming' : 'Past';
        rows.push({
          form: entry.sheetName,
          name: `${lastName || ''}, ${firstName || ''}`.trim(),
          purokBarangay: `${purok || ''}, ${barangay || ''}`.trim(),
          reason: reason || '',
          dateKey: dateStr,
          status,
        });
      }
    } catch (e) {
      Logger.log('buildUnifiedBlockList: Error for ' + entry.sheetName + ': ' + e);
    }
  }
  // Sort by date, then name
  rows.sort((a, b) => {
    const dA = DateUtils.parseDate(a.dateKey);
    const dB = DateUtils.parseDate(b.dateKey);
    if (dA && dB) return dA - dB || a.name.localeCompare(b.name);
    return 0;
  });
  return rows;
}

/**
 * Groups appointments by date for block layout.
 * @param {Array<Object>} appts
 * @return {Map<string, Array<Object>>}
 */
function groupByDateBlock(appts) {
  const grouped = new Map();
  const dateWindow = getDateWindow_();
  for (const dateKey of dateWindow) {
    grouped.set(dateKey, []);
  }
  for (const appt of appts) {
    if (grouped.has(appt.dateKey)) {
      grouped.get(appt.dateKey).push(appt);
    }
  }
  // Sort within each date by name
  for (const [dateKey, appointments] of grouped) {
    appointments.sort((a, b) => a.name.localeCompare(b.name));
  }
  return grouped;
}

/**
 * Renders a single date block (23 rows) in the sheet.
 * @param {Sheet} sheet
 * @param {string} dateKey
 * @param {Array<Object>} appointments
 * @param {number} startRow
 */
function renderUnifiedDateBlock(sheet, dateKey, appointments, startRow) {
  let rowPtr = startRow;
  // Merge A:D for date row and center with bold formatting
  sheet.getRange(rowPtr, 1, 1, UNIFIED_LIST_VIEW_COLS).merge().setValue(dateKey);
  sheet.getRange(rowPtr, 1).setHorizontalAlignment('center').setFontWeight('bold');
  rowPtr++;
  // Write headers
  sheet.getRange(rowPtr, 1, 1, UNIFIED_LIST_VIEW_COLS).setValues([UNIFIED_LIST_HEADERS]);
  rowPtr++;
  // Write up to SLOT_CAP appointments
  const appointmentsToWrite = appointments.slice(0, ConfigService.get('SLOT_CAP', 20));
  for (const appt of appointmentsToWrite) {
    const rowData = [
      appt.form,
      appt.name,
      appt.purokBarangay,
      appt.reason || appt.status || ''
    ];
    sheet.getRange(rowPtr, 1, 1, UNIFIED_LIST_VIEW_COLS).setValues([rowData]);
    rowPtr++;
  }
  // Pad blank rows until block size
  padUnifiedBlankRows(sheet, rowPtr, startRow + UNIFIED_LIST_BLOCK_ROWS - 1);
}

/**
 * Pads blank rows in the current block.
 * @param {Sheet} sheet
 * @param {number} currentRow
 * @param {number} endRow
 */
function padUnifiedBlankRows(sheet, currentRow, endRow) {
  if (currentRow <= endRow) {
    const blankRowsNeeded = endRow - currentRow + 1;
    const blankData = Array(blankRowsNeeded).fill(['', '', '', '']);
    sheet.getRange(currentRow, 1, blankRowsNeeded, UNIFIED_LIST_VIEW_COLS).setValues(blankData);
  }
}

/**
 * Modern async job handler for UNIFIED_LIST_UPDATE jobs.
 * @param {Object} payload
 */
function processUnifiedListUpdateJob(payload) {
  try {
    generateUnifiedAppointmentList();
  } catch (e) {
    Logger.log('processUnifiedListUpdateJob: Error: ' + e);
  }
}

// PHASE 4: MONITORING, TRIGGERS, AND UTILITIES
// --------------------------------------------

// --- Monitoring and Diagnostics ---
// (To be migrated: ConcurrencyMonitor, productionSystemDiagnostics, monitorFreeTierSystem, checkQueueStatus, checkExecutionTimeBudget, etc.)
// These functions provide system health checks, diagnostics, and performance logging.

/**
 * ConcurrencyMonitor: Tracks queue depth, lock wait times, and job processing metrics.
 */
const CONCURRENCY_MONITOR_SHEET = 'ConcurrencyMonitor';
const LOCK_WAIT_WARN_MS = 10000;
const QUEUE_DEPTH_WARN = 50;

const ConcurrencyMonitor = {
  logLockWait(lockType, dateStr, waitMs) {
    if (waitMs > LOCK_WAIT_WARN_MS) {
      Logger.log(`[WARN] Lock wait for ${lockType} (${dateStr || ''}) exceeded ${LOCK_WAIT_WARN_MS}ms: ${waitMs}ms`);
    }
    this._logMetric('lock_wait', { lockType, dateStr, waitMs });
  },
  logQueueDepth(depth) {
    if (depth > QUEUE_DEPTH_WARN) {
      Logger.log(`[WARN] Queue depth exceeded ${QUEUE_DEPTH_WARN}: ${depth}`);
    }
    this._logMetric('queue_depth', { depth });
  },
  logTaskProcessing(taskType, ms) {
    this._logMetric('task_processing', { taskType, ms });
  },
  _logMetric(type, data) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName(CONCURRENCY_MONITOR_SHEET);
      if (!sheet) {
        sheet = ss.insertSheet(CONCURRENCY_MONITOR_SHEET);
        sheet.appendRow(['timestamp', 'type', 'data']);
      }
      sheet.appendRow([new Date().toISOString(), type, JSON.stringify(data)]);
    } catch (e) {
      Logger.log('ConcurrencyMonitor: ' + type + ' ' + JSON.stringify(data));
    }
  }
};

/**
 * Production-grade system monitoring and diagnostics.
 * Returns a comprehensive diagnostics object and logs results.
 */
function productionSystemDiagnostics() {
  Logger.log('productionSystemDiagnostics: Starting comprehensive system check');
  const diagnostics = {
    timestamp: new Date().toISOString(),
    system: 'Sogod Waterworks Appointment System',
    version: SCRIPT_VERSION,
    status: 'OK'
  };
  try {
    // 1. Worker lease status
    const currentLease = WorkerLeaseManager.getCurrentLease();
    diagnostics.workerLease = {
      active: !!currentLease,
      workerId: currentLease ? currentLease.workerId : null,
      expiresAt: currentLease ? new Date(currentLease.expiresAt).toISOString() : null,
      status: currentLease ? 'ACTIVE' : 'AVAILABLE'
    };
    // 2. Queue status
    const queueStatus = checkQueueStatus();
    diagnostics.queue = queueStatus;
    // 3. Calendar quota status
    const quotaStats = CalendarQuotaManager.getQuotaStats();
    diagnostics.calendarQuota = quotaStats;
    // 4. Execution time budget
    const executionBudget = checkExecutionTimeBudget();
    diagnostics.executionBudget = executionBudget;
    // 5. Trigger status
    const triggers = FreeTierTriggerManager.listAllTriggers();
    diagnostics.triggers = {
      count: triggers.length,
      limit: 20,
      utilization: Math.round((triggers.length / 20) * 100),
      status: triggers.length < 15 ? 'OK' : 'WARNING'
    };
    // 6. System health assessment
    const healthIssues = [];
    if (queueStatus.pendingJobs > 50) healthIssues.push('High queue backlog');
    if (queueStatus.failedJobs > 10) healthIssues.push('High failure rate');
    if (quotaStats.dailyCalls > 8000) healthIssues.push('Calendar quota high');
    if (executionBudget.percentageUsed > 80) healthIssues.push('Execution time high');
    if (currentLease && Date.now() > currentLease.expiresAt) healthIssues.push('Stuck worker lease');
    diagnostics.healthIssues = healthIssues;
    diagnostics.status = healthIssues.length > 0 ? 'WARNING' : 'OK';
    // 7. Performance metrics
    diagnostics.performance = {
      queueProcessingRate: queueStatus.pendingJobs > 0 ? 'ACTIVE' : 'IDLE',
      workerActivity: currentLease ? 'ACTIVE' : 'IDLE',
      systemLoad: executionBudget.percentageUsed + '%'
    };
    Logger.log('productionSystemDiagnostics: Completed successfully');
    Logger.log('Diagnostics: ' + JSON.stringify(diagnostics, null, 2));
    return diagnostics;
  } catch (e) {
    Logger.log('productionSystemDiagnostics: Error during diagnostics: ' + e);
    diagnostics.status = 'ERROR';
    diagnostics.error = e.toString();
    return diagnostics;
  }
}

// --- Trigger Management ---
// (To be migrated: FreeTierTriggerManager, setupFreeTierSystem, testFreeTierSystem, emergencyFreeTierCleanup, retryFailedJobs, forceReleaseWorkerLeases, etc.)
// These functions manage Apps Script triggers, setup, and emergency operations.

/**
 * FreeTierTriggerManager: Manages all triggers for free-tier deployment.
 * Provides setup, listing, and cleanup of triggers to stay within quota.
 */
const FreeTierTriggerManager = {
  /**
   * Sets up minimal, efficient triggers for free tier.
   * Uses only 8-9 triggers total to stay well under 20 limit.
   */
  setupFreeTierTriggers() {
    Logger.log('FreeTierTriggerManager: Setting up free-tier optimized triggers');
    try {
      // 1. Form submit triggers (one per form)
      this.setupFormTriggers();
      // 2. Async job worker trigger
      this.setupAsyncJobWorkerTrigger();
      // 3. Daily maintenance trigger
      this.setupDailyMaintenanceTrigger();
      Logger.log('FreeTierTriggerManager: Successfully set up triggers (well under 20 limit)');
    } catch (e) {
      Logger.log('FreeTierTriggerManager: Error setting up triggers: ' + e);
      throw e;
    }
  },
  /**
   * Sets up form submit triggers for all forms in registry.
   */
  setupFormTriggers() {
    for (const entry of FORM_REGISTRY) {
      try {
        const form = FormApp.openById(entry.formId);
        if (!this.hasTrigger('onFormSubmit', ScriptApp.EventType.ON_FORM_SUBMIT, form.getId())) {
          ScriptApp.newTrigger('onFormSubmit')
            .forForm(form)
            .onFormSubmit()
            .create();
          Logger.log(`FreeTierTriggerManager: Created form trigger for ${entry.sheetName}`);
        }
      } catch (e) {
        Logger.log(`FreeTierTriggerManager: Error creating form trigger for ${entry.formId}: ${e}`);
      }
    }
  },


  /**
   * Sets up daily maintenance trigger that combines multiple functions.
   * Runs at 2 AM to avoid conflicts with business hours.
   */
  setupDailyMaintenanceTrigger() {
    if (!this.hasTrigger('dailyMaintenanceRoutine', ScriptApp.EventType.CLOCK)) {
      ScriptApp.newTrigger('dailyMaintenanceRoutine')
        .timeBased()
        .everyDays(1)
        .atHour(2)
        .create();
      Logger.log('FreeTierTriggerManager: Created daily maintenance trigger (2 AM)');
    }
  },
  /**
   * Checks if a trigger already exists.
   */
  hasTrigger(handlerFunction, eventType, sourceId = null) {
    const triggers = ScriptApp.getProjectTriggers();
    return triggers.some(trigger => {
      const matches = trigger.getHandlerFunction() === handlerFunction && 
                     trigger.getEventType() === eventType;
      if (sourceId) {
        return matches && trigger.getTriggerSourceId() === sourceId;
      }
      return matches;
    });
  },
  /**
   * Lists all current triggers for monitoring.
   */
  listAllTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    const triggerList = triggers.map(trigger => ({
      handler: trigger.getHandlerFunction(),
      eventType: trigger.getEventType().toString(),
      sourceId: trigger.getTriggerSourceId(),
      uniqueId: trigger.getUniqueId()
    }));
    Logger.log('FreeTierTriggerManager: Current triggers: ' + JSON.stringify(triggerList, null, 2));
    return triggerList;
  },
  /**
   * Removes all triggers (for cleanup).
   */
  removeAllTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      try {
        ScriptApp.deleteTrigger(trigger);
        Logger.log(`FreeTierTriggerManager: Deleted trigger ${trigger.getHandlerFunction()}`);
      } catch (e) {
        Logger.log(`FreeTierTriggerManager: Error deleting trigger: ${e}`);
      }
    });
  }
};

/**
 * Sets up the free-tier system: triggers, quota, and unified list.
 */
function setupFreeTierSystem() {
  Logger.log('setupFreeTierSystem: Starting free-tier system setup');
  try {
    FreeTierTriggerManager.setupFreeTierTriggers();
    CalendarQuotaManager.initRun();
    generateUnifiedAppointmentList();
    FreeTierTriggerManager.listAllTriggers();
    // Add daily health digest trigger if not present
    const triggers = ScriptApp.getProjectTriggers();
    const hasDigest = triggers.some(t => t.getHandlerFunction() === 'sendSystemHealthDigest');
    if (!hasDigest) {
      ScriptApp.newTrigger('sendSystemHealthDigest')
        .timeBased()
        .everyDays(1)
        .atHour(7)
        .create();
      Logger.log('setupFreeTierSystem: Created daily system health digest trigger (7 AM)');
    }
    Logger.log('setupFreeTierSystem: Free-tier system setup completed successfully');
  } catch (e) {
    Logger.log('setupFreeTierSystem: Error during setup: ' + e);
    throw e;
  }
}

/**
 * Daily maintenance routine that combines multiple functions to save triggers.
 * Runs at 2 AM to avoid business hours.
 */
function dailyMaintenanceRoutine() {
  try {
    distributedQueueEnqueue({
      taskName: RUN_DAILY_MAINTENANCE,
      args: {},
      priority: 50 // Medium-high priority
    });
  } catch (err) {
    ErrorService.sendThrottledError('dailyMaintenanceRoutine', err);
  }
}

/**
 * Handler for RUN_DAILY_MAINTENANCE jobs. Enqueues sub-tasks as jobs.
 */
function runDailyMaintenanceJob(args) {
  try {
    // Enqueue sub-tasks as jobs (no dependencies for now, can be extended)
    distributedQueueEnqueue({ taskName: PURGE_OLD_RESPONSES, args: {}, priority: 40 });
    distributedQueueEnqueue({ taskName: SYNC_CALENDAR_RANGE, args: {}, priority: 40 });
    distributedQueueEnqueue({ taskName: AUDIT_SHEETS, args: {}, priority: 40 });
    Logger.log('runDailyMaintenanceJob: Enqueued all maintenance sub-tasks.');
  } catch (err) {
    ErrorService.sendThrottledError('runDailyMaintenanceJob', err, args);
  }
}

/**
 * Handler for PURGE_OLD_RESPONSES jobs.
 */
function purgeOldResponsesJob(args) {
  try {
    purgeOldResponses();
    Logger.log('purgeOldResponsesJob: Completed.');
  } catch (err) {
    ErrorService.sendThrottledError('purgeOldResponsesJob', err, args);
  }
}

/**
 * Handler for SYNC_CALENDAR_RANGE jobs.
 */
function syncCalendarRangeJob(args) {
  try {
    // Example: Sync for the next 30 days
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    CalendarSyncService.syncDateRange(today, end);
    Logger.log('syncCalendarRangeJob: Completed.');
  } catch (err) {
    ErrorService.sendThrottledError('syncCalendarRangeJob', err, args);
  }
}

/**
 * Handler for AUDIT_SHEETS jobs.
 */
function auditSheetsJob(args) {
  try {
    auditAvailabilitySheets();
    Logger.log('auditSheetsJob: Completed.');
  } catch (err) {
    ErrorService.sendThrottledError('auditSheetsJob', err, args);
  }
}

/**
 * Monitor free-tier system health and quotas.
 * Call this to check system status and usage.
 */
function monitorFreeTierSystem() {
  Logger.log('monitorFreeTierSystem: Checking system health');
  try {
    const triggers = FreeTierTriggerManager.listAllTriggers();
    const triggerCount = triggers.length;
    Logger.log(`monitorFreeTierSystem: Trigger count: ${triggerCount}/20 (${triggerCount < 15 ? 'OK' : 'WARNING'})`);
    const quotaStats = CalendarQuotaManager.getQuotaStats();
    Logger.log(`monitorFreeTierSystem: Calendar API calls - Run: ${quotaStats.runCalls}/${quotaStats.runLimit}, Daily: ${quotaStats.dailyCalls}/${quotaStats.dailyLimit}`);
    const queueStatus = checkQueueStatus();
    Logger.log(`monitorFreeTierSystem: Queue status: ${JSON.stringify(queueStatus)}`);
    const executionBudget = checkExecutionTimeBudget();
    Logger.log(`monitorFreeTierSystem: Execution budget: ${executionBudget.remainingMinutes} minutes remaining today`);
    return {
      triggers: triggerCount,
      calendarQuota: quotaStats,
      queue: queueStatus,
      executionBudget: executionBudget
    };
  } catch (e) {
    Logger.log('monitorFreeTierSystem: Error during monitoring: ' + e);
    return { error: e.toString() };
  }
}

/**
 * Check the status of the distributed queue.
 */
function checkQueueStatus() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const queueSheet = ss.getSheetByName(DIST_QUEUE_TAB_NAME);
    const dlqSheet = ss.getSheetByName(DLQ_TAB_NAME);
    const queueCount = queueSheet ? queueSheet.getLastRow() - 1 : 0;
    const dlqCount = dlqSheet ? dlqSheet.getLastRow() - 1 : 0;
    return {
      pendingJobs: Math.max(0, queueCount),
      failedJobs: Math.max(0, dlqCount),
      queueExists: !!queueSheet,
      dlqExists: !!dlqSheet
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * Check remaining execution time budget for the day.
 * Free tier: 6 hours = 360 minutes per day.
 */
function checkExecutionTimeBudget() {
  try {
    const props = PropertiesService.getScriptProperties();
    const today = new Date().toDateString();
    const executionKey = `execution_time_${today}`;
    const usedMinutes = parseInt(props.getProperty(executionKey) || '0', 10);
    const remainingMinutes = Math.max(0, 360 - usedMinutes);
    return {
      usedMinutes: usedMinutes,
      remainingMinutes: remainingMinutes,
      dailyLimit: 360,
      percentageUsed: Math.round((usedMinutes / 360) * 100)
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * Test the free-tier system with a sample job.
 * Use this to verify the system is working correctly.
 */
function testFreeTierSystem() {
  Logger.log('testFreeTierSystem: Testing system functionality');
  try {
    const testJob = {
      type: 'UNIFIED_LIST_UPDATE',
      requestId: 'test_' + Date.now()
    };
    const jobId = distributedQueueEnqueue(testJob);
    Logger.log(`testFreeTierSystem: Enqueued test job with ID: ${jobId}`);
    const workerId = 'test_worker_' + Utilities.getUuid();
    const job = distributedQueueDequeueAtomic(workerId, 30);
    if (job) {
      Logger.log(`testFreeTierSystem: Successfully claimed test job: ${job.id}`);
      processUnifiedListUpdateJob(job.payload);
      distributedQueueComplete(job.row);
      Logger.log('testFreeTierSystem: Successfully processed and completed test job');
      return { success: true, jobId: jobId, processed: true };
    } else {
      Logger.log('testFreeTierSystem: No test job found in queue');
      return { success: false, jobId: jobId, processed: false };
    }
  } catch (e) {
    Logger.log('testFreeTierSystem: Error during testing: ' + e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Emergency cleanup function for free tier.
 * Use this if the system gets overwhelmed or hits limits.
 */
function emergencyFreeTierCleanup() {
  Logger.log('emergencyFreeTierCleanup: Starting emergency cleanup');
  try {
    WorkerLeaseManager.forceReleaseLease();
    Logger.log('emergencyFreeTierCleanup: Released stuck worker leases');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const queueSheet = ss.getSheetByName(DIST_QUEUE_TAB_NAME);
    if (queueSheet && queueSheet.getLastRow() > 1) {
      queueSheet.clearContents();
      queueSheet.appendRow(['Timestamp', 'WorkerID', 'Payload']);
      Logger.log('emergencyFreeTierCleanup: Cleared pending jobs queue');
    }
    const dlqSheet = ss.getSheetByName(DLQ_TAB_NAME);
    if (dlqSheet && dlqSheet.getLastRow() > 1) {
      dlqSheet.clearContents();
      dlqSheet.appendRow(['FailedAt', 'JobID', 'Reason', 'Payload']);
      Logger.log('emergencyFreeTierCleanup: Cleared dead letter queue');
    }
    CalendarQuotaManager.initRun();
    Logger.log('emergencyFreeTierCleanup: Reset calendar quota');
    generateUnifiedAppointmentList();
    Logger.log('emergencyFreeTierCleanup: Regenerated unified appointment list');
    Logger.log('emergencyFreeTierCleanup: Emergency cleanup completed');
  } catch (e) {
    Logger.log('emergencyFreeTierCleanup: Error during cleanup: ' + e);
    throw e;
  }
}

// --- Error Handling and Utilities ---
// (To be migrated: ErrorService, sendThrottledError, getRecentErrors, clearErrorHistory, etc.)
// Structured error logging, admin notifications, and utility helpers.

/**
 * ErrorService: Structured error logging and throttled admin notifications.
 * Use ErrorService.logError and ErrorService.sendThrottledError in all catch blocks and critical error paths.
 */
const ErrorService = {
  /**
   * Log error with timestamp and context
   * @param {string} context - Error context
   * @param {Error} error - Error object
   * @param {Object} [metadata] - Additional metadata
   */
  logError(context, error, metadata = {}) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      message: error.message,
      stack: error.stack,
      ...metadata
    };
    Logger.log(`ERROR [${context}]: ${error.message}`);
    if (error.stack) {
      Logger.log(`Stack: ${error.stack}`);
    }
    if (Object.keys(metadata).length > 0) {
      Logger.log(`Metadata: ${JSON.stringify(metadata)}`);
    }
    // Store in script properties for debugging
    try {
      const props = PropertiesService.getScriptProperties();
      const recentErrors = JSON.parse(props.getProperty('RECENT_ERRORS') || '[]');
      recentErrors.unshift(errorInfo);
      if (recentErrors.length > 100) recentErrors.pop(); // Keep last 100 errors
      props.setProperty('RECENT_ERRORS', JSON.stringify(recentErrors));
    } catch (e) {
      Logger.log('ErrorService.logError: Failed to store error: ' + e);
    }
  },

  /**
   * Send throttled error notification
   * @param {string} context - Error context
   * @param {Error} error - Error object
   * @param {Object} [metadata] - Additional metadata
   */
  sendThrottledError(context, error, metadata = {}) {
    const errorKey = `${context}_${error.message}`;
    const now = Date.now();
    try {
      const props = PropertiesService.getScriptProperties();
      const lastSent = parseInt(props.getProperty(errorKey) || '0', 10);
      if (now - lastSent >= EMAIL_THROTTLE_MS) {
        this.logError(context, error, metadata);
        // Send email notification
        const subject = `[${SCRIPT_VERSION}] Error in ${context}`;
        const body = `\nError occurred in ${context}:\nMessage: ${error.message}\nStack: ${error.stack}\nMetadata: ${JSON.stringify(metadata, null, 2)}\nTime: ${new Date().toISOString()}\n`;
        MailApp.sendEmail({
          to: Session.getEffectiveUser().getEmail(),
          subject: subject,
          body: body
        });
        props.setProperty(errorKey, String(now));
      }
    } catch (e) {
      Logger.log('ErrorService.sendThrottledError: Failed to send notification: ' + e);
    }
  },

  /**
   * Get recent errors
   * @param {number} [limit=10] - Maximum number of errors to return
   * @return {Array} Recent errors
   */
  getRecentErrors(limit = 10) {
    try {
      const props = PropertiesService.getScriptProperties();
      const recentErrors = JSON.parse(props.getProperty('RECENT_ERRORS') || '[]');
      return recentErrors.slice(0, limit);
    } catch (e) {
      Logger.log('ErrorService.getRecentErrors: Failed to get errors: ' + e);
      return [];
    }
  },

  /**
   * Clear error history
   */
  clearErrorHistory() {
    try {
      const props = PropertiesService.getScriptProperties();
      props.deleteProperty('RECENT_ERRORS');
    } catch (e) {
      Logger.log('ErrorService.clearErrorHistory: Failed to clear errors: ' + e);
    }
  }
};



/**
 * Handler for CALENDAR_SYNC jobs. Uses CalendarSyncService to update calendar for a date.
 * @param {Object} payload The job payload.
 * @private
 */
function processCalendarSyncJob_(payload) {
  try {
    const { date, registry } = payload;
    if (!date || !registry) throw new Error('CALENDAR_SYNC job is missing required payload fields.');
    CalendarSyncService.syncSummaryEvents(date, [], { created: 0, updated: 0, deleted: 0, errors: 0 });
    CalendarSyncService.syncAppointmentEvents(date, [], { created: 0, updated: 0, deleted: 0, errors: 0 });
    Logger.log(`processCalendarSyncJob_: Calendar sync completed for ${date}`);
  } catch (e) {
    Logger.log('processCalendarSyncJob_: Error: ' + e);
    // Optionally: ErrorService.sendThrottledError('processCalendarSyncJob_', e);
  }
}

/**
 * Handler for DROPDOWN_UPDATE jobs. Updates the form dropdown for a specific date using robust logic.
 * @param {Object} payload The job payload.
 * @private
 */
function processDropdownUpdateJob_(payload) {
  try {
    const { date, registry } = payload;
    if (!date || !registry) throw new Error('DROPDOWN_UPDATE job is missing required payload fields.');
    updateFormDropdownForDate(registry, date);
    Logger.log(`processDropdownUpdateJob_: Dropdown updated for ${registry.formId} on ${date}`);
  } catch (e) {
    Logger.log('processDropdownUpdateJob_: Error: ' + e);
    // Optionally: ErrorService.sendThrottledError('processDropdownUpdateJob_', e);
  }
}

/**
 * Handler for CLEANUP jobs. Purges old responses for all forms (no registry-specific purge in modern version).
 * @param {Object} payload The job payload.
 * @private
 */
function processCleanupJob_(payload) {
  purgeOldResponses();
}

/**
 * CalendarQuotaManager: Safe Google Calendar API usage and quota enforcement.
 */
const CalendarQuotaManager = {
  runCalls: 0,
  dailyCalls: 0,
  initRun() {
    this.runCalls = 0;
    const cached = CACHE.get(SCRIPT_VERSION + '_calendar_calls_today');
    this.dailyCalls = parseInt(cached, 10) || 0;
  },
  canCall(count) {
    return (
      this.runCalls + count <= CALENDAR_API_CALL_LIMIT_PER_RUN &&
      this.dailyCalls + count <= CALENDAR_API_CALL_LIMIT_PER_DAY
    );
  },
  recordCall(count) {
    this.runCalls += count;
    this.dailyCalls += count;
    CACHE.put(SCRIPT_VERSION + '_calendar_calls_today', String(this.dailyCalls), 21600);
  },
  safeCreateEvent(fn) {
    if (!this.canCall(1)) {
      Logger.log('CalendarQuotaManager: Quota exceeded');
      return null;
    }
    try {
      const event = fn();
      this.recordCall(1);
      return event;
    } catch (e) {
      Logger.log('CalendarQuotaManager.safeCreateEvent: Error: ' + e);
      return null;
    }
  },
  safeDeleteEvent(fn) {
    if (!this.canCall(1)) {
      Logger.log('CalendarQuotaManager: Quota exceeded');
      return false;
    }
    try {
      fn();
      this.recordCall(1);
      return true;
    } catch (e) {
      Logger.log('CalendarQuotaManager.safeDeleteEvent: Error: ' + e);
      return false;
    }
  },
  getQuotaStats() {
    return {
      runCalls: this.runCalls,
      dailyCalls: this.dailyCalls,
      runLimit: CALENDAR_API_CALL_LIMIT_PER_RUN,
      dailyLimit: CALENDAR_API_CALL_LIMIT_PER_DAY
    };
  }
};

/**
 * CalendarSyncService: Robust, deduplicated, and quota-aware calendar sync for summary and appointment events.
 */
const CalendarSyncService = {
  /**
   * Sync calendar events for a date range (summary and appointments).
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @return {Object} Sync results
   */
  syncDateRange(start, end) {
    const results = {
      summaryEvents: { created: 0, updated: 0, deleted: 0, errors: 0 },
      appointmentEvents: { created: 0, updated: 0, deleted: 0, errors: 0 }
    };
    try {
      CalendarQuotaManager.initRun();
      const allEvents = CAL.getEvents(start, end);
      const summaryEvents = allEvents.filter(e => e.getTitle().includes(FULL_SUMMARY_TAG));
      const appointmentEvents = allEvents.filter(e => e.getTitle().includes(APPT_EVENT_TAG));
      // Group events by date
      const eventsByDate = new Map();
      [...summaryEvents, ...appointmentEvents].forEach(event => {
        const dateStr = DateUtils.formatYMD(event.getStartTime());
        if (!eventsByDate.has(dateStr)) {
          eventsByDate.set(dateStr, { summary: [], appointments: [] });
        }
        const dateEvents = eventsByDate.get(dateStr);
        if (event.getTitle().includes(FULL_SUMMARY_TAG)) {
          dateEvents.summary.push(event);
        } else {
          dateEvents.appointments.push(event);
        }
      });
      // Process each date
      let currentDate = new Date(start);
      while (currentDate <= end) {
        try {
          const dateStr = DateUtils.formatYMD(currentDate);
          if (HolidayService.isHoliday && HolidayService.isHoliday(dateStr)) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }
          const dateEvents = eventsByDate.get(dateStr) || { summary: [], appointments: [] };
          this.syncSummaryEvents(dateStr, dateEvents.summary, results.summaryEvents);
          this.syncAppointmentEvents(dateStr, dateEvents.appointments, results.appointmentEvents);
        } catch (e) {
          ErrorService.logError('CalendarSyncService.syncDateRange', e, { date: DateUtils.formatYMD(currentDate) });
          results.summaryEvents.errors++;
          results.appointmentEvents.errors++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return results;
    } catch (e) {
      ErrorService.logError('CalendarSyncService.syncDateRange', e, { start, end });
      throw e;
    }
  },

  /**
   * Sync summary events for a date.
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @param {CalendarEvent[]} existingEvents - Existing summary events
   * @param {Object} results - Results object to update
   */
  syncSummaryEvents(dateStr, existingEvents, results) {
    try {
      const dateObj = DateUtils.parseDate(dateStr);
      if (!dateObj) throw new Error(`Invalid date string: ${dateStr}`);
      // Get availability data
      const { minLeft } = this.getAvailabilityForDate(dateStr);
      const expectedTitle = `${minLeft} slots left ${FULL_SUMMARY_TAG}`;
      // Check for existing events with exact title match
      const existingWithTitle = CAL.getEvents(dateObj, dateObj, { search: expectedTitle });
      const hasExactMatch = existingWithTitle.length > 0;
      if (existingEvents.length === 0 && !hasExactMatch) {
        // Create new summary event only if no exact match exists
        const event = CalendarQuotaManager.safeCreateEvent(() => CAL.createAllDayEvent(expectedTitle, dateObj));
        if (event) {
          event.setColor(minLeft > 0 ? EVENT_COLOR_AVAILABLE : EVENT_COLOR_FULL);
          results.created++;
        }
      } else if (existingEvents.length === 1 && !hasExactMatch) {
        // Update if title doesn't match and no exact match exists
        const event = existingEvents[0];
        if (event.getTitle() !== expectedTitle) {
          if (CalendarQuotaManager.canCall(1)) {
            event.setTitle(expectedTitle);
            event.setColor(minLeft > 0 ? EVENT_COLOR_AVAILABLE : EVENT_COLOR_FULL);
            CalendarQuotaManager.recordCall(1);
            results.updated++;
          }
        }
      } else if (existingEvents.length > 1 || hasExactMatch) {
        // Multiple events or exact match exists - clean up duplicates
        const eventsToKeep = hasExactMatch ? existingWithTitle : [existingEvents[0]];
        const eventsToDelete = existingEvents.filter(e => !eventsToKeep.includes(e));
        for (const event of eventsToDelete) {
          if (CalendarQuotaManager.canCall(1)) {
            event.deleteEvent();
            CalendarQuotaManager.recordCall(1);
            results.deleted++;
          }
        }
        // Update keeper if needed
        const keeper = eventsToKeep[0];
        if (keeper && keeper.getTitle() !== expectedTitle) {
          if (CalendarQuotaManager.canCall(1)) {
            keeper.setTitle(expectedTitle);
            keeper.setColor(minLeft > 0 ? EVENT_COLOR_AVAILABLE : EVENT_COLOR_FULL);
            CalendarQuotaManager.recordCall(1);
            results.updated++;
          }
        }
      }
    } catch (e) {
      ErrorService.logError('CalendarSyncService.syncSummaryEvents', e, { dateStr });
      results.errors++;
    }
  },

  /**
   * Sync appointment events for a date.
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @param {CalendarEvent[]} existingEvents - Existing appointment events
   * @param {Object} results - Results object to update
   */
  syncAppointmentEvents(dateStr, existingEvents, results) {
    try {
      const dateObj = DateUtils.parseDate(dateStr);
      if (!dateObj) throw new Error(`Invalid date string: ${dateStr}`);
      // Get expected appointments
      const expectedAppointments = this.getExpectedAppointmentsForDate(dateStr);
      const existingTitles = new Set(existingEvents.map(e => e.getTitle()));
      // Find missing and extra appointments
      const missing = new Set([...expectedAppointments].filter(x => !existingTitles.has(x)));
      const extra = new Set([...existingTitles].filter(x => !expectedAppointments.has(x)));
      // Create missing appointments
      for (const title of missing) {
        const existingWithTitle = CAL.getEvents(dateObj, dateObj, { search: title });
        if (existingWithTitle.length === 0 && CalendarQuotaManager.canCall(1)) {
          const event = CAL.createAllDayEvent(title, dateObj);
          event.setColor(EVENT_COLOR_AVAILABLE);
          CalendarQuotaManager.recordCall(1);
          results.created++;
        }
      }
      // Delete extra appointments
      for (const title of extra) {
        const eventsToDelete = existingEvents.filter(e => e.getTitle() === title);
        for (const event of eventsToDelete) {
          if (CalendarQuotaManager.canCall(1)) {
            event.deleteEvent();
            CalendarQuotaManager.recordCall(1);
            results.deleted++;
          }
        }
      }
    } catch (e) {
      ErrorService.logError('CalendarSyncService.syncAppointmentEvents', e, { dateStr });
      results.errors++;
    }
  },

  /**
   * Get availability data for a date.
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @return {Object} Availability data
   */
  getAvailabilityForDate(dateStr) {
    let minLeft = ConfigService.get('SLOT_CAP', 20);
    let totalBooked = 0;
    for (const entry of FORM_REGISTRY) {
      try {
        const sheet = getSpreadsheet(entry).getSheetByName(entry.availabilitySheetName);
        if (!sheet) continue;
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0] === dateStr) {
            const booked = row[AVAIL_BOOKED_COL - 1] || 0;
            const left = row[AVAIL_LEFT_COL - 1] || ConfigService.get('SLOT_CAP', 20);
            totalBooked += booked;
            minLeft = Math.min(minLeft, left);
          }
        }
      } catch (e) {
        ErrorService.logError('CalendarSyncService.getAvailabilityForDate', e, { dateStr, formId: entry.formId });
      }
    }
    return { minLeft, totalBooked };
  },

  /**
   * Get expected appointments for a date with deduplication.
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @return {Set<string>} Set of expected appointment titles
   */
  getExpectedAppointmentsForDate(dateStr) {
    const expectedTitles = new Set();
    for (const entry of FORM_REGISTRY) {
      try {
        const sheet = getSpreadsheet(entry).getSheetByName(entry.sheetName);
        if (!sheet) continue;
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const [timestamp, lastName, firstName, purok, barangay, dateChoice] = data[i];
          if (!dateChoice) continue;
          const date = typeof dateChoice === 'string' ? dateChoice.split(' ')[0] : '';
          if (date !== dateStr) continue;
          const title = `${APPT_EVENT_TAG} ${lastName}, ${firstName} (${barangay})`;
          expectedTitles.add(title);
        }
      } catch (e) {
        ErrorService.logError('CalendarSyncService.getExpectedAppointmentsForDate', e, { dateStr, formId: entry.formId });
      }
    }
    return expectedTitles;
  }
};

/**
 * Orchestrates the entire form submission process.
 * @param {Object} e - The form submission event object.
 */
function onFormSubmit(e) {
  try {
    const payload = _getSubmissionPayload(e);
    if (!payload) return;
    distributedQueueEnqueue({
      taskName: 'processFormSubmissionJob',
      args: { payload },
      priority: 100 // High priority for user-facing jobs
    });
  } catch (err) {
    ErrorService.sendThrottledError('onFormSubmit', err, { eventObject: e });
  }
}

/**
 * Extracts and validates data from the form submission event.
 * @param {Object} e - The event object.
 * @returns {Object|null} The submission payload or null if invalid.
 * @private
 */
function _getSubmissionPayload(e) {
  if (!e || !e.range || !e.range.getSheet) return null;
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const rowValues = sheet.getRange(row, 2, 1, 5).getValues()[0];
  if (!rowValues) return null;

  const [lastName, firstName, purok, barangay, dateChoice] = rowValues;
  const dateString = (typeof dateChoice === 'string' && dateChoice.split(' ')[0]) || '';
  const registryEntry = ConfigService.getRegistry().find(r => r.spreadsheetId === sheet.getParent().getId());
  if (!registryEntry) return null;

  const idempotencyKey = Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    [lastName, firstName, dateChoice, row, sheet.getName()].join('|')
  ));

  return { idempotencyKey, registry: registryEntry, dateString, rowData: { lastName, firstName, purok, barangay } };
}

/**
 * Checks for duplicate requests using a robust cache+properties check.
 * @param {string} key - The idempotency key.
 * @returns {boolean} True if the request is a duplicate.
 * @private
 */
function _isRequestDuplicate(key) {
  return !!(safeCacheGet(key) || PropertiesService.getScriptProperties().getProperty('IDEMP_' + key));
}

/**
 * Atomically decrements the slot count for the booking.
 * @param {Object} payload - The submission payload.
 * @returns {boolean} True if the booking was processed successfully.
 * @private
 */
function _processBooking(payload) {
  const txn = new TransactionContext();
  try {
    const dateObj = DateUtils.parseDate(payload.dateString);
    if (!dateObj) throw new Error('Invalid date object from string: ' + payload.dateString);
    // Dependency Injection: gather all availability sheets
    const sheets = ConfigService.getRegistry().map(entry => getSpreadsheet(entry).getSheetByName(entry.availabilitySheetName));
    const allLefts = AvailabilityService.decrementSlotAllCategories(sheets, dateObj, txn, payload.idempotencyKey);
    if (!allLefts || allLefts.length === 0) throw new Error('No availability data returned.');
    if (Math.min(...allLefts) < 0) throw new Error('Negative availability detected.');
    return true;
  } catch (err) {
    txn.rollback();
    ErrorService.sendThrottledError('onFormSubmit-processBooking', err, payload);
    return false;
  }
}

/**
 * Enqueues all asynchronous side-effect jobs after a successful booking.
 * @param {Object} payload - The submission payload.
 * @private
 */
function _enqueueSideEffects(payload) {
  distributedQueueEnqueue({ type: 'CALENDAR_SYNC', date: payload.dateString, registry: payload.registry, rowData: payload.rowData });
  distributedQueueEnqueue({ type: 'DROPDOWN_UPDATE', date: payload.dateString, registry: payload.registry });
  distributedQueueEnqueue({ type: 'UNIFIED_LIST_UPDATE' });
  // The 'CLEANUP' job is better handled by a nightly maintenance trigger rather than on every submission.
}

/**
 * Marks a request as processed to prevent duplicate submissions.
 * @param {string} key - The idempotency key.
 * @private
 */
function _markRequestAsProcessed(key) {
  safeCachePut(key, '1', 3600); // 1 hour
  PropertiesService.getScriptProperties().setProperty('IDEMP_' + key, String(Date.now()));
}

/**
 * Updates only the specific date's label in the form dropdown for the given registry and date.
 * @param {Object} registry - The form registry entry.
 * @param {string} date - The date string (YYYY-MM-DD) to update.
 */
function updateFormDropdownForDate(registry, date) {
  try {
    const sheet = getSpreadsheet(registry).getSheetByName(registry.availabilitySheetName);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    let slotsLeft = null;
    for (let i = 2; i <= lastRow; i++) {
      const row = sheet.getRange(i, 1, 1, 3).getValues()[0];
      if (row[0] === date) {
        slotsLeft = row[2];
        break;
      }
    }
    if (slotsLeft === null) return;
    const form = FormApp.openById(registry.formId);
    const items = form.getItems(FormApp.ItemType.LIST);
    for (const item of items) {
      const title = item.getTitle();
      if (title.toLowerCase().includes('date')) {
        const list = item.asListItem();
        let choices = list.getChoices().map(choice => choice.getValue());
        // Update only the relevant date label
        choices = choices.map(label => {
          if (label.startsWith(date)) {
            return `${date} (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)`;
          }
          return label;
        });
        list.setChoiceValues(choices);
      }
    }
  } catch (e) {
    Logger.log('updateFormDropdownForDate: Error: ' + e);
  }
}

/**
 * Handler for CALENDAR_SYNC jobs. Fetches all events for the day once, then splits for summary/appointment sync.
 * @param {Object} payload The job payload.
 * @private
 */
function processCalendarSyncJob_(payload) {
  try {
    const { date, registry } = payload;
    if (!date || !registry) throw new Error('CALENDAR_SYNC job is missing required payload fields.');
    const dateObj = DateUtils.parseDate(date);
    if (!dateObj) throw new Error('Invalid date string for CALENDAR_SYNC: ' + date);
    // Fetch all events for the day once
    const allEvents = CAL.getEvents(dateObj, dateObj);
    const summaryEvents = allEvents.filter(e => e.getTitle().includes(FULL_SUMMARY_TAG));
    const appointmentEvents = allEvents.filter(e => e.getTitle().includes(APPT_EVENT_TAG));
    CalendarSyncService.syncSummaryEvents(date, summaryEvents, { created: 0, updated: 0, deleted: 0, errors: 0 });
    CalendarSyncService.syncAppointmentEvents(date, appointmentEvents, { created: 0, updated: 0, deleted: 0, errors: 0 });
    Logger.log(`processCalendarSyncJob_: Calendar sync completed for ${date}`);
  } catch (e) {
    Logger.log('processCalendarSyncJob_: Error: ' + e);
    // Optionally: ErrorService.sendThrottledError('processCalendarSyncJob_', e);
  }
}

/**
 * === Simple Unit Testing Suite (for world-class operational maturity) ===
 * Usage: Run runAllTests() from the Apps Script editor to verify core logic.
 */
function test_HolidayService_isHoliday_forManual() {
  // Test a known manual holiday (e.g., New Year's Day)
  const result = HolidayService.isHoliday('2024-01-01');
  console.assert(result === true, 'New Year\'s Day should be a holiday');
}

function test_HolidayService_isHoliday_forNonHoliday() {
  // Test a known non-holiday (e.g., a random weekday)
  const result = HolidayService.isHoliday('2024-01-03');
  console.assert(result === false, '2024-01-03 should not be a holiday');
}

function test_AvailabilityService_decrementSlotAllCategories() {
  // Mock: create a fake sheet with one row for today
  const today = DateUtils.formatYMD(new Date());
  const mockSheet = {
    getRange: (row, col, numRows, numCols) => ({
      getValues: () => [[today, 0, 5, 1, '']],
      setValues: () => {}
    })
  };
  const sheets = [mockSheet];
  const txn = { track: () => {}, rollback: () => {} };
  try {
    const lefts = AvailabilityService.decrementSlotAllCategories(sheets, new Date(), txn, 'test-key');
    console.assert(Array.isArray(lefts), 'Should return an array');
  } catch (e) {
    throw new Error('AvailabilityService.decrementSlotAllCategories failed: ' + e);
  }
}

function test_AvailabilityService_decrementSlotAllCategories_DI() {
  // Mock: create a fake sheet with one row for today
  const today = DateUtils.formatYMD(new Date());
  const mockSheet = {
    getRange: (row, col, numRows, numCols) => ({
      getValues: () => [[today, 0, 5, 1, '']],
      setValues: () => {}
    })
  };
  const sheets = [mockSheet];
  const txn = { track: () => {}, rollback: () => {} };
  const mockLockManager = {
    acquireDateLock: () => true,
    acquireGlobalLock: () => null,
    releaseDateLock: () => {},
    FALLBACK_TO_GLOBAL_LOCK: false
  };
  try {
    const lefts = AvailabilityService.decrementSlotAllCategories(sheets, new Date(), txn, 'test-key', mockLockManager);
    console.assert(Array.isArray(lefts), 'Should return an array (DI)');
  } catch (e) {
    throw new Error('AvailabilityService.decrementSlotAllCategories (DI) failed: ' + e);
  }
}

function runAllTests() {
  let passed = 0, failed = 0;
  function runTest(fn) {
    try {
      fn();
      Logger.log(fn.name + ': PASS');
      passed++;
    } catch (e) {
      Logger.log(fn.name + ': FAIL - ' + e);
      failed++;
    }
  }
  runTest(test_HolidayService_isHoliday_forManual);
  runTest(test_HolidayService_isHoliday_forNonHoliday);
  runTest(test_AvailabilityService_decrementSlotAllCategories);
  runTest(test_AvailabilityService_decrementSlotAllCategories_DI);
  Logger.log('Unit tests complete. Passed: ' + passed + ', Failed: ' + failed);
}

/**
 * Sends a daily system health digest email to the administrator.
 * Summarizes errors, queue status, and worker lease health.
 */
function sendSystemHealthDigest() {
  const errors = ErrorService.getRecentErrors(10);
  const queue = checkQueueStatus();
  const lease = WorkerLeaseManager.getCurrentLease();
  let status = 'OK';
  let issues = [];

  if (errors.length > 0) {
    status = 'WARNING';
    issues.push(`Recent errors: ${errors.length}`);
  }
  if (queue.pendingJobs > 10) {
    status = 'WARNING';
    issues.push(`Queue backlog: ${queue.pendingJobs}`);
  }
  if (lease) {
    status = 'WARNING';
    issues.push(`Stuck worker lease: ${lease.workerId}`);
  }

  const subject = `[SogodWaterworks] System Health: ${status}`;
  const body = `System Health Digest\n\nStatus: ${status}\n\nIssues:\n${issues.join('\n') || 'None'}\n\nRecent Errors:\n${errors.map(e => e.message).join('\n')}`;
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject, body);
}

/**
 * ContinuationManager: Robust, self-tuning, and self-healing service for long-running Apps Script jobs.
 * Includes: state management, self-healing, dynamic batch size, performance logging, and continuation triggers.
 */
const STALE_STATE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const TIMEOUT_BATCH_REDUCTION = 0.75; // Reduce batch size by 25% on timeout
const ContinuationManager = {
  /**
   * Loads the saved state for a given task, or returns the provided initial state if none exists.
   * Ensures all performance metrics fields are present. Detects stale state and applies self-healing.
   * @param {string} taskName - Unique key for the task's state.
   * @param {Object} [initialState={}] - Default state if none is saved.
   * @return {Object} The loaded or initial state, with metrics fields.
   */
  loadState(taskName, initialState = {}) {
    const defaultMetrics = {
      startTime: Date.now(),
      apiCalls: 0,
      rowsProcessedThisRun: 0,
      lastUpdate: Date.now(),
      batchSize: initialState.batchSize || 100,
      timeoutRecoveryCount: 0,
      continuationTriggerId: null,
    };

    const props = PropertiesService.getScriptProperties();
    const saved = props.getProperty(taskName);
    let state = saved ? JSON.parse(saved) : {};

    // Merge defaults, initial state, and saved state
    state = { ...defaultMetrics, ...initialState, ...state };

    // Self-healing: detect stale state (likely timeout)
    const now = Date.now();
    if (saved && (now - state.lastUpdate > STALE_STATE_TIMEOUT_MS)) {
      Logger.log(`ContinuationManager: Stale state detected for ${taskName} (lastUpdate: ${new Date(state.lastUpdate).toISOString()}), likely timeout. Reducing batch size.`);
      const oldBatchSize = state.batchSize;
      state.batchSize = Math.max(1, Math.floor(state.batchSize * TIMEOUT_BATCH_REDUCTION));
      state.timeoutRecoveryCount++;
      state.lastTimeoutDetected = now;
      Logger.log(`ContinuationManager: Batch size reduced from ${oldBatchSize} to ${state.batchSize} for recovery. Recovery count: ${state.timeoutRecoveryCount}`);
    }
    state.lastUpdate = now;
    return state;
  },

  /**
   * Saves the current state, updating lastUpdate timestamp.
   * @param {string} taskName - Unique key for the task's state.
   * @param {Object} state - The state object to save.
   */
  saveState(taskName, state) {
    state.lastUpdate = Date.now();
    PropertiesService.getScriptProperties().setProperty(taskName, JSON.stringify(state));
  },

  /**
   * Checks if the function should continue processing, based on elapsed time.
   * @param {number} startTime - The timestamp (ms) when the function started.
   * @param {number} [softTimeLimitMs=5*60*1000] - Soft time limit in ms (default: 5 minutes).
   * @return {boolean} True if under the time limit, false if should pause and continue later.
   */
  shouldContinue(startTime, softTimeLimitMs = 5 * 60 * 1000) {
    return (Date.now() - startTime) < softTimeLimitMs;
  },

  /**
   * Saves the current state and schedules a continuation trigger for the same function.
   * @param {string} taskName - Unique key for the task's state.
   * @param {Object} state - The state object to save.
   * @param {string} continuationFnName - The function name to call on continuation.
   */
  saveAndContinue(taskName, state, continuationFnName) {
    const trigger = ScriptApp.newTrigger(continuationFnName)
      .timeBased()
      .after(10000) // 10 seconds
      .create();
    state.continuationTriggerId = trigger.getUniqueId();
    this.saveState(taskName, state);
  },

  /**
   * Cleans up the saved state and removes all triggers for the continuation function.
   * Also logs performance metrics if state is provided.
   * @param {string} taskName - Unique key for the task's state.
   * @param {string} continuationFnName - The function name to clean up triggers for.
   * @param {Object} [state] - The final state object (for logging).
   * @param {string} [notes] - Optional notes for logging.
   */
  finish(taskName, continuationFnName, state, notes) {
    if (state) {
      this.logPerformance(taskName, state, notes);
    }
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(taskName);
    // More efficient trigger deletion
    if (state && state.continuationTriggerId) {
      const trigger = ScriptApp.getProjectTriggers().find(t => t.getUniqueId() === state.continuationTriggerId);
      if (trigger) {
        ScriptApp.deleteTrigger(trigger);
      }
    } else { // Fallback for older states or if ID was lost
      ScriptApp.getProjectTriggers().forEach(t => {
        if (t.getHandlerFunction() === continuationFnName) ScriptApp.deleteTrigger(t);
      });
    }
  },

  /**
   * Logs performance metrics for a completed batch/continuation job.
   * @param {string} taskName - The name of the task/job.
   * @param {Object} state - The final state object with metrics.
   * @param {string} [notes] - Optional notes or context.
   */
  logPerformance(taskName, state, notes) {
    try {
      const sheet = ensurePerformanceLogSheet();
      const now = new Date();
      const totalDurationMs = (state.startTime && state.lastUpdate) ? (state.lastUpdate - state.startTime) : '';
      const totalRows = state.rowsProcessedThisRun || '';
      const totalApiCalls = state.apiCalls || '';
      const avgMsPerRow = (totalRows && totalDurationMs) ? (totalDurationMs / totalRows) : '';
      const avgApiCallsPerRow = (totalRows && totalApiCalls) ? (totalApiCalls / totalRows) : '';
      const lastBatchSize = state.batchSize || '';
      sheet.appendRow([
        now.toISOString(),
        taskName,
        totalDurationMs,
        totalRows,
        totalApiCalls,
        avgMsPerRow,
        avgApiCallsPerRow,
        lastBatchSize,
        notes || ''
      ]);
    } catch (e) {
      Logger.log('PerformanceLog: Failed to log performance: ' + e);
    }
  },

  /**
   * Returns a dynamically tuned batch size for a given task, based on recent performance log history.
   * @param {string} taskName - The name of the task/job.
   * @param {number} defaultBatchSize - The fallback batch size if no history.
   * @param {number} [apiLimit] - Optional API call limit per run for this task.
   * @return {number} The recommended batch size.
   */
  getDynamicBatchSize(taskName, defaultBatchSize, apiLimit) {
    try {
      const sheet = ensurePerformanceLogSheet();
      const data = sheet.getDataRange().getValues();
      // Find last N rows for this taskName (skip header)
      const N = 20;
      const rows = [];
      for (let i = data.length - 1; i > 0 && rows.length < N; i--) {
        if (data[i][1] === taskName) rows.push(data[i]);
      }
      if (rows.length === 0) return defaultBatchSize;
      // Compute averages
      let totalMs = 0, totalRows = 0, totalApi = 0;
      for (const row of rows) {
        const ms = Number(row[2]);
        const r = Number(row[3]);
        const api = Number(row[4]);
        if (ms > 0 && r > 0) {
          totalMs += ms;
          totalRows += r;
        }
        if (api > 0) totalApi += api;
      }
      if (totalRows === 0) return defaultBatchSize;
      const avgMsPerRow = totalMs / totalRows;
      const avgApiPerRow = totalApi / totalRows;
      // Time-based tuning
      const safeExecutionTime = 5.5 * 60 * 1000; // 5.5 minutes (buffer)
      const predictedTimePerRow = avgMsPerRow * 1.1; // 10% buffer
      let dynamicBatchSize = Math.floor(safeExecutionTime / predictedTimePerRow);
      // API-based tuning
      if (apiLimit && avgApiPerRow > 0) {
        const safeApiLimit = apiLimit - 5; // buffer
        const apiBatch = Math.floor(safeApiLimit / avgApiPerRow);
        dynamicBatchSize = Math.min(dynamicBatchSize, apiBatch);
      }
      // Clamp to reasonable range
      if (!isFinite(dynamicBatchSize) || dynamicBatchSize < 1) dynamicBatchSize = defaultBatchSize;
      dynamicBatchSize = Math.max(1, Math.min(dynamicBatchSize, defaultBatchSize * 5));
      return dynamicBatchSize;
    } catch (e) {
      Logger.log('getDynamicBatchSize: Failed to compute dynamic batch size: ' + e);
      return defaultBatchSize;
    }
  }
};



/**
 * Ensures the PerformanceLog_v1 sheet exists and has the correct headers.
 * @return {Sheet} The log sheet.
 */
function ensurePerformanceLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('PerformanceLog_v1');
  if (!sheet) {
    sheet = ss.insertSheet('PerformanceLog_v1');
    sheet.appendRow([
      'Timestamp', 'TaskName', 'TotalDurationMs', 'TotalRowsProcessed', 'TotalApiCalls',
      'AvgMsPerRow', 'AvgApiCallsPerRow', 'LastBatchSize', 'Notes'
    ]);
  }
  return sheet;
}

/**
 * JOB_HANDLERS: Strategy Pattern map for job type routing.
 * Maps job type strings to their handler functions.
 * To add a new job type, add an entry here.
 */
const JOB_HANDLERS = {
  'CALENDAR_SYNC': processCalendarSyncJob_,
  'DROPDOWN_UPDATE': processDropdownUpdateJob_,
  'CLEANUP': processCleanupJob_,
  'UNIFIED_LIST_UPDATE': processUnifiedListUpdateJob,
  // Add new job types here as needed
};

/**
 * JobHandlerRegistry: Dynamic registry for job handlers.
 * Allows registration and lookup of job handler functions by type.
 */
const JobHandlerRegistry = (function() {
  const handlers = {
    'CALENDAR_SYNC': processCalendarSyncJob_,
    'DROPDOWN_UPDATE': processDropdownUpdateJob_,
    'CLEANUP': processCleanupJob_,
    'UNIFIED_LIST_UPDATE': processUnifiedListUpdateJob,
    // ...initial handlers...
  };
  return {
    /**
     * Registers a new job handler for a given type.
     * @param {string} type - The job type string.
     * @param {function} fn - The handler function.
     */
    registerHandler(type, fn) {
      handlers[type] = fn;
    },
    /**
     * Gets the handler function for a given job type.
     * @param {string} type - The job type string.
     * @return {function|undefined} The handler function, or undefined if not found.
     */
    getHandler(type) {
      return handlers[type];
    },
    /**
     * Returns all registered job types.
     * @return {string[]} Array of job type strings.
     */
    getAllTypes() {
      return Object.keys(handlers);
    }
  };
})();

/**
 * MAX_JOB_RETRIES: Maximum number of times a job will be retried before moving to DLQ.
 */
const MAX_JOB_RETRIES = 3;

/**
 * dequeueNextJobByPriority: Dequeues the highest-priority job from the distributed queue.
 * Jobs with a 'priority' field (higher number = higher priority) are processed first.
 * @param {Sheet} sheet - The distributed queue sheet.
 * @return {Object|null} The job object, or null if none available.
 */
function dequeueNextJobByPriority(sheet) {
  const data = sheet.getDataRange().getValues();
  let bestIdx = -1;
  let bestPriority = -Infinity;
  let bestJob = null;
  for (let i = 1; i < data.length; i++) { // skip header
    const row = data[i];
    const payload = JSON.parse(row[1]);
    const priority = typeof payload.priority === 'number' ? payload.priority : 0;
    if (row[5] === 'PENDING' && priority > bestPriority) {
      bestPriority = priority;
      bestIdx = i + 1; // 1-based
      bestJob = {
        id: row[0],
        payload,
        row: bestIdx
      };
    }
  }
  if (bestJob) {
    // Mark as claimed
    sheet.getRange(bestJob.row, 6, 1, 1).setValue('CLAIMED');
    return bestJob;
  }
  return null;
}





// === TASK_REGISTRY: System Call Table for Apps Script OS ===
// This registry defines all orchestratable/admin tasks for dynamic scheduling and agentic invocation.
// Only include top-level system/admin/orchestratable functions (no queue primitives or helpers).
const TASK_REGISTRY = {
  setupOrValidateSystem: {
    functionName: 'setupOrValidateSystem',
    description: 'Main admin entry for validation and repair of system resources.',
    parameters: [ { name: 'sheetId', type: 'string', required: true }, { name: 'options', type: 'object', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  validateResources: {
    functionName: 'validateResources',
    description: 'Validates all resources (sheets, forms, calendar) for a given sheet ID.',
    parameters: [ { name: 'sheetId', type: 'string', required: true } ],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  modernPopulateResources: {
    functionName: 'modernPopulateResources',
    description: 'Populates or repairs resources for a given sheet ID (optionally repair only).',
    parameters: [ { name: 'sheetId', type: 'string', required: true }, { name: 'options', type: 'object', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: ['validateResources']
  },
  validateConsistency: {
    functionName: 'validateConsistency',
    description: 'Checks cross-resource consistency for a given sheet ID.',
    parameters: [ { name: 'sheetId', type: 'string', required: true } ],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  validateDataQuality: {
    functionName: 'validateDataQuality',
    description: 'Checks data quality in all response and availability tabs for a given sheet ID.',
    parameters: [ { name: 'sheetId', type: 'string', required: true } ],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  sendFormLinksEmail: {
    functionName: 'sendFormLinksEmail',
    description: 'Emails Google Form embed codes to the script owner for a given sheet ID.',
    parameters: [ { name: 'sheetId', type: 'string', required: true } ],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  rebuildSlotCounters: {
    functionName: 'rebuildSlotCounters',
    description: 'Rebuilds slot counters for all availability sheets.',
    parameters: [ { name: 'e', type: 'object', required: false } ],
    resourceCost: 'HIGH', retryPolicy: 'linear_backoff', dependencies: []
  },
  rebuildAppointmentEventsAllForms: {
    functionName: 'rebuildAppointmentEventsAllForms',
    description: 'Modernized: Deletes and recreates all appointment events from form responses using leasing and resumable sub-tasks.',
    parameters: [ { name: 'args', type: 'object', required: false } ],
    resourceCost: 'HIGH', retryPolicy: 'move_to_dlq', dependencies: []
  },
  rebuildAllFormDropdowns: {
    functionName: 'rebuildAllFormDropdowns',
    description: 'Rebuilds all form dropdowns to show slot availability.',
    parameters: [], resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  generateUnifiedAppointmentList: {
    functionName: 'generateUnifiedAppointmentList',
    description: 'Generates the unified appointment list in block layout for staff.',
    parameters: [], resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  auditAvailabilitySheets: {
    functionName: 'auditAvailabilitySheets',
    description: 'Audits all availability sheets for integrity and auto-corrects checksums if needed.',
    parameters: [], resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  productionSystemDiagnostics: {
    functionName: 'productionSystemDiagnostics',
    description: 'Runs a full system health and diagnostics check.',
    parameters: [], resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  setupFreeTierSystem: {
    functionName: 'setupFreeTierSystem',
    description: 'Sets up all triggers, quotas, and unified list for free-tier deployment.',
    parameters: [], resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  dailyMaintenanceRoutine: {
    functionName: 'dailyMaintenanceRoutine',
    description: 'Performs daily maintenance: resets quotas, purges old responses, syncs calendar, and checks integrity.',
    parameters: [], resourceCost: 'HIGH', retryPolicy: 'move_to_dlq', dependencies: []
  },
  monitorFreeTierSystem: {
    functionName: 'monitorFreeTierSystem',
    description: 'Checks system health, quotas, and trigger status.',
    parameters: [], resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  checkQueueStatus: {
    functionName: 'checkQueueStatus',
    description: 'Checks the status of the distributed queue and DLQ.',
    parameters: [], resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  checkExecutionTimeBudget: {
    functionName: 'checkExecutionTimeBudget',
    description: 'Checks remaining execution time budget for the day.',
    parameters: [], resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  testFreeTierSystem: {
    functionName: 'testFreeTierSystem',
    description: 'Tests the free-tier system with a sample job.',
    parameters: [], resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  emergencyFreeTierCleanup: {
    functionName: 'emergencyFreeTierCleanup',
    description: 'Performs emergency cleanup: releases leases, clears queues, resets quotas, and regenerates unified list.',
    parameters: [], resourceCost: 'HIGH', retryPolicy: 'none', dependencies: []
  },
  retryFailedJobs: {
    functionName: 'retryFailedJobs',
    description: 'Retries failed jobs from the Dead-Letter Queue (DLQ).',
    parameters: [ { name: 'limit', type: 'number', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  forceReleaseWorkerLeases: {
    functionName: 'forceReleaseWorkerLeases',
    description: 'Force releases stuck worker leases.',
    parameters: [], resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  processUnifiedListUpdateJob: {
    functionName: 'processUnifiedListUpdateJob',
    description: 'Handles UNIFIED_LIST_UPDATE jobs by regenerating the unified appointment list.',
    parameters: [ { name: 'payload', type: 'object', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: ['generateUnifiedAppointmentList']
  },
  processCalendarSyncJob_: {
    functionName: 'processCalendarSyncJob_',
    description: 'Handler for CALENDAR_SYNC jobs. Syncs calendar for a date.',
    parameters: [ { name: 'payload', type: 'object', required: true } ],
    resourceCost: 'HIGH', retryPolicy: 'move_to_dlq', dependencies: []
  },
  processDropdownUpdateJob_: {
    functionName: 'processDropdownUpdateJob_',
    description: 'Handler for DROPDOWN_UPDATE jobs. Updates form dropdown for a date.',
    parameters: [ { name: 'payload', type: 'object', required: true } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  processCleanupJob_: {
    functionName: 'processCleanupJob_',
    description: 'Handler for CLEANUP jobs. Purges old responses for all forms.',
    parameters: [ { name: 'payload', type: 'object', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'move_to_dlq', dependencies: []
  },
  onFormSubmit: {
    functionName: 'onFormSubmit',
    description: 'Main orchestrator for form submission events.',
    parameters: [ { name: 'e', type: 'object', required: true } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  updateFormDropdownForDate: {
    functionName: 'updateFormDropdownForDate',
    description: 'Updates the dropdown for a specific date in a form, after booking or slot change.',
    parameters: [ { name: 'registry', type: 'object', required: true }, { name: 'date', type: 'string', required: true } ],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  sendSystemHealthDigest: {
    functionName: 'sendSystemHealthDigest',
    description: 'Sends a daily system health digest email to the administrator.',
    parameters: [], resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  runAllTests: {
    functionName: 'runAllTests',
    description: 'Runs all unit tests for core logic and system health.',
    parameters: [], resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  garbageCollectSystem: {
    functionName: 'garbageCollectSystem',
    description: 'Prunes old log entries and obsolete save states.',
    parameters: [],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  consolidatePerformanceLog: {
    functionName: 'consolidatePerformanceLog',
    description: 'Consolidates raw performance log data into daily summaries.',
    parameters: [],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  consolidateSystemMetrics: {
    functionName: 'consolidateSystemMetrics',
    description: 'Orchestrated system data consolidation: performance logs, metrics, etc.',
    parameters: [],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  },
  processFormSubmissionJob: {
    functionName: 'processFormSubmissionJob',
    description: 'Handles PROCESS_FORM_SUBMISSION jobs: deduplication, booking, and side-effect jobs.',
    parameters: [ { name: 'args', type: 'object', required: true } ],
    resourceCost: 'HIGH', retryPolicy: 'linear_backoff', dependencies: []
  },
  [RUN_DAILY_MAINTENANCE]: {
    functionName: 'runDailyMaintenanceJob',
    description: 'Handles RUN_DAILY_MAINTENANCE jobs: enqueues sub-tasks for maintenance.',
    parameters: [ { name: 'args', type: 'object', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  [PURGE_OLD_RESPONSES]: {
    functionName: 'purgeOldResponsesJob',
    description: 'Purges old responses as part of maintenance.',
    parameters: [ { name: 'args', type: 'object', required: false } ],
    resourceCost: 'LOW', retryPolicy: 'linear_backoff', dependencies: []
  },
  [SYNC_CALENDAR_RANGE]: {
    functionName: 'syncCalendarRangeJob',
    description: 'Syncs calendar events for a date range as part of maintenance.',
    parameters: [ { name: 'args', type: 'object', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  [AUDIT_SHEETS]: {
    functionName: 'auditSheetsJob',
    description: 'Audits availability sheets as part of maintenance.',
    parameters: [ { name: 'args', type: 'object', required: false } ],
    resourceCost: 'LOW', retryPolicy: 'linear_backoff', dependencies: []
  },
  [SETUP_FREE_TIER_SYSTEM]: {
    functionName: 'setupFreeTierSystemTask',
    description: 'Sets up all triggers, quotas, and unified list for free-tier system (agentic-invokable).',
    parameters: [ { name: 'args', type: 'object', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  [REBUILD_ALL_DROPDOWNS]: {
    functionName: 'rebuildAllFormDropdownsTask',
    description: 'High-level task to rebuild all form dropdowns by enqueuing UPDATE_DROPDOWN jobs for each form.',
    parameters: [ { name: 'args', type: 'object', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
  [UPDATE_DROPDOWN]: {
    functionName: 'updateDropdownJob',
    description: 'Updates the dropdown for a single form.',
    parameters: [ { name: 'args', type: 'object', required: true } ],
    resourceCost: 'LOW', retryPolicy: 'linear_backoff', dependencies: []
  },
  [GENERATE_UNIFIED_LIST]: {
    functionName: 'generateUnifiedAppointmentListTask',
    description: 'Generates the unified appointment list in batches using ContinuationManager.',
    parameters: [ { name: 'args', type: 'object', required: false } ],
    resourceCost: 'HIGH', retryPolicy: 'linear_backoff', dependencies: []
  },
  [AUDIT_AVAILABILITY_SHEETS_BATCH]: {
    functionName: 'auditAvailabilitySheetsBatchTask',
    description: 'Audits all availability sheets in batches using runBatchJobWithContinuation.',
    parameters: [ { name: 'args', type: 'object', required: false } ],
    resourceCost: 'MEDIUM', retryPolicy: 'linear_backoff', dependencies: []
  },
};

/**
 * ContinuationOrchestrationKernel: The OS-like orchestrator for agentic jobs.
 * Responsibilities:
 * - Acquire Lease
 * - Assess Resources (API quota, execution time, etc.)
 * - Select Job: Dequeue highest-priority job whose dependencies are met and resourceCost fits available resources
 * - Load State: Use ContinuationManager to load job state
 * - Dynamic Invocation: Use TASK_REGISTRY[taskName].functionName and args to call the function, passing in state
 * - Process Return: If not done, update job in queue with new state; if done, mark as COMPLETE or archive
 * - Handle Failure: Use retryPolicy to re-enqueue, backoff, or move to DLQ
 * - Release Lease
 * - Supports full-drain/ContinuationManager mode for long-running jobs
 * - Logs metrics to ConcurrencyMonitor
 */


/**
 * Process a single job (used by both full-drain and batch modes)
 * Handles compatibility shim, handler lookup, invocation, state/result, error/retry/DLQ, logging, and metrics.
 * @param {Object} job - The job object
 * @param {Object} context - { workerId, mode, maxExecutionTime, executionStart }
 * @returns {Object} { done: boolean, continued: boolean, error: Error|null }
 */
function processSingleJob(job, context) {
  const { workerId, mode } = context;
  // --- Compatibility shim for legacy job payloads ---
  if (!job.taskName && job.payload && job.payload.type) {
    job.taskName = job.payload.type;
    job.args = job.payload.args || job.payload;
  }
  // --- End compatibility shim ---
  const task = TASK_REGISTRY[job.taskName];
  const legacyHandler = typeof JOB_HANDLERS !== 'undefined' ? JOB_HANDLERS[job.taskName] : undefined;
  if (!task && !legacyHandler) {
    Logger.log(`[Kernel] Unknown taskName: ${job.taskName}`);
    deadLetterEnqueue(job, `Unknown taskName: ${job.taskName}`);
    distributedQueueComplete(job.row);
    if (typeof ConcurrencyMonitor !== 'undefined') {
      ConcurrencyMonitor._logMetric('job_failure', {
        jobId: job.id,
        jobType: job.taskName,
        error: 'Unknown taskName',
        workerId: workerId
      });
    }
    return { done: true, continued: false, error: new Error('Unknown taskName') };
  }
  let stateObj = job.state || {};
  let done = false;
  try {
    Logger.log(`[Kernel] [${mode}] Invoking handler for job ${job.id} (${job.taskName})`);
    let result;
    if (task) {
      const fn = this[task.functionName] || eval(task.functionName);
      result = fn(job.args, stateObj);
    } else if (legacyHandler) {
      result = legacyHandler.length === 2 ? legacyHandler(job.args, stateObj) : legacyHandler(job.args);
    }
    if (result && typeof result === 'object' && 'done' in result) {
      stateObj = result.newState || {};
      done = !!result.done;
    } else {
      done = true;
    }
    if (!done) {
      job.state = stateObj;
      job.status = 'PENDING';
      distributedQueueEnqueue(job);
      Logger.log(`[Kernel] [${mode}] Job ${job.id} not done, re-enqueued for continuation.`);
      if (typeof ConcurrencyMonitor !== 'undefined') {
        ConcurrencyMonitor._logMetric('job_continuation', {
          jobId: job.id,
          jobType: job.taskName,
          workerId: workerId
        });
      }
      return { done: false, continued: true, error: null };
    } else {
      distributedQueueComplete(job.row);
      Logger.log(`[Kernel] [${mode}] Completed job ${job.id} (done=${done})`);
      if (typeof ConcurrencyMonitor !== 'undefined') {
        ConcurrencyMonitor._logMetric('job_success', {
          jobId: job.id,
          jobType: job.taskName,
          workerId: workerId
        });
      }
      return { done: true, continued: false, error: null };
    }
  } catch (e) {
    Logger.log(`[Kernel] [${mode}] FAILED job ${job.id}. Error: ${e.toString()}`);
    job.retries = (job.retries || 0) + 1;
    const retryPolicy = task && task.retryPolicy || 'none';
    if (typeof ConcurrencyMonitor !== 'undefined') {
      ConcurrencyMonitor._logMetric('job_retry', {
        jobId: job.id,
        jobType: job.taskName,
        error: e.toString(),
        workerId: workerId,
        retryCount: job.retries
      });
    }
    if (retryPolicy === 'move_to_dlq' || job.retries > 3) {
      deadLetterEnqueue(job, `Max retries or policy: ${e.toString()}`);
      distributedQueueComplete(job.row);
      Logger.log(`[Kernel] [${mode}] Job ${job.id} moved to DLQ after ${job.retries} retries.`);
      if (typeof ConcurrencyMonitor !== 'undefined') {
        ConcurrencyMonitor._logMetric('job_failure', {
          jobId: job.id,
          jobType: job.taskName,
          error: e.toString(),
          workerId: workerId
        });
      }
      return { done: true, continued: false, error: e };
    } else {
      distributedQueueEnqueue(job);
      distributedQueueComplete(job.row);
      Logger.log(`[Kernel] [${mode}] Job ${job.id} re-enqueued for retry (${job.retries}).`);
      return { done: false, continued: true, error: e };
    }
  }
}

/**
 * TEST HARNESS: Validates ContinuationOrchestrationKernel with modern and legacy jobs.
 * - Clears the distributed queue and DLQ.
 * - Enqueues a mix of modern and legacy jobs (some complete, some require continuation, some fail).
 * - Runs the kernel in both batch and full-drain modes.
 * - Logs results and prints final queue and DLQ states.
 */
function testContinuationOrchestrationKernel() {
  Logger.log('--- TEST HARNESS: ContinuationOrchestrationKernel ---');
  // 1. Clear distributed queue and DLQ
  if (typeof clearDistributedQueue === 'function') clearDistributedQueue();
  if (typeof clearDeadLetterQueue === 'function') clearDeadLetterQueue();

  // 2. Enqueue modern jobs
  distributedQueueEnqueue({
    id: 'modern1',
    taskName: 'testModernComplete',
    args: { value: 42 },
    status: 'PENDING',
    priority: 1
  });
  distributedQueueEnqueue({
    id: 'modern2',
    taskName: 'testModernContinue',
    args: { value: 1 },
    status: 'PENDING',
    priority: 2
  });
  distributedQueueEnqueue({
    id: 'modern3',
    taskName: 'testModernFail',
    args: { value: 0 },
    status: 'PENDING',
    priority: 3
  });

  // 3. Enqueue legacy jobs
  distributedQueueEnqueue({
    id: 'legacy1',
    payload: { type: 'testLegacyComplete', value: 99 },
    status: 'PENDING',
    priority: 1
  });
  distributedQueueEnqueue({
    id: 'legacy2',
    payload: { type: 'testLegacyContinue', value: 2 },
    status: 'PENDING',
    priority: 2
  });
  distributedQueueEnqueue({
    id: 'legacy3',
    payload: { type: 'testLegacyFail', value: 0 },
    status: 'PENDING',
    priority: 3
  });

  // 4. Enqueue job with invalid/missing handler (should go to DLQ)
  distributedQueueEnqueue({
    id: 'invalid1',
    taskName: 'nonExistentHandler',
    args: { foo: 'bar' },
    status: 'PENDING',
    priority: 4
  });

  // 5. Enqueue job with custom retry policy (linear_backoff)
  TASK_REGISTRY.testModernBackoff = {
    functionName: 'testModernBackoffHandler',
    description: 'Fails twice, then succeeds',
    parameters: [{ name: 'value' }],
    resourceCost: 1,
    retryPolicy: 'linear_backoff',
    dependencies: []
  };
  distributedQueueEnqueue({
    id: 'modernBackoff',
    taskName: 'testModernBackoff',
    args: { value: 0 },
    status: 'PENDING',
    priority: 5
  });

  // 6. Enqueue job with dependency (if supported)
  // For demonstration, we add a dependency field, but actual dependency resolution logic must exist in the kernel for this to have effect.
  distributedQueueEnqueue({
    id: 'modernDep',
    taskName: 'testModernComplete',
    args: { value: 100 },
    status: 'PENDING',
    priority: 6,
    dependenciesResolved: false // Simulate unresolved dependency
  });

  // 7. Register test handlers
  TASK_REGISTRY.testModernComplete = {
    functionName: 'testModernCompleteHandler',
    description: 'Completes immediately',
    parameters: [{ name: 'value' }],
    resourceCost: 1,
    retryPolicy: 'none',
    dependencies: []
  };
  TASK_REGISTRY.testModernContinue = {
    functionName: 'testModernContinueHandler',
    description: 'Requires continuation',
    parameters: [{ name: 'value' }],
    resourceCost: 1,
    retryPolicy: 'none',
    dependencies: []
  };
  TASK_REGISTRY.testModernFail = {
    functionName: 'testModernFailHandler',
    description: 'Always fails',
    parameters: [{ name: 'value' }],
    resourceCost: 1,
    retryPolicy: 'move_to_dlq',
    dependencies: []
  };
  if (typeof JOB_HANDLERS === 'object') {
    JOB_HANDLERS.testLegacyComplete = function(args) {
      Logger.log('Legacy complete handler called with: ' + JSON.stringify(args));
      return { done: true };
    };
    JOB_HANDLERS.testLegacyContinue = function(args, state) {
      Logger.log('Legacy continue handler called with: ' + JSON.stringify(args) + ', state: ' + JSON.stringify(state));
      if (!state.counter) state.counter = 0;
      state.counter++;
      return { done: state.counter >= 2, newState: state };
    };
    JOB_HANDLERS.testLegacyFail = function(args) {
      Logger.log('Legacy fail handler called with: ' + JSON.stringify(args));
      throw new Error('Legacy job failed intentionally');
    };
  }
  this.testModernCompleteHandler = function(args, state) {
    Logger.log('Modern complete handler called with: ' + JSON.stringify(args));
    return { done: true };
  };
  this.testModernContinueHandler = function(args, state) {
    Logger.log('Modern continue handler called with: ' + JSON.stringify(args) + ', state: ' + JSON.stringify(state));
    if (!state.counter) state.counter = 0;
    state.counter++;
    return { done: state.counter >= 2, newState: state };
  };
  this.testModernFailHandler = function(args, state) {
    Logger.log('Modern fail handler called with: ' + JSON.stringify(args));
    throw new Error('Modern job failed intentionally');
  };
  this.testModernBackoffHandler = function(args, state) {
    Logger.log('Modern backoff handler called with: ' + JSON.stringify(args) + ', state: ' + JSON.stringify(state));
    if (!state.failCount) state.failCount = 0;
    state.failCount++;
    if (state.failCount < 3) throw new Error('Backoff job failing, attempt ' + state.failCount);
    return { done: true };
  };

  // 8. Run kernel in batch mode
  Logger.log('--- Running kernel in batch mode ---');
  ContinuationOrchestrationKernel({ fullDrain: false });

  // 9. Run kernel in full-drain mode
  Logger.log('--- Running kernel in full-drain mode ---');
  ContinuationOrchestrationKernel({ fullDrain: true });

  // 10. Print final queue and DLQ states
  Logger.log('--- Final distributed queue ---');
  var finalQueue = distributedQueueListAll();
  Logger.log(JSON.stringify(finalQueue, null, 2));
  if (typeof listDeadLetterQueue === 'function') {
    Logger.log('--- Final DLQ ---');
    var finalDLQ = listDeadLetterQueue();
    Logger.log(JSON.stringify(finalDLQ, null, 2));
    // Assertions: Check that failed/invalid jobs are in DLQ
    var dlqIds = finalDLQ.map(function(j) { return j.id || (j.payload && j.payload.id); });
    if (!dlqIds.includes('modern3')) Logger.log('ASSERTION FAILED: modern3 should be in DLQ');
    if (!dlqIds.includes('legacy3')) Logger.log('ASSERTION FAILED: legacy3 should be in DLQ');
    if (!dlqIds.includes('invalid1')) Logger.log('ASSERTION FAILED: invalid1 should be in DLQ');
  }
  // Assertions: Check that dependency job is still pending (if dependency logic is enforced)
  var depJob = finalQueue.find(function(j) { return j.id === 'modernDep'; });
  if (depJob && depJob.status !== 'PENDING') Logger.log('ASSERTION FAILED: modernDep should still be pending due to unresolved dependency');
  Logger.log('--- TEST HARNESS COMPLETE ---');
}

/**
 * Enhanced Command Interpreter ("Agent" Interface)
 * Supports:
 * - Action commands: enqueue jobs, trigger kernel (batch/full-drain), pause/resume/cancel jobs (if supported)
 * - Query commands: process list, DLQ, job status/history, system status
 * - Advanced parameter extraction (dates, priorities, fallback prompts)
 */
function executeSystemCommand(commandString) {
  Logger.log('[Agent] Received command: ' + commandString);
  if (!commandString || typeof commandString !== 'string') {
    Logger.log('[Agent] Invalid command string');
    return { success: false, error: 'Invalid command string' };
  }
  var lowerCmd = commandString.toLowerCase();

  // --- Helper: Parse natural language dates ---
  function parseDateFromCommand(cmd) {
    var today = new Date();
    if (/today/.test(cmd)) return Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (/tomorrow/.test(cmd)) {
      var tmr = new Date(today.getTime() + 24*60*60*1000);
      return Utilities.formatDate(tmr, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    var dateMatch = cmd.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) return dateMatch[0];
    var monthDay = cmd.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i);
    if (monthDay) {
      var year = today.getFullYear();
      var d = new Date(monthDay[0] + ' ' + year);
      if (!isNaN(d)) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    return null;
  }

  // --- Helper: Lookup job by ID or partial match ---
  function findJobByIdOrDesc(idOrDesc) {
    var queue = typeof distributedQueueListAll === 'function' ? distributedQueueListAll() : [];
    var dlq = typeof listDeadLetterQueue === 'function' ? listDeadLetterQueue() : [];
    var all = queue.concat(dlq);
    return all.find(function(j) {
      return (j.id && j.id.toLowerCase() === idOrDesc.toLowerCase()) ||
             (j.taskName && j.taskName.toLowerCase().includes(idOrDesc.toLowerCase())) ||
             (j.originalCommand && j.originalCommand.toLowerCase().includes(idOrDesc.toLowerCase()));
    });
  }

  // --- 1. System/Process/Job Status Queries ---
  if (/\b(list|show|status|queue|dlq|failed|pending|running|processes|job|history|completed|archived)\b/.test(lowerCmd)) {
    if (/\b(dlq|failed)\b/.test(lowerCmd)) {
      if (typeof listDeadLetterQueue === 'function') {
        var dlq = listDeadLetterQueue();
        Logger.log('[Agent] DLQ: ' + JSON.stringify(dlq, null, 2));
        return { success: true, type: 'dlq', jobs: dlq };
      } else {
        Logger.log('[Agent] DLQ listing not available');
        return { success: false, error: 'DLQ listing not available' };
      }
    } else if (/\b(queue|pending|processes)\b/.test(lowerCmd)) {
      var queue = typeof distributedQueueListAll === 'function' ? distributedQueueListAll() : [];
      Logger.log('[Agent] Queue: ' + JSON.stringify(queue, null, 2));
      return { success: true, type: 'queue', jobs: queue };
    } else if (/\b(running|active)\b/.test(lowerCmd)) {
      var running = typeof distributedQueueListAll === 'function' ? distributedQueueListAll().filter(function(j) { return j.status === 'PENDING'; }) : [];
      Logger.log('[Agent] Running jobs: ' + JSON.stringify(running, null, 2));
      return { success: true, type: 'running', jobs: running };
    } else if (/\b(status|summary|system)\b/.test(lowerCmd)) {
      var queue = typeof distributedQueueListAll === 'function' ? distributedQueueListAll() : [];
      var dlq = typeof listDeadLetterQueue === 'function' ? listDeadLetterQueue() : [];
      var summary = {
        queueLength: queue.length,
        dlqLength: dlq.length,
        queue: queue,
        dlq: dlq
      };
      Logger.log('[Agent] System status: ' + JSON.stringify(summary, null, 2));
      return { success: true, type: 'status', summary: summary };
    } else if (/\b(job|status of job|show job|completed|archived|history)\b/.test(lowerCmd)) {
      // Job status/history lookup
      var idMatch = commandString.match(/job\s*([\w-]+)/i);
      var idOrDesc = idMatch ? idMatch[1] : commandString.split('job').pop().trim();
      var job = findJobByIdOrDesc(idOrDesc);
      if (job) {
        Logger.log('[Agent] Job found: ' + JSON.stringify(job, null, 2));
        return { success: true, type: 'job', job: job };
      } else {
        Logger.log('[Agent] No job found for: ' + idOrDesc);
        return { success: false, error: 'No job found for: ' + idOrDesc };
      }
    }
    Logger.log('[Agent] Query command not recognized');
    return { success: false, error: 'Query command not recognized' };
  }

  // --- 2. Kernel Control Commands ---
  if (/\b(drain all|process everything|full-drain|process all|run all)\b/.test(lowerCmd)) {
    Logger.log('[Agent] Triggering ContinuationOrchestrationKernel (full-drain mode)');
    ContinuationOrchestrationKernel({ fullDrain: true });
    return { success: true, action: 'full-drain', message: 'Kernel triggered in full-drain mode.' };
  }
  if (/\b(pause|resume|cancel)\b/.test(lowerCmd)) {
    // These require implementation in your kernel (e.g., a global PAUSED flag, job cancellation logic)
    Logger.log('[Agent] Pause/resume/cancel not implemented in kernel.');
    return { success: false, error: 'Pause/resume/cancel not implemented in kernel.' };
  }

  // --- 3. Action commands: fuzzy match to TASK_REGISTRY, extract parameters, enqueue, and trigger kernel ---
  var bestMatch = null;
  var bestScore = 0;
  for (var taskName in TASK_REGISTRY) {
    var desc = (TASK_REGISTRY[taskName].description || '').toLowerCase();
    var fnName = (TASK_REGISTRY[taskName].functionName || '').toLowerCase();
    var score = 0;
    if (desc && lowerCmd.includes(desc.split(' ')[0])) score += 2;
    if (desc && lowerCmd.includes(desc)) score += 5;
    if (fnName && lowerCmd.includes(fnName)) score += 2;
    var shared = desc.split(' ').filter(function(w) { return lowerCmd.includes(w); }).length;
    score += shared;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = taskName;
    }
  }
  if (!bestMatch) {
    Logger.log('[Agent] No matching task found for command: ' + commandString);
    return { success: false, error: 'No matching task found' };
  }
  var task = TASK_REGISTRY[bestMatch];
  Logger.log('[Agent] Matched command to task: ' + bestMatch);
  // --- Advanced parameter extraction ---
  var args = {};
  if (task.parameters && task.parameters.length) {
    for (var i = 0; i < task.parameters.length; i++) {
      var pname = task.parameters[i].name;
      var regex = new RegExp(pname + '\\s*[:=]\\s*([\w-]+)', 'i');
      var match = commandString.match(regex);
      if (match) {
        args[pname] = match[1];
      } else {
        // Try to parse date
        if (/date|day/i.test(pname)) {
          var parsedDate = parseDateFromCommand(commandString);
          if (parsedDate) args[pname] = parsedDate;
        }
        // Try to parse priority
        if (/priority/i.test(pname)) {
          var prioMatch = commandString.match(/priority\s*[:=]?\s*(high|medium|low|\d+)/i);
          if (prioMatch) args[pname] = prioMatch[1];
        }
        // Try to find a number
        if (!args[pname] && /\d+/.test(commandString)) {
          var numMatch = commandString.match(/\d+/);
          if (numMatch) args[pname] = numMatch[0];
        }
      }
    }
    // Fallback: prompt for missing parameters
    var missing = task.parameters.filter(function(p) { return !args[p.name]; });
    if (missing.length) {
      Logger.log('[Agent] Missing parameters: ' + missing.map(function(p) { return p.name; }).join(', '));
      return { success: false, error: 'Missing parameters: ' + missing.map(function(p) { return p.name; }).join(', '), prompt: true };
    }
  }
  // Enqueue the job
  var job = {
    id: 'agent_' + Utilities.getUuid(),
    taskName: bestMatch,
    args: args,
    status: 'PENDING',
    priority: 10,
    enqueuedBy: 'agent',
    originalCommand: commandString
  };
  try {
    distributedQueueEnqueue(job);
    Logger.log('[Agent] Enqueued job: ' + JSON.stringify(job));
    Logger.log('[Agent] Triggering ContinuationOrchestrationKernel (batch mode)');
    ContinuationOrchestrationKernel({ fullDrain: false });
    return { success: true, job: job, message: 'Job enqueued and kernel triggered.' };
  } catch (e) {
    Logger.log('[Agent] Failed to enqueue or trigger job: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * PAUSE/RESUME/CANCEL support for the kernel (stateless, persistent)
 * Uses PropertiesService for global state.
 * In Apps Script, 'pause' only affects future invocations, not running executions.
 */
function pauseKernel() {
  PropertiesService.getScriptProperties().setProperty('KERNEL_PAUSED', 'true');
  Logger.log('[Kernel] System PAUSED');
}
function resumeKernel() {
  PropertiesService.getScriptProperties().deleteProperty('KERNEL_PAUSED');
  Logger.log('[Kernel] System RESUMED');
}
function isKernelPaused() {
  return PropertiesService.getScriptProperties().getProperty('KERNEL_PAUSED') === 'true';
}
function cancelJobById(jobId) {
  var props = PropertiesService.getScriptProperties();
  var cancelled = JSON.parse(props.getProperty('CANCELLED_JOBS') || '[]');
  if (!cancelled.includes(jobId)) cancelled.push(jobId);
  props.setProperty('CANCELLED_JOBS', JSON.stringify(cancelled));
  Logger.log('[Kernel] Job cancelled: ' + jobId);
}
function isJobCancelled(jobId) {
  var cancelled = JSON.parse(PropertiesService.getScriptProperties().getProperty('CANCELLED_JOBS') || '[]');
  return cancelled.includes(jobId);
}
function clearCancelledJobs() {
  PropertiesService.getScriptProperties().deleteProperty('CANCELLED_JOBS');
}

// --- Refactor kernel for persistent, stateless pause/cancel ---
function ContinuationOrchestrationKernel(options, e) {
  options = options || {};
  const fullDrain = !!options.fullDrain;
  const workerId = 'kernel_async_' + Utilities.getUuid();
  let leaseAcquired = false;
  const maxBatch = 5;
  const executionStart = Date.now();
  const maxExecutionTime = 4 * 60 * 1000;
  let processedCount = 0;

  // --- PAUSE CHECK (stateless, persistent) ---
  if (isKernelPaused()) {
    Logger.log('[Kernel] PAUSED: Exiting without processing jobs.');
    return;
  }

  // Business hours check (Mon-Fri, 8am-5pm)
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 0 || day === 6 || hour < 8 || hour >= 17) {
    Logger.log('ContinuationOrchestrationKernel: Outside business hours, skipping run.');
    return;
  }

  try {
    leaseAcquired = WorkerLeaseManager.acquireLease(workerId);
    if (!leaseAcquired) {
      Logger.log('ContinuationOrchestrationKernel: Failed to acquire lease, another worker is active');
      return;
    }
    const queueStatus = checkQueueStatus ? checkQueueStatus() : { pendingJobs: 0 };
    if (typeof ConcurrencyMonitor !== 'undefined') {
      ConcurrencyMonitor.logQueueDepth(queueStatus.pendingJobs || 0);
    }

    if (fullDrain) {
      const taskName = 'FULL_DRAIN_QUEUE_STATE';
      const continuationFnName = 'ContinuationOrchestrationKernel';
      let state = e && e.state ? e.state : ContinuationManager.loadState(taskName, { row: 2, processed: 0 });
      const sheet = ensureDistributedQueueSheet();
      const lastRow = sheet.getLastRow();
      let processedThisRun = 0;
      while (state.row <= lastRow) {
        const rowValues = sheet.getRange(state.row, 1, 1, sheet.getLastColumn()).getValues()[0];
        if (!rowValues || !rowValues[0]) {
          state.row++;
          continue;
        }
        let job;
        try {
          job = JSON.parse(rowValues[1]);
        } catch (err) {
          job = { id: rowValues[0], legacyPayload: rowValues[1] };
        }
        job.row = state.row;
        // --- CANCEL CHECK (stateless, persistent) ---
        if (isJobCancelled(job.id)) {
          Logger.log('[Kernel] Job ' + job.id + ' is CANCELLED. Marking as CANCELLED and completing.');
          job.status = 'CANCELLED';
          distributedQueueComplete(job.row);
          if (typeof ConcurrencyMonitor !== 'undefined') {
            ConcurrencyMonitor._logMetric('job_cancelled', {
              jobId: job.id,
              jobType: job.taskName,
              workerId: workerId
            });
          }
          state.row++;
          state.processed++;
          processedThisRun++;
          continue;
        }
        const result = processSingleJob(job, {
          workerId,
          mode: 'full-drain',
          maxExecutionTime,
          executionStart
        });
        processedThisRun++;
        state.row++;
        state.processed++;
        if (!ContinuationManager.shouldContinue(executionStart, maxExecutionTime)) {
          Logger.log(`[Kernel] [full-drain] Pausing after ${processedThisRun} jobs, will continue...`);
          ContinuationManager.saveAndContinue(taskName, state, continuationFnName);
          return;
        }
      }
      Logger.log(`[Kernel] [full-drain] Finished. Total jobs processed: ${state.processed}`);
      ContinuationManager.finish(taskName, continuationFnName);
      return;
    }

    // --- Regular Batch Mode (default) ---
    const jobs = distributedQueueListAll()
      .filter(j => j.status === 'PENDING' && j.dependenciesResolved !== false)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, maxBatch);
    for (const job of jobs) {
      Logger.log(`[Kernel] [batch] Selected job ${job.id} of task ${job.taskName}`);
      // --- CANCEL CHECK (stateless, persistent) ---
      if (isJobCancelled(job.id)) {
        Logger.log('[Kernel] Job ' + job.id + ' is CANCELLED. Marking as CANCELLED and completing.');
        job.status = 'CANCELLED';
        distributedQueueComplete(job.row);
        if (typeof ConcurrencyMonitor !== 'undefined') {
          ConcurrencyMonitor._logMetric('job_cancelled', {
            jobId: job.id,
            jobType: job.taskName,
            workerId: workerId
          });
        }
        processedCount++;
        continue;
      }
      processSingleJob(job, {
        workerId,
        mode: 'batch',
        maxExecutionTime,
        executionStart
      });
      processedCount++;
      if ((Date.now() - executionStart) > maxExecutionTime) {
        Logger.log('[Kernel] [batch] Execution time limit reached, stopping');
        break;
      }
    }
  } finally {
    if (leaseAcquired) {
      WorkerLeaseManager.releaseLease(workerId);
    }
    const executionTime = Date.now() - executionStart;
    Logger.log(`[Kernel] Finished run, processed ${processedCount} jobs in ${executionTime}ms`);
    if (typeof ConcurrencyMonitor !== 'undefined') {
      ConcurrencyMonitor._logMetric('worker_performance', {
        workerId: workerId,
        processedCount: processedCount,
        executionTime: executionTime,
        leaseAcquired: leaseAcquired
      });
    }
  }
}

// --- Enhance agent interface for pause/resume/cancel ---
// In Apps Script, pause/resume/cancel only affect future invocations, not running executions.
var _originalExecuteSystemCommand = executeSystemCommand;
executeSystemCommand = function(commandString) {
  var lowerCmd = commandString.toLowerCase();
  if (/\bpause\b/.test(lowerCmd)) {
    pauseKernel();
    return { success: true, action: 'pause', message: 'Kernel paused. (Affects future runs only)' };
  }
  if (/\bresume\b/.test(lowerCmd)) {
    resumeKernel();
    return { success: true, action: 'resume', message: 'Kernel resumed.' };
  }
  if (/\bcancel\b/.test(lowerCmd)) {
    var idMatch = commandString.match(/job\s*([\w-]+)/i);
    var jobId = idMatch ? idMatch[1] : commandString.split('job').pop().trim();
    if (jobId) {
      cancelJobById(jobId);
      return { success: true, action: 'cancel', message: 'Job ' + jobId + ' cancelled. (Affects future runs only)' };
    } else {
      return { success: false, error: 'No job ID specified to cancel.' };
    }
  }
  // Fallback to original agent logic
  return _originalExecuteSystemCommand(commandString);
};

/**
 * Comprehensive system initialization for autonomous bootstrapping.
 * Stages:
 * 1. Boot: Log system boot, check for first-run, set up core state.
 * 2. Populate: Create/populate all Google Sheets, tabs, and Forms as needed.
 * 3. Write variables/constants to a specified Google Sheet for diagnostics.
 * 4. Set up triggers, initialize distributed queue, enqueue self-test.
 * Idempotent: Safe to re-run.
 */
function initializeSystem() {
  // SECURITY: Only allow admins to run
  if (!isAdminUser()) {
    Logger.log('[Security] Unauthorized initializeSystem attempt.');
    throw new Error('Unauthorized: Only admins can initialize the system.');
  }
  Logger.log('=== [System Boot] Sogod Waterworks Appointment System Initialization ===');
  var summary = { boot: null, kernel: null, populate: [], config: null, triggers: null, queue: null, selfTest: null, errors: [], warnings: [], rollbacks: [] };
  var rollbackActions = [];
  try {
    // G. Check for required helper functions
    var requiredFns = [validateResources, modernPopulateResources, validateConsistency, validateDataQuality, setupFreeTierSystem, ensureDistributedQueueSheet, distributedQueueEnqueue];
    var requiredFnNames = ['validateResources', 'modernPopulateResources', 'validateConsistency', 'validateDataQuality', 'setupFreeTierSystem', 'ensureDistributedQueueSheet', 'distributedQueueEnqueue'];
    for (var i = 0; i < requiredFns.length; i++) {
      if (typeof requiredFns[i] !== 'function') {
        var msg = '[Init] Required function missing: ' + requiredFnNames[i];
        Logger.log(msg);
        summary.errors.push(msg);
      }
    }

    // 1. BOOT: Check for first-run, set up core state
    try {
      var props = PropertiesService.getScriptProperties();
      var firstRun = !props.getProperty('SYSTEM_INITIALIZED');
      if (firstRun) {
        Logger.log('[Boot] First run detected.');
        props.setProperty('SYSTEM_INITIALIZED', new Date().toISOString());
        clearCancelledJobs();
        resumeKernel();
      } else {
        Logger.log('[Boot] System already initialized. Proceeding with idempotent setup.');
      }
      summary.boot = 'OK';
    } catch (e) {
      Logger.log('[Boot] Error: ' + e.toString());
      summary.boot = 'ERROR';
      summary.errors.push('Boot: ' + e.toString());
    }

    // 2. KERNEL: Call kernel as first action (before population)
    try {
      Logger.log('[Kernel] Running kernel as first step of initialization...');
      ContinuationOrchestrationKernel({ fullDrain: false });
      summary.kernel = 'OK';
    } catch (e) {
      Logger.log('[Kernel] Error running kernel: ' + e.toString());
      summary.kernel = 'ERROR';
      summary.errors.push('Kernel: ' + e.toString());
    }

    // 3. POPULATE: Create/populate all Sheets, tabs, Forms (with existence checks)
    Logger.log('[Populate] Validating and populating resources...');
    var populationSnapshots = [];
    for (var i = 0; i < FORM_REGISTRY.length; i++) {
      var entry = FORM_REGISTRY[i];
      try {
        var ss = SpreadsheetApp.openById(entry.spreadsheetId);
        var sheet = ss.getSheetByName(entry.sheetName);
        // Take snapshot for rollback if sheet exists
        var snap = sheet ? snapshotSheet(sheet) : { name: entry.sheetName, exists: false, index: 1 };
        populationSnapshots.push({ ssId: entry.spreadsheetId, snap: snap });
        var sheetExists = !!sheet;
        if (!sheetExists) {
          Logger.log('[Populate] Sheet ' + entry.sheetName + ' does not exist, will be created by populator.');
        }
        var report = validateResources(entry.spreadsheetId);
        Logger.log('[Populate] Validation report for ' + entry.sheetName + ': ' + JSON.stringify(report));
        modernPopulateResources(entry.spreadsheetId, { repairOnly: false });
        summary.populate.push({ sheet: entry.sheetName, status: 'OK' });
      } catch (e) {
        Logger.log('[Populate] Error populating resources for ' + entry.sheetName + ': ' + e.toString());
        summary.populate.push({ sheet: entry.sheetName, status: 'ERROR', error: e.toString() });
        summary.errors.push('Populate ' + entry.sheetName + ': ' + e.toString());
        // Register rollback for all previous population
        rollbackActions.push(function() {
          Logger.log('[Rollback] Restoring sheets from population snapshots...');
          for (var j = 0; j < populationSnapshots.length; j++) {
            var snapObj = populationSnapshots[j];
            var ss2 = SpreadsheetApp.openById(snapObj.ssId);
            if (snapObj.snap.exists) {
              restoreSheetFromSnapshot(ss2, snapObj.snap);
              Logger.log('[Rollback] Restored sheet: ' + snapObj.snap.name);
            } else {
              var s = ss2.getSheetByName(snapObj.snap.name);
              if (s) ss2.deleteSheet(s);
              Logger.log('[Rollback] Deleted created sheet: ' + snapObj.snap.name);
            }
          }
          summary.rollbacks.push('Population: Rolled back sheet changes.');
        });
        break; // Stop further population on error
      }
    }
    try {
      for (var i = 0; i < FORM_REGISTRY.length; i++) {
        var entry = FORM_REGISTRY[i];
        validateConsistency(entry.spreadsheetId);
        validateDataQuality(entry.spreadsheetId);
      }
    } catch (e) {
      Logger.log('[Populate] Error in consistency/data quality checks: ' + e.toString());
      summary.errors.push('Consistency/DataQuality: ' + e.toString());
    }

    // 4. WRITE VARIABLES/CONSTANTS TO SHEET (preserve extra columns/data)
    var configSheetName = 'SystemConfig';
    var configSpreadsheetId = FORM_REGISTRY[0].spreadsheetId;
    var ss = SpreadsheetApp.openById(configSpreadsheetId);
    // --- Autonomous backup/versioning before config write ---
    backupSheetWithTimestamp(ss, configSheetName, 'SystemConfig_backup_');
    var configSheet = ss.getSheetByName(configSheetName) || ss.insertSheet(configSheetName);
    var configVars = [
      ['Key', 'Value'],
      ['SCRIPT_VERSION', typeof SCRIPT_VERSION !== 'undefined' ? SCRIPT_VERSION : ''],
      ['IS_DEV', typeof IS_DEV !== 'undefined' ? IS_DEV : ''],
      ['SLOT_CAP', typeof ConfigService.get('SLOT_CAP', 20) !== 'undefined' ? ConfigService.get('SLOT_CAP', 20) : ''],
      ['FUTURE_DAYS', typeof ConfigService.get('FUTURE_DAYS', 60) !== 'undefined' ? ConfigService.get('FUTURE_DAYS', 60) : ''],
      ['RESPONSE_RETENTION_DAYS', typeof RESPONSE_RETENTION_DAYS !== 'undefined' ? RESPONSE_RETENTION_DAYS : ''],
      ['BUSINESS_DAYS_WINDOW', typeof BUSINESS_DAYS_WINDOW !== 'undefined' ? BUSINESS_DAYS_WINDOW : ''],
      ['BATCH_DAYS_WINDOW', typeof BATCH_DAYS_WINDOW !== 'undefined' ? BATCH_DAYS_WINDOW : ''],
      ['CALENDAR_API_CALL_LIMIT_PER_RUN', typeof CALENDAR_API_CALL_LIMIT_PER_RUN !== 'undefined' ? CALENDAR_API_CALL_LIMIT_PER_RUN : ''],
      ['CALENDAR_API_CALL_LIMIT_PER_DAY', typeof CALENDAR_API_CALL_LIMIT_PER_DAY !== 'undefined' ? CALENDAR_API_CALL_LIMIT_PER_DAY : ''],
      ['HOLIDAY_CAL_ID', typeof HOLIDAY_CAL_ID !== 'undefined' ? HOLIDAY_CAL_ID : ''],
      ['BARANGAY_LIST', typeof BARANGAY_LIST !== 'undefined' ? BARANGAY_LIST.join(', ') : ''],
      ['SYSTEM_INITIALIZED', PropertiesService.getScriptProperties().getProperty('SYSTEM_INITIALIZED')],
      ['LAST_INIT', new Date().toISOString()]
    ];
    try {
      var existing = configSheet.getDataRange().getValues();
      var keyIndex = {};
      for (var i = 1; i < existing.length; i++) {
        keyIndex[existing[i][0]] = i;
      }
      for (var i = 1; i < configVars.length; i++) {
        if (keyIndex[configVars[i][0]]) {
          configSheet.getRange(keyIndex[configVars[i][0]] + 1, 2).setValue(configVars[i][1]);
        } else {
          configSheet.appendRow(configVars[i]);
        }
      }
      summary.config = 'OK';
      // Rollback action: revert config changes (not full rollback, but logs intent)
      rollbackActions.push(function() {
        Logger.log('[Rollback] No direct config rollback implemented (manual review required).');
        summary.rollbacks.push('Config: Manual review required for rollback.');
      });
    } catch (e) {
      Logger.log('[Config] Error writing config sheet: ' + e.toString());
      summary.config = 'ERROR';
      summary.errors.push('Config: ' + e.toString());
      // Rollback: attempt to revert config changes (not possible, so log intent)
      rollbackActions.push(function() {
        Logger.log('[Rollback] Config write failed, no rollback possible.');
        summary.rollbacks.push('Config: No rollback possible.');
      });
    }

    // 5. SETUP TRIGGERS, INIT QUEUE, ENQUEUE SELF-TEST
    try {
      Logger.log('[Triggers] Checking/setting up triggers...');
      var triggers = ScriptApp.getProjectTriggers();
      var triggerExists = triggers.some(function(t) {
        return t.getHandlerFunction() === 'ContinuationOrchestrationKernel';
      });
      if (!triggerExists) {
        setupFreeTierSystem();
        summary.triggers = 'CREATED';
        // Rollback: remove triggers if needed
        rollbackActions.push(function() {
          Logger.log('[Rollback] Removing triggers created by initializeSystem.');
          var triggers = ScriptApp.getProjectTriggers();
          triggers.forEach(function(t) {
            if (t.getHandlerFunction() === 'ContinuationOrchestrationKernel') {
              ScriptApp.deleteTrigger(t);
              summary.rollbacks.push('Triggers: Removed ContinuationOrchestrationKernel trigger.');
            }
          });
        });
      } else {
        Logger.log('[Triggers] Triggers already exist, skipping setup.');
        summary.triggers = 'EXISTED';
      }
    } catch (e) {
      Logger.log('[Triggers] Error setting up triggers: ' + e.toString());
      summary.triggers = 'ERROR';
      summary.errors.push('Triggers: ' + e.toString());
      // Rollback: remove triggers if setup failed
      rollbackActions.push(function() {
        Logger.log('[Rollback] Removing triggers after setup failure.');
        var triggers = ScriptApp.getProjectTriggers();
        triggers.forEach(function(t) {
          if (t.getHandlerFunction() === 'ContinuationOrchestrationKernel') {
            ScriptApp.deleteTrigger(t);
            summary.rollbacks.push('Triggers: Removed ContinuationOrchestrationKernel trigger after failure.');
          }
        });
      });
    }
    try {
      var queueSheetExists = false;
      try {
        var ss = SpreadsheetApp.openById(FORM_REGISTRY[0].spreadsheetId);
        queueSheetExists = !!ss.getSheetByName('DistributedQueue');
      } catch (e) {}
      if (!queueSheetExists) {
        ensureDistributedQueueSheet();
        summary.queue = 'CREATED';
        // Rollback: delete queue sheet if needed
        rollbackActions.push(function() {
          Logger.log('[Rollback] Deleting DistributedQueue sheet created by initializeSystem.');
          var ss = SpreadsheetApp.openById(FORM_REGISTRY[0].spreadsheetId);
          var sheet = ss.getSheetByName('DistributedQueue');
          if (sheet) {
            ss.deleteSheet(sheet);
            summary.rollbacks.push('Queue: Deleted DistributedQueue sheet.');
          }
        });
      } else {
        Logger.log('[Queue] Distributed queue sheet already exists, skipping creation.');
        summary.queue = 'EXISTED';
      }
    } catch (e) {
      Logger.log('[Queue] Error ensuring distributed queue sheet: ' + e.toString());
      summary.queue = 'ERROR';
      summary.errors.push('Queue: ' + e.toString());
      // Rollback: attempt to delete queue sheet if setup failed
      rollbackActions.push(function() {
        Logger.log('[Rollback] Deleting DistributedQueue sheet after setup failure.');
        var ss = SpreadsheetApp.openById(FORM_REGISTRY[0].spreadsheetId);
        var sheet = ss.getSheetByName('DistributedQueue');
        if (sheet) {
          ss.deleteSheet(sheet);
          summary.rollbacks.push('Queue: Deleted DistributedQueue sheet after failure.');
        }
      });
    }
    try {
      var queue = typeof distributedQueueListAll === 'function' ? distributedQueueListAll() : [];
      var selfTestExists = queue.some(function(j) {
        return j.taskName === 'productionSystemDiagnostics' && j.status === 'PENDING';
      });
      if (!selfTestExists) {
        distributedQueueEnqueue({
          id: 'selftest_' + Utilities.getUuid(),
          taskName: 'productionSystemDiagnostics',
          args: {},
          status: 'PENDING',
          priority: 100,
          enqueuedBy: 'system',
          originalCommand: 'self-test on init'
        });
        Logger.log('[SelfTest] Enqueued productionSystemDiagnostics job.');
        summary.selfTest = 'ENQUEUED';
        // Rollback: remove self-test job if needed (cannot remove from queue, so log intent)
        rollbackActions.push(function() {
          Logger.log('[Rollback] Self-test job cannot be removed from queue (manual review required).');
          summary.rollbacks.push('SelfTest: Manual review required to remove self-test job.');
        });
      } else {
        Logger.log('[SelfTest] Self-test job already pending, not enqueuing duplicate.');
        summary.selfTest = 'EXISTED';
      }
    } catch (e) {
      Logger.log('[SelfTest] Error enqueuing self-test: ' + e.toString());
      summary.selfTest = 'ERROR';
      summary.errors.push('SelfTest: ' + e.toString());
      // Rollback: log intent (cannot remove from queue)
      rollbackActions.push(function() {
        Logger.log('[Rollback] Self-test job cannot be removed from queue after failure (manual review required).');
        summary.rollbacks.push('SelfTest: Manual review required to remove self-test job after failure.');
      });
    }

    // E. Write summary to SystemInitLog sheet
    try {
      var logSheetName = 'SystemInitLog';
      var logSpreadsheetId = FORM_REGISTRY[0].spreadsheetId;
      var ss = SpreadsheetApp.openById(logSpreadsheetId);
      // --- Autonomous backup/versioning before log write ---
      backupSheetWithTimestamp(ss, logSheetName, 'SystemInitLog_backup_');
      var logSheet = ss.getSheetByName(logSheetName) || ss.insertSheet(logSheetName);
      logSheet.appendRow([new Date().toISOString(), JSON.stringify(summary)]);
      logAudit('InitSummary', summary);
    } catch (e) {
      Logger.log('[InitLog] Error writing summary to SystemInitLog: ' + e.toString());
      summary.warnings.push('InitLog: ' + e.toString());
    }
    // E. Optionally send email if there are errors
    try {
      if (summary.errors.length && typeof Session !== 'undefined' && Session.getActiveUser) {
        var user = Session.getActiveUser().getEmail();
        if (SYSTEM_ADMINS.indexOf(user) !== -1) {
          MailApp.sendEmail(user, 'System Initialization Errors', JSON.stringify(summary, null, 2));
        }
      }
    } catch (e) {
      Logger.log('[InitEmail] Error sending error notification: ' + e.toString());
      summary.warnings.push('InitEmail: ' + e.toString());
    }
    Logger.log('=== [System Boot] Initialization complete. ===');
    Logger.log('[System Boot] Summary: ' + JSON.stringify(summary, null, 2));
    return summary;
  } catch (e) {
    Logger.log('[System Boot] Initialization failed: ' + e.toString());
    // Rollback all background stages if a top-level error occurs
    for (var i = rollbackActions.length - 1; i >= 0; i--) {
      try { rollbackActions[i](); logAudit('Rollback', { index: i }); } catch (err) { Logger.log('[Rollback] Error during rollback: ' + err); }
    }
    return { success: false, error: e.toString(), rollbacks: summary.rollbacks };
  }
}

// --- SECURITY: Admin allowlist for all critical operations ---
var SYSTEM_ADMINS = [
  // Add your admin emails here. Ignore the placeholder.
  'your.admin@email.com',
  // Add more as needed
];

function isAdminUser() {
  try {
    var user = (typeof Session !== 'undefined' && Session.getActiveUser) ? Session.getActiveUser().getEmail() : null;
    return user && SYSTEM_ADMINS.indexOf(user) !== -1;
  } catch (e) {
    Logger.log('[Security] Error checking admin user: ' + e);
    return false;
  }
}

// --- SECURITY: Audit log for destructive/rollback actions ---
function logAudit(action, details) {
  try {
    var logSheetName = 'SystemAuditLog';
    var logSpreadsheetId = FORM_REGISTRY[0].spreadsheetId;
    var ss = SpreadsheetApp.openById(logSpreadsheetId);
    var logSheet = ss.getSheetByName(logSheetName) || ss.insertSheet(logSheetName);
    logSheet.appendRow([new Date().toISOString(), action, JSON.stringify(details)]);
  } catch (e) {
    Logger.log('[AuditLog] Error writing to SystemAuditLog: ' + e);
  }
}

// --- SECURITY: Sanitize agent command input ---
function sanitizeCommandInput(cmd) {
  if (typeof cmd !== 'string') return '';
  // Remove dangerous characters, limit length, log suspicious input
  var clean = cmd.replace(/[<>"'`;=]/g, '').substring(0, 500);
  if (clean !== cmd) Logger.log('[Security] Suspicious agent command input sanitized: ' + cmd);
  return clean;
}

// --- SECURITY: Restrict agent interface to admins, sanitize input ---
var _originalExecuteSystemCommand = executeSystemCommand;
executeSystemCommand = function(commandString) {
  if (!isAdminUser()) {
    Logger.log('[Security] Unauthorized agent command attempt.');
    throw new Error('Unauthorized: Only admins can use the agent interface.');
  }
  var cleanCommand = sanitizeCommandInput(commandString);
  return _originalExecuteSystemCommand(cleanCommand);
};

/**
 * Helper: Create a timestamped backup of a sheet (for versioning)
 * @param {Spreadsheet} ss - The spreadsheet object
 * @param {string} sheetName - The name of the sheet to backup
 * @param {string} [prefix] - Optional prefix for backup sheet name
 * @return {Sheet|null} The backup sheet, or null if not found
 */
function backupSheetWithTimestamp(ss, sheetName, prefix) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var backupName = (prefix || sheetName + '_backup_') + timestamp;
  var backup = sheet.copyTo(ss).setName(backupName);
  Logger.log('[Backup] Created backup: ' + backupName);
  return backup;
}

/**
 * Helper: Snapshot a sheet's data and structure for rollback
 * @param {Sheet} sheet
 * @return {Object} Snapshot object
 */
function snapshotSheet(sheet) {
  if (!sheet) return null;
  return {
    name: sheet.getName(),
    data: sheet.getDataRange().getValues(),
    exists: true,
    index: sheet.getIndex(),
    frozenRows: sheet.getFrozenRows(),
    frozenCols: sheet.getFrozenColumns(),
    hidden: sheet.isSheetHidden(),
    tabColor: sheet.getTabColor(),
    // Add more properties as needed
  };
}

/**
 * Helper: Restore a sheet from snapshot (for rollback)
 * @param {Spreadsheet} ss
 * @param {Object} snap
 */
function restoreSheetFromSnapshot(ss, snap) {
  var sheet = ss.getSheetByName(snap.name);
  if (!sheet) {
    sheet = ss.insertSheet(snap.name, snap.index);
  } else {
    sheet.clear();
  }
  sheet.getRange(1, 1, snap.data.length, snap.data[0].length).setValues(snap.data);
  if (snap.frozenRows) sheet.setFrozenRows(snap.frozenRows);
  if (snap.frozenCols) sheet.setFrozenColumns(snap.frozenCols);
  if (snap.hidden) sheet.hideSheet(); else sheet.showSheet();
  if (snap.tabColor) sheet.setTabColor(snap.tabColor);
}

/**
 * Garbage-collects old rows from a log sheet by max row count and/or max age (days).
 * Logs all deletions to the audit log.
 *
 * NOTE: This is now a FALLBACK/EMERGENCY tool only.
 * Use AI/agentic data consolidation for all regular log/metric cleanup.
 */
function garbageCollectLogSheet(sheetName, options) {
  var maxRows = options.maxRows || 1000;
  var maxAgeDays = options.maxAgeDays || 30;
  var ss = SpreadsheetApp.openById(FORM_REGISTRY[0].spreadsheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  var now = new Date();
  var data = sheet.getDataRange().getValues();
  var rowsToDelete = [];
  // Delete by age
  for (var i = 1; i < data.length; i++) {
    var rowDate = new Date(data[i][0]);
    if ((now - rowDate) / (1000 * 60 * 60 * 24) > maxAgeDays) {
      rowsToDelete.push(i + 1);
    }
  }
  // If still too many rows, delete oldest
  var remainingRows = data.length - rowsToDelete.length;
  if (remainingRows > maxRows) {
    var extra = remainingRows - maxRows;
    for (var i = 1; i <= extra; i++) {
      if (!rowsToDelete.includes(i + 1)) rowsToDelete.push(i + 1);
    }
  }
  // Delete in reverse order to avoid shifting
  rowsToDelete.sort(function(a, b) { return b - a; }).forEach(function(r) { sheet.deleteRow(r); });
  if (rowsToDelete.length) logAudit('GarbageCollectLogSheet', { sheetName: sheetName, rowsDeleted: rowsToDelete.length });
}

/**
 * Garbage-collects old or orphaned save states from PropertiesService.
 * Deletes CONT_STATE_* keys older than maxAgeDays.
 * Logs all deletions to the audit log.
 *
 * NOTE: This is now a FALLBACK/EMERGENCY tool only.
 * Use AI/agentic data consolidation for all regular log/metric cleanup.
 */
function garbageCollectSaveStates(options) {
  var maxAgeDays = options.maxAgeDays || 30;
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var now = Date.now();
  var deleted = 0;
  Object.keys(all).forEach(function(key) {
    if (key.startsWith('CONT_STATE_')) {
      try {
        var state = JSON.parse(all[key]);
        var ts = state.lastModified || state.timestamp || 0;
        if (ts && (now - ts) / (1000 * 60 * 60 * 24) > maxAgeDays) {
          props.deleteProperty(key);
          deleted++;
        }
      } catch (e) {
        // If state is invalid or missing timestamp, delete as orphaned
        props.deleteProperty(key);
        deleted++;
      }
    }
  });
  if (deleted) logAudit('GarbageCollectSaveStates', { deleted: deleted });
}

/**
 * Orchestrated system garbage collection: logs and save states.
 * Can be triggered by agent, kernel, or schedule.
 *
 * NOTE: This is now a FALLBACK/EMERGENCY tool only.
 * Use AI/agentic data consolidation for all regular log/metric cleanup.
 */
function garbageCollectSystem() {
  garbageCollectLogSheet('SystemInitLog', { maxRows: 1000, maxAgeDays: 30 });
  garbageCollectLogSheet('SystemAuditLog', { maxRows: 1000, maxAgeDays: 90 });
  garbageCollectSaveStates({ maxAgeDays: 30 });
}

// Add to TASK_REGISTRY for agentic invocation
if (typeof TASK_REGISTRY !== 'undefined') {
  TASK_REGISTRY.garbageCollectSystem = {
    functionName: 'garbageCollectSystem',
    description: 'Prunes old log entries and obsolete save states.',
    parameters: [],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  };
}

/**
 * Enhanced: Consolidates raw performance log data into daily summaries.
 * For each day, computes total jobs, average duration, total API calls, errors, etc.
 * Stores summary in PerformanceSummary sheet, then deletes raw rows for that day if older than retention period.
 * Uses batch deletion and AI/agent-driven retention policy.
 */
function consolidatePerformanceLog() {
  var ss = SpreadsheetApp.openById(FORM_REGISTRY[0].spreadsheetId);
  var logSheet = ss.getSheetByName('PerformanceLog_v1');
  if (!logSheet) return;
  var summarySheet = ss.getSheetByName('PerformanceSummary') || ss.insertSheet('PerformanceSummary');
  var data = logSheet.getDataRange().getValues();
  if (data.length < 2) return; // No data
  var header = data[0];
  var byDay = {};
  var now = new Date();
  var retentionDays = getMetricsRetentionDays();
  var rowsToDelete = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var date = new Date(row[0]);
    var dayKey = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push({row: row, idx: i});
  }
  for (var day in byDay) {
    var rows = byDay[day];
    var totalDuration = 0, totalJobs = 0, totalApi = 0, errors = 0, lastBatch = 0;
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j].row;
      totalDuration += Number(r[2] || 0); // TotalDurationMs
      totalJobs++;
      totalApi += Number(r[4] || 0); // TotalApiCalls
      lastBatch = Number(r[7] || 0); // LastBatchSize
      if (r[8] && r[8].toString().toLowerCase().includes('error')) errors++;
    }
    var avgDuration = totalJobs ? totalDuration / totalJobs : 0;
    var avgApi = totalJobs ? totalApi / totalJobs : 0;
    summarySheet.appendRow([day, totalJobs, avgDuration, totalApi, avgApi, errors, lastBatch]);
    // Mark all rows for this day for deletion if older than retention period
    for (var j = 0; j < rows.length; j++) {
      var rowDate = new Date(rows[j].row[0]);
      if ((now - rowDate) / (1000*60*60*24) > retentionDays) {
        rowsToDelete.push(rows[j].idx + 1); // +1 for 1-based
      }
    }
  }
  // Batch delete in reverse order
  batchDeleteRows(logSheet, rowsToDelete);
  if (rowsToDelete.length) logAudit('ConsolidatePerformanceLog', { days: Object.keys(byDay).length, rowsDeleted: rowsToDelete.length });
}

/**
 * Orchestrated system data consolidation: performance logs, metrics, etc.
 * Use consolidation for metrics, garbage collection for true logs.
 */
function consolidateSystemMetrics() {
  consolidatePerformanceLog();
  // Add more consolidation functions here as needed (e.g., for ConcurrencyMonitor, etc.)
}

// Add to TASK_REGISTRY for agentic invocation
if (typeof TASK_REGISTRY !== 'undefined') {
  TASK_REGISTRY.consolidateSystemMetrics = {
    functionName: 'consolidateSystemMetrics',
    description: 'Consolidates raw metrics into summaries (e.g., performance logs).',
    parameters: [],
    resourceCost: 'LOW', retryPolicy: 'none', dependencies: []
  };
}

/**
 * Consolidates ConcurrencyMonitor metrics into daily summaries by type.
 * Summarizes queue depth, lock wait, and task processing metrics.
 * Stores in ConcurrencySummary, deletes raw rows after consolidation.
 */
function consolidateConcurrencyMonitor() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONCURRENCY_MONITOR_SHEET);
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // Only header
  var header = data[0];
  var rows = data.slice(1);
  var byDayType = {};
  var retentionDays = getMetricsRetentionDays();
  var now = new Date();
  var keepRows = [];
  var deleteRows = [];
  rows.forEach(function(row, idx) {
    var ts = new Date(row[0]);
    var day = ts.getFullYear() + '-' + String(ts.getMonth()+1).padStart(2,'0') + '-' + String(ts.getDate()).padStart(2,'0');
    var type = row[1];
    var payload = {};
    try { payload = JSON.parse(row[2]); } catch(e) {}
    if (!byDayType[day]) byDayType[day] = {};
    if (!byDayType[day][type]) byDayType[day][type] = [];
    byDayType[day][type].push(payload);
    // Retention: keep if within retentionDays
    if ((now - ts) / (1000*60*60*24) < retentionDays) keepRows.push(idx+2); // +2 for 1-based, skip header
    else deleteRows.push(idx+2);
  });
  var summarySheet = ss.getSheetByName('ConcurrencySummary') || ss.insertSheet('ConcurrencySummary');
  if (summarySheet.getLastRow() === 0) summarySheet.appendRow(['date','type','count','avg','max','min','details']);
  Object.keys(byDayType).forEach(function(day) {
    Object.keys(byDayType[day]).forEach(function(type) {
      var vals = byDayType[day][type];
      var count = vals.length;
      var nums = [];
      if (type === 'queue_depth') nums = vals.map(v=>v.depth);
      else if (type === 'lock_wait') nums = vals.map(v=>v.waitMs);
      else if (type === 'task_processing') nums = vals.map(v=>v.ms);
      else if (type === 'function_perf') nums = vals.map(v=>v.ms);
      else nums = [];
      var avg = nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length) : '';
      var max = nums.length ? Math.max.apply(null,nums) : '';
      var min = nums.length ? Math.min.apply(null,nums) : '';
      var details = '';
      if (type === 'lock_wait') details = vals.map(v=>v.lockType).join(',');
      else if (type === 'task_processing') details = vals.map(v=>v.taskType).join(',');
      summarySheet.appendRow([day,type,count,avg,max,min,details]);
    });
  });
  // Batch delete only rows older than retention period
  batchDeleteRows(sheet, deleteRows);
}

/**
 * Consolidates error logs from script properties into daily/context summaries.
 * Summarizes error count, unique messages, first/last occurrence.
 * Stores in ErrorSummary sheet, deletes raw errors after consolidation.
 */
function consolidateErrorLogs() {
  var props = PropertiesService.getScriptProperties();
  var errors = JSON.parse(props.getProperty('RECENT_ERRORS') || '[]');
  if (!errors.length) return;
  var byDayContext = {};
  var retentionDays = getMetricsRetentionDays();
  var now = new Date();
  var keepErrors = [];
  var deleteErrors = [];
  errors.forEach(function(err, idx) {
    var ts = err.timestamp ? new Date(err.timestamp) : null;
    if (ts && (now - ts) / (1000*60*60*24) < retentionDays) keepErrors.push(err);
    else deleteErrors.push(err);
    var day = ts ? ts.toISOString().substr(0,10) : 'unknown';
    var ctx = err.context || 'unknown';
    if (!byDayContext[day]) byDayContext[day] = {};
    if (!byDayContext[day][ctx]) byDayContext[day][ctx] = [];
    byDayContext[day][ctx].push(err);
  });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summarySheet = ss.getSheetByName('ErrorSummary') || ss.insertSheet('ErrorSummary');
  if (summarySheet.getLastRow() === 0) summarySheet.appendRow(['date','context','errorCount','uniqueMessages','firstOccurrence','lastOccurrence']);
  Object.keys(byDayContext).forEach(function(day) {
    Object.keys(byDayContext[day]).forEach(function(ctx) {
      var errs = byDayContext[day][ctx];
      var errorCount = errs.length;
      var uniqueMessages = Array.from(new Set(errs.map(e=>e.message))).join('; ');
      var first = errs[errs.length-1].timestamp;
      var last = errs[0].timestamp;
      summarySheet.appendRow([day,ctx,errorCount,uniqueMessages,first,last]);
    });
  });
  // Only keep errors within retention period
  props.setProperty('RECENT_ERRORS', JSON.stringify(keepErrors));
}

/**
 * Consolidates all system metrics and logs as appropriate.
 * Called by agent/kernel or scheduled trigger.
 * Uses consolidation for metrics, garbage collection for true logs.
 */
function consolidateSystemMetrics() {
  consolidatePerformanceLog();
  consolidateConcurrencyMonitor();
  consolidateErrorLogs();
  // Add more as needed
}

/**
 * Returns the current retention period (in days) for raw metrics/logs.
 * Default is 7 days, can be set by agent/kernel.
 */
function getMetricsRetentionDays() {
  var props = PropertiesService.getScriptProperties();
  var days = parseInt(props.getProperty('METRICS_RETENTION_DAYS') || '7', 10);
  return isNaN(days) ? 7 : days;
}

/**
 * Sets the retention period (in days) for raw metrics/logs.
 * Can be called by agent/kernel/AI.
 */
function setMetricsRetentionDays(days) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('METRICS_RETENTION_DAYS', String(days));
}

/**
 * Batch deletes rows from a sheet, given a list of row indices (1-based, excluding header).
 * Deletes in reverse order in batches of 100 to avoid Apps Script limits.
 */
function batchDeleteRows(sheet, rowIndices) {
  rowIndices.sort((a,b)=>b-a); // Descending
  while (rowIndices.length) {
    var batch = rowIndices.splice(0, 100);
    batch.forEach(function(rowIdx) {
      sheet.deleteRow(rowIdx);
    });
  }
}

/**
 * Enhanced: Consolidates ConcurrencyMonitor metrics, keeps last N days of raw data, batch deletes old rows.
 */
function consolidateConcurrencyMonitor() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONCURRENCY_MONITOR_SHEET);
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // Only header
  var header = data[0];
  var rows = data.slice(1);
  var byDayType = {};
  var retentionDays = getMetricsRetentionDays();
  var now = new Date();
  var keepRows = [];
  var deleteRows = [];
  rows.forEach(function(row, idx) {
    var ts = new Date(row[0]);
    var day = ts.getFullYear() + '-' + String(ts.getMonth()+1).padStart(2,'0') + '-' + String(ts.getDate()).padStart(2,'0');
    var type = row[1];
    var payload = {};
    try { payload = JSON.parse(row[2]); } catch(e) {}
    if (!byDayType[day]) byDayType[day] = {};
    if (!byDayType[day][type]) byDayType[day][type] = [];
    byDayType[day][type].push(payload);
    // Retention: keep if within retentionDays
    if ((now - ts) / (1000*60*60*24) < retentionDays) keepRows.push(idx+2); // +2 for 1-based, skip header
    else deleteRows.push(idx+2);
  });
  var summarySheet = ss.getSheetByName('ConcurrencySummary') || ss.insertSheet('ConcurrencySummary');
  if (summarySheet.getLastRow() === 0) summarySheet.appendRow(['date','type','count','avg','max','min','details']);
  Object.keys(byDayType).forEach(function(day) {
    Object.keys(byDayType[day]).forEach(function(type) {
      var vals = byDayType[day][type];
      var count = vals.length;
      var nums = [];
      if (type === 'queue_depth') nums = vals.map(v=>v.depth);
      else if (type === 'lock_wait') nums = vals.map(v=>v.waitMs);
      else if (type === 'task_processing') nums = vals.map(v=>v.ms);
      else if (type === 'function_perf') nums = vals.map(v=>v.ms);
      else nums = [];
      var avg = nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length) : '';
      var max = nums.length ? Math.max.apply(null,nums) : '';
      var min = nums.length ? Math.min.apply(null,nums) : '';
      var details = '';
      if (type === 'lock_wait') details = vals.map(v=>v.lockType).join(',');
      else if (type === 'task_processing') details = vals.map(v=>v.taskType).join(',');
      summarySheet.appendRow([day,type,count,avg,max,min,details]);
    });
  });
  // Batch delete only rows older than retention period
  batchDeleteRows(sheet, deleteRows);
}

/**
 * Enhanced: Consolidates error logs, keeps last N days, batch deletes old errors.
 */
function consolidateErrorLogs() {
  var props = PropertiesService.getScriptProperties();
  var errors = JSON.parse(props.getProperty('RECENT_ERRORS') || '[]');
  if (!errors.length) return;
  var byDayContext = {};
  var retentionDays = getMetricsRetentionDays();
  var now = new Date();
  var keepErrors = [];
  var deleteErrors = [];
  errors.forEach(function(err, idx) {
    var ts = err.timestamp ? new Date(err.timestamp) : null;
    if (ts && (now - ts) / (1000*60*60*24) < retentionDays) keepErrors.push(err);
    else deleteErrors.push(err);
    var day = ts ? ts.toISOString().substr(0,10) : 'unknown';
    var ctx = err.context || 'unknown';
    if (!byDayContext[day]) byDayContext[day] = {};
    if (!byDayContext[day][ctx]) byDayContext[day][ctx] = [];
    byDayContext[day][ctx].push(err);
  });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summarySheet = ss.getSheetByName('ErrorSummary') || ss.insertSheet('ErrorSummary');
  if (summarySheet.getLastRow() === 0) summarySheet.appendRow(['date','context','errorCount','uniqueMessages','firstOccurrence','lastOccurrence']);
  Object.keys(byDayContext).forEach(function(day) {
    Object.keys(byDayContext[day]).forEach(function(ctx) {
      var errs = byDayContext[day][ctx];
      var errorCount = errs.length;
      var uniqueMessages = Array.from(new Set(errs.map(e=>e.message))).join('; ');
      var first = errs[errs.length-1].timestamp;
      var last = errs[0].timestamp;
      summarySheet.appendRow([day,ctx,errorCount,uniqueMessages,first,last]);
    });
  });
  // Only keep errors within retention period
  props.setProperty('RECENT_ERRORS', JSON.stringify(keepErrors));
}

/**
 * Schedules or unschedules the consolidation trigger. Can be called by agent/kernel/AI.
 * If enable=true, sets up a daily trigger. If false, removes it.
 */
function setConsolidationScheduled(enable) {
  var triggers = ScriptApp.getProjectTriggers();
  var found = triggers.find(t => t.getHandlerFunction() === 'consolidateSystemMetrics');
  if (enable && !found) {
    ScriptApp.newTrigger('consolidateSystemMetrics').timeBased().everyDays(1).create();
  } else if (!enable && found) {
    ScriptApp.deleteTrigger(found);
  }
}

/**
 * Handler for PROCESS_FORM_SUBMISSION jobs. Performs deduplication, booking, and enqueues side-effects.
 * @param {Object} args - { payload }
 */
function processFormSubmissionJob(args) {
  try {
    // --- Robust payload validation ---
    if (!args || typeof args !== 'object' || !args.payload) {
      throw new Error('processFormSubmissionJob: Invalid or missing payload');
    }
    const payload = args.payload;
    if (!payload.rowData || !payload.registry || !payload.dateString || !payload.idempotencyKey) {
      throw new Error('processFormSubmissionJob: Payload missing required fields');
    }
    // --- Advanced deduplication: override old entries ---
    const dedupKey = [payload.rowData.lastName, payload.rowData.firstName, payload.rowData.barangay, payload.dateString].join('|');
    const sheet = getSpreadsheet(payload.registry).getSheetByName(payload.registry.sheetName);
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) { // skip header
      const [ts, lastName, firstName, purok, barangay, dateOfAppt] = data[i];
      const rowKey = [lastName, firstName, barangay, (dateOfAppt || '').split(' ')[0]].join('|');
      if (rowKey === dedupKey) {
        sheet.deleteRow(i + 1); // delete old duplicate
      }
    }
    if (_isRequestDuplicate(payload.idempotencyKey)) {
      Logger.log(`processFormSubmissionJob: Duplicate request, skipping: ${payload.idempotencyKey}`);
      return;
    }
    const wasProcessed = _processBooking(payload);
    if (wasProcessed) {
      _enqueueSideEffects(payload);
      _markRequestAsProcessed(payload.idempotencyKey);
      Logger.log('processFormSubmissionJob: Submission processed and jobs enqueued.');
      updateFormDropdownForDate(payload.registry, payload.dateString);
    }
  } catch (err) {
    ErrorService.sendThrottledError('processFormSubmissionJob', err, args);
  }
}

/**
 * Refactored setupFreeTierSystem: Uses FreeTierTriggerManager for all triggers, agentic-invokable.
 */
function setupFreeTierSystemTask(args) {
  Logger.log('setupFreeTierSystemTask: Starting free-tier system setup');
  try {
    FreeTierTriggerManager.setupFreeTierTriggers();
    FreeTierTriggerManager.setupSystemHealthDigestTrigger();
    CalendarQuotaManager.initRun();
    generateUnifiedAppointmentList();
    FreeTierTriggerManager.listAllTriggers();
    Logger.log('setupFreeTierSystemTask: Free-tier system setup completed successfully');
  } catch (e) {
    Logger.log('setupFreeTierSystemTask: Error during setup: ' + e);
    throw e;
  }
}

// Add to FreeTierTriggerManager:
FreeTierTriggerManager.setupSystemHealthDigestTrigger = function() {
  if (!this.hasTrigger('sendSystemHealthDigest', ScriptApp.EventType.CLOCK)) {
    ScriptApp.newTrigger('sendSystemHealthDigest')
      .timeBased()
      .everyDays(1)
      .atHour(7)
      .create();
    Logger.log('FreeTierTriggerManager: Created daily system health digest trigger (7 AM)');
  }
};

/**
 * Modernized: Rebuilds all appointment events from form responses using leasing and resumable sub-tasks.
 * - Deletion: Resumable, batch by month.
 * - Creation: Uses runBatchJobWithContinuation.
 * - Uses WorkerLeaseManager for concurrency.
 */
function rebuildAppointmentEventsAllForms(args) {
  const workerId = 'rebuild_appt_' + Utilities.getUuid();
  let leaseAcquired = false;
  try {
    leaseAcquired = WorkerLeaseManager.acquireLease(workerId);
    if (!leaseAcquired) {
      Logger.log('rebuildAppointmentEventsAllForms: Lease busy, skipping');
      return;
    }
    // --- Deletion phase: resumable, batch by month ---
    let state = args && args.state ? args.state : ContinuationManager.loadState('REBUILD_APPT_EVENTS', {});
    if (!state.deletionDone) {
      const startYear = 1970;
      const endDate = new Date();
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      state.currentYear = state.currentYear || startYear;
      state.currentMonth = state.currentMonth || 0;
      while (state.currentYear < endYear || (state.currentYear === endYear && state.currentMonth <= endMonth)) {
        const monthStart = new Date(state.currentYear, state.currentMonth, 1);
        const monthEnd = new Date(state.currentYear, state.currentMonth + 1, 0);
        const events = CAL.getEvents(monthStart, monthEnd);
        for (const event of events) {
          const title = event.getTitle();
          if (title.includes(APPT_EVENT_TAG) || title.includes(FULL_SUMMARY_TAG)) {
            CalendarQuotaManager.safeDeleteEvent(() => event.deleteEvent());
          }
        }
        // Move to next month
        if (state.currentMonth === 11) {
          state.currentMonth = 0;
          state.currentYear++;
        } else {
          state.currentMonth++;
        }
        // Save state and yield if running long
        if (!ContinuationManager.shouldContinue(state.startTime || (state.startTime = Date.now()), 4 * 60 * 1000)) {
          ContinuationManager.saveAndContinue('REBUILD_APPT_EVENTS', state, 'rebuildAppointmentEventsAllForms');
          return;
        }
      }
      state.deletionDone = true;
      state.currentYear = undefined;
      state.currentMonth = undefined;
      ContinuationManager.saveState('REBUILD_APPT_EVENTS', state);
    }
    // --- Creation phase: runBatchJobWithContinuation for each form ---
    if (!state.creationDone) {
      for (const entry of FORM_REGISTRY) {
        try {
          const sheet = getSpreadsheet(entry).getSheetByName(entry.sheetName);
          if (!sheet) continue;
          const taskName = 'BATCH_CONTINUATION_STATE_rebuildAppointmentEventsAllForms_' + entry.sheetName;
          let batchState = state[taskName] || {};
          runBatchJobWithContinuation({
            taskName,
            continuationFnName: 'rebuildAppointmentEventsAllForms',
            batchFn: (batchState, rows, batchStartRow) => {
              for (let i = 0; i < rows.length; i++) {
                const [timestamp, lastName, firstName, purok, barangay, dateChoice] = rows[i];
                if (!dateChoice) continue;
                const dateStr = typeof dateChoice === 'string' ? dateChoice.split(' ')[0] : '';
                const dateObj = DateUtils.parseDate(dateStr);
                if (!dateObj) continue;
                CalendarQuotaManager.safeCreateEvent(() => {
                  const event = CAL.createAllDayEvent(
                    `${APPT_EVENT_TAG} ${lastName}, ${firstName} (${barangay})`,
                    dateObj
                  );
                  event.setColor(CalendarApp.EventColor.PALE_BLUE);
                  return event;
                });
              }
            },
            doneFn: () => Logger.log('rebuildAppointmentEventsAllForms:end'),
            batchSize: ConfigService.get('CHUNK_SIZE', 500),
            softTimeLimitMs: 4 * 60 * 1000,
            startRowKey: 'lastRow',
            sheet,
            getLastRowFn: s => s.getLastRow()
          }, { state: batchState });
          state[taskName] = batchState;
        } catch (e) {
          Logger.log('rebuildAppointmentEventsAllForms: Error for ' + entry.sheetName + ': ' + e);
        }
      }
      state.creationDone = true;
      ContinuationManager.saveState('REBUILD_APPT_EVENTS', state);
    }
    Logger.log('rebuildAppointmentEventsAllForms: All done.');
  } finally {
    if (leaseAcquired) WorkerLeaseManager.releaseLease(workerId);
  }
}

/**
 * Modernized: High-level task to rebuild all form dropdowns by enqueuing UPDATE_DROPDOWN jobs for each form.
 */
function rebuildAllFormDropdownsTask(args) {
  try {
    for (const entry of FORM_REGISTRY) {
      distributedQueueEnqueue({
        taskName: UPDATE_DROPDOWN,
        args: { formId: entry.formId, sheetName: entry.availabilitySheetName, registry: entry },
        priority: 30
      });
    }
    Logger.log('rebuildAllFormDropdownsTask: Enqueued UPDATE_DROPDOWN jobs for all forms.');
  } catch (err) {
    ErrorService.sendThrottledError('rebuildAllFormDropdownsTask', err, args);
  }
}

/**
 * Handler for UPDATE_DROPDOWN jobs. Updates the dropdown for a single form.
 */
function updateDropdownJob(args) {
  try {
    const { formId, sheetName, registry } = args;
    const sheet = getSpreadsheet(registry).getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found for dropdown update');
    const lastRow = sheet.getLastRow();
    const dateLabels = [];
    for (let i = 2; i <= lastRow; i++) {
      const row = sheet.getRange(i, 1, 1, 3).getValues()[0];
      const dateStr = row[0];
      const slotsLeft = row[2];
      if (typeof dateStr === 'string' && dateStr.match(/^\\d{4}-\\d{2}-\\d{2}/) && slotsLeft > 0) {
        dateLabels.push(`${dateStr} (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)`);
      }
    }
    dateLabels.sort();
    const form = FormApp.openById(formId);
    const items = form.getItems(FormApp.ItemType.LIST);
    for (const item of items) {
      const title = item.getTitle();
      if (title.toLowerCase().includes('date')) {
        const list = item.asListItem();
        list.setChoiceValues(dateLabels);
      }
    }
    Logger.log(`updateDropdownJob: Updated dropdown for form ${formId}`);
  } catch (err) {
    ErrorService.sendThrottledError('updateDropdownJob', err, args);
  }
}

/**
 * Modernized: Generates the unified appointment list in batches using ContinuationManager.
 * Handles large data sets without timeouts.
 */
function generateUnifiedAppointmentListTask(args) {
  let state = args && args.state ? args.state : ContinuationManager.loadState(GENERATE_UNIFIED_LIST, {});
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(UNIFIED_LIST_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(UNIFIED_LIST_SHEET);
    }
    if (!state.initialized) {
      // Clear only the main view columns
      sheet.getRange(1, 1, sheet.getMaxRows(), UNIFIED_LIST_VIEW_COLS).clearContent();
      state.rowPtr = 1;
      // Write title
      sheet.getRange(state.rowPtr, 1).setValue(UNIFIED_LIST_TITLE);
      sheet.getRange(state.rowPtr, 1).setFontWeight('bold').setFontSize(14);
      state.rowPtr++;
      state.unifiedList = buildUnifiedBlockList();
      state.grouped = Array.from(groupByDateBlock(state.unifiedList));
      state.groupIndex = 0;
      state.initialized = true;
      ContinuationManager.saveState(GENERATE_UNIFIED_LIST, state);
    }
    // Process in batches of date blocks
    const batchSize = 5; // Number of date blocks per batch
    let processed = 0;
    while (state.groupIndex < state.grouped.length && processed < batchSize) {
      const [dateKey, appointments] = state.grouped[state.groupIndex];
      renderUnifiedDateBlock(sheet, dateKey, appointments, state.rowPtr);
      state.rowPtr += UNIFIED_LIST_BLOCK_ROWS;
      state.groupIndex++;
      processed++;
      // Save state and yield if running long
      if (!ContinuationManager.shouldContinue(state.startTime || (state.startTime = Date.now()), 4 * 60 * 1000)) {
        ContinuationManager.saveAndContinue(GENERATE_UNIFIED_LIST, state, 'generateUnifiedAppointmentListTask');
        return;
      }
    }
    if (state.groupIndex >= state.grouped.length) {
      // Freeze panes at Row 2
      sheet.setFrozenRows(2);
      // Apply bold+bg for date rows (every block start row)
      let dateRowPtr = 2;
      for (let i = 0; i < state.grouped.length; i++) {
        sheet.getRange(dateRowPtr, 1, 1, UNIFIED_LIST_VIEW_COLS)
          .setBackground('#e6f3ff')
          .setFontWeight('bold');
        dateRowPtr += UNIFIED_LIST_BLOCK_ROWS;
      }
      Logger.log('generateUnifiedAppointmentListTask: All done.');
      ContinuationManager.finish(GENERATE_UNIFIED_LIST, 'generateUnifiedAppointmentListTask');
      return;
    }
    ContinuationManager.saveState(GENERATE_UNIFIED_LIST, state);
  } catch (err) {
    ErrorService.sendThrottledError('generateUnifiedAppointmentListTask', err, args);
    throw err;
  }
}

/**
 * Modernized: Audits all availability sheets in batches using runBatchJobWithContinuation.
 * Each batch audits a single sheet, making the audit resumable and robust.
 */
function auditAvailabilitySheetsBatchTask(args) {
  try {
    for (const entry of FORM_REGISTRY) {
      const sheet = getSpreadsheet(entry).getSheetByName(entry.availabilitySheetName);
      if (!sheet) continue;
      const taskName = 'BATCH_CONTINUATION_STATE_auditAvailabilitySheets_' + entry.availabilitySheetName;
      runBatchJobWithContinuation({
        taskName,
        continuationFnName: 'auditAvailabilitySheetsBatchTask',
        batchFn: (state, rows, batchStartRow) => {
          ensureVersionColumn(sheet);
          ensureChecksumColumn(sheet);
          for (let i = 0; i < rows.length; i++) {
            const rowIdx = batchStartRow + i;
            const { valid, errors } = validateRow(sheet, rowIdx);
            if (!valid) {
              Logger.log(`auditAvailabilitySheets: Issue in ${entry.availabilitySheetName} row ${rowIdx}: ${errors.join(', ')}`);
              // Auto-correct checksum only
              if (errors.includes('Checksum mismatch')) {
                updateRowChecksum(sheet, rowIdx);
                Logger.log(`auditAvailabilitySheets: Auto-corrected checksum for row ${rowIdx}`);
              }
            }
          }
        },
        doneFn: () => Logger.log(`auditAvailabilitySheets: ${entry.availabilitySheetName} - batch audit done`),
        batchSize: ConfigService.get('CHUNK_SIZE', 500),
        softTimeLimitMs: 5 * 60 * 1000,
        startRowKey: 'lastRow',
        sheet,
        getLastRowFn: s => s.getLastRow()
      });
    }
    Logger.log('auditAvailabilitySheetsBatchTask: All sheets audited.');
  } catch (err) {
    ErrorService.sendThrottledError('auditAvailabilitySheetsBatchTask', err, args);
  }
}

// SECURITY: Add isAdminUser() protection to all admin/system functions
function retryFailedJobs(limit) {
  if (!isAdminUser()) {
    Logger.log('[Security] Unauthorized retryFailedJobs attempt.');
    throw new Error('Unauthorized: Only admins can retry failed jobs.');
  }
  limit = typeof limit === 'number' && limit > 0 ? limit : 5;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dlqSheet = ss.getSheetByName(DLQ_TAB_NAME);
    if (!dlqSheet || dlqSheet.getLastRow() <= 1) {
      Logger.log('retryFailedJobs: No failed jobs found in DLQ');
      return { retried: 0, remaining: 0 };
    }
    const data = dlqSheet.getRange(2, 1, dlqSheet.getLastRow() - 1, 4).getValues();
    let retriedCount = 0;
    const rowsToDelete = [];
    for (let i = 0; i < Math.min(data.length, limit); i++) {
      const [failedAt, jobId, reason, payloadStr] = data[i];
      try {
        const payload = JSON.parse(payloadStr);
        distributedQueueEnqueue(payload);
        Logger.log(`retryFailedJobs: Re-enqueued job ${jobId}`);
        rowsToDelete.push(i + 2);
        retriedCount++;
      } catch (e) {
        Logger.log(`retryFailedJobs: Error retrying job ${jobId}: ${e.toString()}`);
        if (typeof ErrorService !== 'undefined') ErrorService.logError('retryFailedJobs', e, { jobId, payloadStr });
      }
    }
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      dlqSheet.deleteRow(rowsToDelete[i]);
    }
    const remainingJobs = dlqSheet.getLastRow() - 1;
    Logger.log(`retryFailedJobs: Retried ${retriedCount} jobs, ${remainingJobs} remaining in DLQ`);
    return { retried: retriedCount, remaining: remainingJobs };
  } catch (e) {
    Logger.log('retryFailedJobs: Error during retry process: ' + e);
    if (typeof ErrorService !== 'undefined') ErrorService.logError('retryFailedJobs', e);
    throw e;
  }
}

function forceReleaseWorkerLeases() {
  if (!isAdminUser()) {
    Logger.log('[Security] Unauthorized forceReleaseWorkerLeases attempt.');
    throw new Error('Unauthorized: Only admins can force release worker leases.');
  }
  try {
    WorkerLeaseManager.forceReleaseLease();
    Logger.log('forceReleaseWorkerLeases: Successfully released all worker leases');
    return { success: true, message: 'All worker leases released' };
  } catch (e) {
    Logger.log('forceReleaseWorkerLeases: Error releasing leases: ' + e);
    if (typeof ErrorService !== 'undefined') ErrorService.logError('forceReleaseWorkerLeases', e);
    return { success: false, error: e.toString() };
  }
}
