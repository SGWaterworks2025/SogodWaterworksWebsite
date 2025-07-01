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
 * // Process async jobs (normally run by trigger):
 *   masterAsyncJobWorker();
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
 *    - Functions: `distributedQueueEnqueue`, `distributedQueueDequeueAtomic`, `distributedQueueComplete`, `masterAsyncJobWorker`, job handlers.
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
 * - For new job types, add a handler in `masterAsyncJobWorker` and update the distributed queue logic.
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
 * - `masterAsyncJobWorker()`: Processes async jobs from the distributed queue.
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
 * Enqueue a new job in the distributed queue.
 * @param {Object} payload - The job payload.
 * @return {string} Job ID
 */
function distributedQueueEnqueue(payload) {
  const sheet = ensureDistributedQueueSheet();
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  sheet.appendRow([id, JSON.stringify(payload), now, '', '', 'PENDING']);
  return id;
}

/**
 * Atomically claim a job from the distributed queue.
 * @param {string} workerId - Unique worker identifier.
 * @param {number} [claimTimeoutSec=60] - Claim timeout in seconds.
 * @return {Object|null} Claimed job object or null if none available.
 */
function distributedQueueDequeueAtomic(workerId, claimTimeoutSec) {
  claimTimeoutSec = claimTimeoutSec || 60;
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
        return {
          id: row[0],
          payload: JSON.parse(row[1]),
          row: rowIdx
        };
      }
    }
  }
  return null;
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
 * List all jobs in the distributed queue (for monitoring).
 * @return {Array<Object>} List of job objects.
 */
function distributedQueueListAll() {
  const sheet = ensureDistributedQueueSheet();
  const data = sheet.getDataRange().getValues();
  const jobs = [];
  for (let i = 1; i < data.length; i++) {
    jobs.push({
      id: data[i][0],
      payload: data[i][1],
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
   * @param {Date} dateObj - The appointment date.
   * @param {TransactionContext?} txn - Optional transaction context for rollback.
   * @param {string?} requestId - Unique idempotency key.
   * @return {Array} New slots left for each category.
   */
  decrementSlotAllCategories(dateObj, txn = null, requestId = null) {
    const dateString = DateUtils.formatYMD(dateObj);
    // Idempotency: Check if already processed
    if (requestId && isAlreadyProcessed(requestId)) {
      Logger.log('Idempotency: Request ' + requestId + ' already processed, skipping.');
      return [];
    }
    // Per-date lock (with global fallback)
    let lockAcquired = LockContextManager.acquireDateLock(dateString, LOCK_TIMEOUT_MS);
    let globalLock = null;
    if (!lockAcquired && LockContextManager.FALLBACK_TO_GLOBAL_LOCK) {
      Logger.log('decrementSlotAllCategories: Per-date lock busy, trying global lock for ' + dateString);
      globalLock = LockContextManager.acquireGlobalLock(LOCK_TIMEOUT_MS);
      lockAcquired = !!globalLock;
    }
    if (!lockAcquired) throw new Error('System busy for this date, please try again.');
    txn = txn || new TransactionContext();
    try {
      const newLeftValues = [];
      for (const entry of FORM_REGISTRY) {
        try {
          const newLeft = AvailabilityService._performGuardedDecrement(dateObj, entry, txn);
          newLeftValues.push(newLeft);
        } catch (e) {
          Logger.log('decrementSlotAllCategories: Error in sheet ' + entry.availabilitySheetName + ': ' + e);
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
        LockContextManager.releaseDateLock(dateString);
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
    for (const entry of FORM_REGISTRY) {
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
        let current = new Date();
        for (let d = 0; d < FUTURE_DAYS; d++) {
          const dateStr = DateUtils.formatYMD(current);
          if (
            !DateUtils.isWeekend(current) &&
            !HolidayService.isHoliday(dateStr) &&
            !existingDates.has(dateStr)
          ) {
            const newRow = sheet.getLastRow() + 1;
            sheet.getRange(newRow, 1, 1, 5).setValues([[dateStr, 0, SLOT_CAP, 1, '']]);
            updateRowChecksum(sheet, newRow);
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
 * Recalculates Booked and Slots Left for all dates by tallying form responses.
 */
function rebuildSlotCounters() {
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet(entry).getSheetByName(entry.availabilitySheetName);
      if (!sheet) continue;
      // Reset all counts
      const lastRow = sheet.getLastRow();
      for (let i = 2; i <= lastRow; i++) {
        sheet.getRange(i, 2, 1, 2).setValues([[0, SLOT_CAP]]); // Booked, Left
      }
      // Tally from all responses
      const respSheet = getSpreadsheet(entry).getSheetByName(entry.sheetName);
      if (!respSheet) continue;
      const data = respSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const dateChoice = data[i][5];
        if (!dateChoice) continue;
        const dateStr = typeof dateChoice === 'string' ? dateChoice.split(' ')[0] : '';
        // Find or create row in availability
        let found = false;
        for (let j = 2; j <= lastRow; j++) {
          if (sheet.getRange(j, 1).getValue() === dateStr) {
            const booked = sheet.getRange(j, 2).getValue() + 1;
            const left = Math.max(0, sheet.getRange(j, 3).getValue() - 1);
            sheet.getRange(j, 2, 1, 2).setValues([[booked, left]]);
            found = true;
            break;
          }
        }
        if (!found) {
          const newRow = sheet.getLastRow() + 1;
          sheet.getRange(newRow, 1, 1, 3).setValues([[dateStr, 1, SLOT_CAP - 1]]);
        }
      }
      updateAllChecksums(sheet);
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

/**
 * Deletes all appointment events and recreates them from form responses.
 * Ensures the calendar is a perfect mirror of the data.
 */
function rebuildAppointmentEventsAllForms() {
  Logger.log('rebuildAppointmentEventsAllForms:start');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    Logger.log('rebuildAppointmentEventsAllForms: Lock busy, skipping');
    return;
  }
  try {
    // Delete all appointment events
    const start = new Date(1970, 0, 1);
    const end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const allEvents = CAL.getEvents(start, end);
    for (const event of allEvents) {
      const title = event.getTitle();
      if (title.includes(APPT_EVENT_TAG)) {
        CalendarQuotaManager.safeDeleteEvent(() => event.deleteEvent());
      }
    }
    // Recreate from all form responses
    for (const entry of FORM_REGISTRY) {
      try {
        const sheet = getSpreadsheet(entry).getSheetByName(entry.sheetName);
        if (!sheet) continue;
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const [timestamp, lastName, firstName, purok, barangay, dateChoice] = data[i];
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
      } catch (e) {
        Logger.log('rebuildAppointmentEventsAllForms: Error for ' + entry.sheetName + ': ' + e);
      }
    }
    Logger.log('rebuildAppointmentEventsAllForms:end');
  } finally {
    lock.releaseLock();
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
  const appointmentsToWrite = appointments.slice(0, SLOT_CAP);
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
   * Sets up async job worker trigger to run every 5 minutes.
   */
  setupAsyncJobWorkerTrigger() {
    if (!this.hasTrigger('masterAsyncJobWorker', ScriptApp.EventType.CLOCK)) {
      ScriptApp.newTrigger('masterAsyncJobWorker')
        .timeBased()
        .everyMinutes(5)
        .create();
      Logger.log('FreeTierTriggerManager: Created async job worker trigger (every 5 minutes)');
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
  Logger.log('dailyMaintenanceRoutine: start');
  const startTime = Date.now();
  try {
    CalendarQuotaManager.initRun();
    Logger.log('dailyMaintenanceRoutine: Reset calendar quota');
    purgeOldResponses();
    Logger.log('dailyMaintenanceRoutine: Purged old responses');
    syncAllAppointmentEvents();
    Logger.log('dailyMaintenanceRoutine: Synced calendar events');
    checkCalendarIntegrityLimited();
    Logger.log('dailyMaintenanceRoutine: Checked calendar integrity');
    const duration = Date.now() - startTime;
    Logger.log(`dailyMaintenanceRoutine: completed in ${duration}ms`);
  } catch (e) {
    Logger.log('dailyMaintenanceRoutine: Error: ' + e);
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
 * Main async job worker: processes jobs from the distributed queue with lease management and DLQ support.
 */
function masterAsyncJobWorker() {
  const workerId = 'worker_async_' + Utilities.getUuid();
  const claimTimeoutSec = 60; // 1 minute
  const maxBatch = 5; // Free tier: process up to 5 jobs per run
  let processedCount = 0;
  let leaseAcquired = false;

  // Only run during business hours (Mon-Fri, 8am-5pm)
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 0 || day === 6 || hour < 8 || hour >= 17) {
    Logger.log('masterAsyncJobWorker: Outside business hours, skipping run.');
    return;
  }

  const executionStart = Date.now();
  const maxExecutionTime = 4 * 60 * 1000; // 4 minutes
  Logger.log('masterAsyncJobWorker: start (production-grade with lease management)');

  try {
    leaseAcquired = WorkerLeaseManager.acquireLease(workerId);
    if (!leaseAcquired) {
      Logger.log('masterAsyncJobWorker: Failed to acquire lease, another worker is active');
      return;
    }
    Logger.log(`masterAsyncJobWorker: Lease acquired, starting job processing`);
    while (processedCount < maxBatch) {
      if (Date.now() - executionStart > maxExecutionTime) {
        Logger.log('masterAsyncJobWorker: Execution time limit reached, stopping');
        break;
      }
      const job = distributedQueueDequeueAtomic(workerId, claimTimeoutSec);
      if (!job) {
        Logger.log('masterAsyncJobWorker: No pending jobs found');
        break;
      }
      const { payload, row: rowIdx, id: jobId } = job;
      Logger.log(`masterAsyncJobWorker: Claimed job ${jobId} of type ${payload.type}`);
      try {
        switch (payload.type) {
          case 'CALENDAR_SYNC':
            processCalendarSyncJob_(payload);
            break;
          case 'DROPDOWN_UPDATE':
            processDropdownUpdateJob_(payload);
            break;
          case 'CLEANUP':
            processCleanupJob_(payload);
            break;
          case 'UNIFIED_LIST_UPDATE':
            processUnifiedListUpdateJob(payload);
            break;
          default:
            Logger.log(`masterAsyncJobWorker: Unknown job type: ${payload.type}`);
            throw new Error(`Unknown job type: ${payload.type}`);
        }
        distributedQueueComplete(rowIdx);
        Logger.log(`masterAsyncJobWorker: Completed job ${jobId}`);
      } catch (e) {
        Logger.log(`masterAsyncJobWorker: FAILED job ${jobId}. Error: ${e.toString()}`);
        deadLetterEnqueue(job, e.toString());
        distributedQueueComplete(rowIdx);
        ConcurrencyMonitor._logMetric('job_failure', {
          jobId: jobId,
          jobType: payload.type,
          error: e.toString(),
          workerId: workerId
        });
      }
      processedCount++;
    }
  } catch (e) {
    Logger.log(`masterAsyncJobWorker: Critical error: ${e.toString()}`);
    ConcurrencyMonitor._logMetric('worker_error', {
      workerId: workerId,
      error: e.toString(),
      processedCount: processedCount
    });
  } finally {
    if (leaseAcquired) {
      WorkerLeaseManager.releaseLease(workerId);
    }
    const executionTime = Date.now() - executionStart;
    Logger.log(`masterAsyncJobWorker: Finished run, processed ${processedCount} jobs in ${executionTime}ms`);
    ConcurrencyMonitor._logMetric('worker_performance', {
      workerId: workerId,
      processedCount: processedCount,
      executionTime: executionTime,
      leaseAcquired: leaseAcquired
    });
  }
}

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
    let minLeft = SLOT_CAP;
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
            const left = row[AVAIL_LEFT_COL - 1] || SLOT_CAP;
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
 * onFormSubmit: Immediately performs atomic slot decrement and enqueues side-effect jobs.
 * Ensures idempotency and OCC.
 * @param {Object} e - Spreadsheet onFormSubmit event object.
 */
function onFormSubmit(e) {
  let payload;
  try {
    if (!e || !e.range || !e.range.getSheet) {
      Logger.log('onFormSubmit: invalid event object');
      return;
    }
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const rowValues = sheet.getRange(row, 2, 1, 5).getValues();
    if (!rowValues || !rowValues[0]) {
      Logger.log('onFormSubmit: unable to read row values');
      return;
    }
    const [lastName, firstName, purok, barangay, dateChoice] = rowValues[0];
    const dateString = (typeof dateChoice === 'string' && dateChoice.split(' ')[0]) || '';
    const registryEntry = FORM_REGISTRY.find(r => r.spreadsheetId === sheet.getParent().getId());
    if (!registryEntry) {
      Logger.log('onFormSubmit: registry lookup failed for spreadsheet: ' + sheet.getParent().getId());
      return;
    }
    // Generate idempotency key
    const idempotencyKey = Utilities.base64Encode(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        [lastName, firstName, purok, barangay, dateChoice, row, sheet.getName()].join('|')
      )
    );
    payload = {
      idempotencyKey,
      timestamp: new Date().toISOString(),
      registry: registryEntry,
      row,
      sheetName: sheet.getName(),
      spreadsheetId: sheet.getParent().getId(),
      lastName,
      firstName,
      purok,
      barangay,
      dateChoice,
      dateString
    };
    // Idempotency check
    const cache = CacheService.getScriptCache();
    const props = PropertiesService.getScriptProperties();
    if (cache.get(idempotencyKey) || props.getProperty('IDEMP_' + idempotencyKey)) {
      Logger.log('onFormSubmit: Duplicate request, skipping');
      return;
    }
    // Atomic slot decrement
    let txn = new TransactionContext();
    let minLeft = null;
    let processed = false;
    try {
      const dateObj = new Date(dateString);
      const allLefts = AvailabilityService.decrementSlotAllCategories(dateObj, txn, idempotencyKey);
      if (!allLefts || allLefts.length === 0) {
        Logger.log('onFormSubmit: no availability data from AvailabilityService.decrementSlotAllCategories');
        throw new Error('No availability data');
      }
      minLeft = Math.min(...allLefts);
      if (minLeft < 0) {
        Logger.log('onFormSubmit: negative availability detected for ' + dateString);
        throw new Error('Negative availability');
      }
      processed = true;
    } catch (err) {
      Logger.log('onFormSubmit: Error in AvailabilityService.decrementSlotAllCategories: ' + err);
      sendThrottledError('onFormSubmit-decrementSlotAllCategories', err);
      txn.rollback();
      throw err;
    }
    if (processed) {
      // Enqueue all side effects as async jobs (distributed queue)
      distributedQueueEnqueue({
        type: 'CALENDAR_SYNC',
        date: dateString,
        registry: registryEntry,
        rowData: { lastName, firstName, purok, barangay }
      });
      distributedQueueEnqueue({
        type: 'DROPDOWN_UPDATE',
        date: dateString,
        registry: registryEntry
      });
      distributedQueueEnqueue({
        type: 'CLEANUP',
        registry: registryEntry
      });
      distributedQueueEnqueue({
        type: 'UNIFIED_LIST_UPDATE'
      });
      // Mark as processed in both cache and properties
      cache.put(idempotencyKey, '1', 3600); // 1 hour
      props.setProperty('IDEMP_' + idempotencyKey, String(Date.now()));
      Logger.log('onFormSubmit: Submission processed and jobs enqueued.');
      // Immediate dropdown update for user experience
      updateFormDropdownForDate(registryEntry, dateString);
    }
  } catch (err) {
    Logger.log('onFormSubmit: Error: ' + err);
    sendThrottledError('onFormSubmit', err);
  }
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