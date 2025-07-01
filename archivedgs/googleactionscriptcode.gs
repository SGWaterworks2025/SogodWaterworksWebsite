/**
 * SOGOD WATERWORKS APPOINTMENT SYSTEM – MODERN VERSION
 * ====================================================
 *
 * This file contains the modern, clean, and maintainable version of the Sogod Waterworks
 * appointment booking system. It is based on the legacy codebase but uses only modern
 * patterns and best practices:
 *   - DistributedQueue_FIFO_v1 for all async/background jobs
 *   - Strict idempotency and concurrency control
 *   - Optimistic concurrency control (OCC) for sheet updates
 *   - Data integrity with checksums and audits
 *   - No legacy queue code (TaskQueueService, ProcessingQueue, etc.)
 *
 * This file will be built up in phases, starting from the legacy codebase as a reference.
 *
 * For maintainers: Add new features and migrate old logic here using only modern patterns.
 */

// PHASE 1: Distributed Queue System and Job Lifecycle Documentation
// (Implementation to be added in subsequent phases) 
const SCRIPT_VERSION = 'v4'; // used by: CalendarQuotaManager, HolidayService, safeCacheGet, safeCachePut; tweak: increment when deploying major changes
const CACHE_KEY = SCRIPT_VERSION + '_counts'; // used by: syncOneForm, tallyByDate; tweak: change suffix to reset cache namespace
const SUBMIT_COUNT_KEY = SCRIPT_VERSION + '_submit_counter'; // used by: onFormSubmit; tweak: change suffix to reset submit counter
const IS_DEV = false; // used by: sendThrottledError; tweak: set true for development alerts

// Form registry
const FORM_REGISTRY = [ // used by: ensureAllFormTriggersExist, updateAvailability_everywhere, onFormSubmit, rebuildAllFormDropdowns; tweak: add/remove forms to expand service coverage
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
if (!Array.isArray(FORM_REGISTRY) || FORM_REGISTRY.some(r => !r.formId || !r.spreadsheetId)) {
  throw new Error('FORM_REGISTRY entries must all have formId and spreadsheetId');
}

// Business logic
const SLOT_CAP = 20; // used by: decrementSlotAllCategories_, updateFormDropdownForDate_, upsertDailySummaryEvent, buildBusinessDays; tweak: increase to allow more daily bookings
const FUTURE_DAYS = 60; // used by: AvailabilityService.seedAvailabilityWindow; tweak: increase to seed more future dates
const RESPONSE_RETENTION_DAYS = 60; // used by: purgeOldResponses, getResponseDates; tweak: increase to retain form responses longer

// Sheet columns
const RESP_DATE_COL = 6; // used by: getResponseDates, purgeOldResponses; tweak: change if form response timestamp moves to different column
const AVAIL_BOOKED_COL = 2; // used by: decrementSlotAllCategories_, decrementSingleCategory_, revertAvailabilityForDate_; tweak: change if availability sheet structure changes
const AVAIL_LEFT_COL = 3; // used by: decrementSlotAllCategories_, decrementSingleCategory_, updateAvailability_everywhere; tweak: change if availability sheet structure changes

// Sync windows & throttling
const MAX_ADVANCE_DAYS = 60; // used by: rebuildAppointmentEventsAllForms, updateFormDateDropdown_, checkCalendarIntegrity; tweak: increase to allow booking further in advance
const BUSINESS_DAYS_WINDOW = 60; // used by: buildBusinessDays; tweak: increase to show more future dates in form dropdown
const THROTTLE_INTERVAL_MS = 60000; // used by: syncOneForm; tweak: decrease for more frequent syncing
const LOCK_TIMEOUT_MS = 30000; // used by: decrementSlotAllCategories_, upsertDailySummaryEvent, rebuildAllAvailabilityAndCalendar; tweak: increase if operations need more time
const BATCH_DAYS_WINDOW = 30; // used by: updateAvailability_everywhere; tweak: increase to process more days in batch operations
const EMAIL_THROTTLE_MS = 24 * 60 * 60 * 1000; // used by: sendThrottledError; tweak: decrease to receive error emails more frequently

// Calendar quotas
const CALENDAR_API_CALL_LIMIT_PER_RUN = 20; // used by: CalendarQuotaManager; tweak: increase if single execution needs more calendar calls
const CALENDAR_API_CALL_LIMIT_PER_DAY = 2000; // used by: CalendarQuotaManager, updateAvailability_everywhere; tweak: adjust based on Google Calendar API quota limits

// Colors & holidays
const EVENT_COLOR_AVAILABLE = CalendarApp.EventColor.GREEN; // used by: createCalendarEventFromResponse_, upsertDailySummaryEvent; tweak: change color for available appointment slots
const EVENT_COLOR_FULL = CalendarApp.EventColor.RED; // used by: createCalendarEventFromResponse_, upsertDailySummaryEvent; tweak: change color for fully booked dates
const HOLIDAY_CAL_ID = 'en.philippines#holiday@group.v.calendar.google.com'; // used by: HolidayService; tweak: change to different country's holiday calendar
const HOLIDAY_CACHE_KEY = SCRIPT_VERSION + '_holidays'; // used by: HolidayService; tweak: change suffix to reset holiday cache
const HOLIDAY_CACHE_TTL = 12 * 60 * 60; // used by: HolidayService; tweak: increase to cache holidays longer

// Tags
const FULL_SUMMARY_TAG = '📅'; // used by: upsertDailySummaryEvent, batchSyncCalendarSummaries, checkCalendarIntegrity
const APPT_EVENT_TAG = '[APPOINTMENT]'; // used by: rebuildAppointmentEventsAllForms, checkCalendarIntegrity
const TAG_HOLIDAY = '[AUTO_HOLIDAY]'; // used by: HolidayService

// Form-field IDs
const FIELD_ID_MAP = { // used by: generatePrefillUrl; tweak: update IDs when form structure changes
  'Last Name': '1111111111111111111',
  'First Name': '2222222222222222222',
  'Purok': '3333333333333333333',
  'Barangay': '4444444444444444444',
  'Date of Appointment': '5555555555555555555'
};

// Chunk sizing
const CHUNK_SIZE = 50; // used by: rebuildAppointmentEventsAllForms, removeHolidaySummaries, checkCalendarIntegrity; tweak: increase for faster bulk operations, decrease to avoid timeouts


// Initialize core services first
const TZ = Session.getScriptTimeZone();
const CACHE = CacheService.getScriptCache();
const CAL = CalendarApp.getDefaultCalendar();

// Initialize caches
let _ssCache = {};
let _formCache = {};

// Calendar API call counters
let calendarCallsThisRun = 0;
let calendarCallsToday = 0;

// ---------------------------------------------------------------------------
// Modern HolidayService: Manual, ICS, and Muslim Holidays with Caching
// ---------------------------------------------------------------------------

/**
 * HolidayService: Modern holiday logic (manual, ICS, Muslim, caching, exclusions).
 */
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

  /** Check if holiday name should be excluded */
  isExcludedName_(summary) {
    if (!summary) return false;
    return [...this._excludedHolidayNames].some(name => summary.includes(name));
  },

  /**
   * Check if a date is a holiday (manual, ICS, Muslim, override/exclusion)
   * @param {string} dateStr - YYYY-MM-DD
   * @return {boolean}
   */
  isHoliday(dateStr) {
    if (!dateStr) return false;
    if (this._overrideWorkingDays.has(dateStr)) return false;
    const date = DateUtils.parseDate(dateStr);
    if (!date) return false;
    let isPotentialHoliday = false;
    if (!this._initialized) this.initHolidayCalendar();
    if (this._calendarAvailable) {
      try {
        const events = this._holidayCalendar.getEventsForDay(date);
        if (events.some(e => !this.isExcludedName_(e.getTitle()))) {
          isPotentialHoliday = true;
        }
      } catch (e) {
        this._calendarAvailable = false;
        Logger.log('HolidayService.isHoliday: ICS calendar error, falling back to manual: ' + e);
      }
    }
    if (!isPotentialHoliday) {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      if (this._manualHolidays.some(h => h.month === month && h.day === day)) {
        isPotentialHoliday = true;
      }
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
    // --- Muslim movable-holiday support (integrated) ---
    try {
      const cal = CalendarApp.getCalendarById(HOLIDAY_CAL_ID);
      if (cal) {
        const events = cal.getEventsForDay(date);
        if (events.some(evt => {
          const t = (evt.getTitle() || '').toLowerCase();
          return t.includes('eid') && (t.includes('fitr') || t.includes('adha'));
        })) {
          return true;
        }
      }
    } catch (_) {}
    return true;
  },

  /** Initialize the holiday calendar */
  initHolidayCalendar() {
    if (this._initialized) return;
    try {
      this._holidayCalendar = CalendarApp.getCalendarById(HOLIDAY_CAL_ID);
      this._calendarAvailable = true;
    } catch (e) {
      this._calendarAvailable = false;
      Logger.log('HolidayService: Calendar access failed: ' + e);
    }
    this._initialized = true;
  },

  /**
   * Fetch holiday dates within a range and cache them
   * @param {Date} start
   * @param {Date} end
   * @return {Set<string>} Set of holiday date strings in yyyy-MM-dd format
   */
  fetchRange(start, end) {
    try {
      const cached = CACHE.get(HOLIDAY_CACHE_KEY);
      if (cached) {
        const cachedHolidays = new Set(JSON.parse(cached));
        const rangeHolidays = new Set();
        let currentDate = new Date(start);
        while (currentDate <= end) {
          const dateStr = DateUtils.formatYMD(currentDate);
          if (cachedHolidays.has(dateStr)) {
            rangeHolidays.add(dateStr);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        return rangeHolidays;
      }
    } catch (e) {
      Logger.log('HolidayService.fetchRange: Cache error: ' + e);
    }
    if (!this._initialized) this.initHolidayCalendar();
    const holidayDates = new Set();
    if (this._calendarAvailable) {
      try {
        const events = this._holidayCalendar.getEvents(start, end);
        events.forEach(event => {
          const title = event.getTitle();
          if (!this.isExcludedName_(title)) {
            const eventDate = event.getStartTime();
            holidayDates.add(DateUtils.formatYMD(eventDate));
          }
        });
      } catch (e) {
        this._calendarAvailable = false;
        Logger.log('HolidayService.fetchRange: ICS calendar error, falling back to manual: ' + e);
      }
    }
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      const h = this._manualHolidays.find(h => h.month === month && h.day === day);
      if (h && !this._excludedHolidayNames.has(h.name)) {
        holidayDates.add(DateUtils.formatYMD(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    try {
      CACHE.put(HOLIDAY_CACHE_KEY, JSON.stringify([...holidayDates]), HOLIDAY_CACHE_TTL);
    } catch (e) {
      Logger.log('HolidayService.fetchRange: Cache put error: ' + e);
    }
    return holidayDates;
  },

  /**
   * Ensure holiday events exist in the calendar for the given range
   * @param {Date} start
   * @param {Date} end
   */
  upsertHolidayEvents(start, end) {
    try {
      const holidayDates = this.fetchRange(start, end);
      for (const dateStr of holidayDates) {
        if (!this.isHoliday(dateStr)) continue;
        const date = DateUtils.parseDate(dateStr);
        if (!date) continue;
        const existingEvents = CAL.getEventsForDay(date).filter(e =>
          e.getTitle().includes(TAG_HOLIDAY)
        );
        if (existingEvents.length === 0) {
          const holidayName = this._getHolidayName(date);
          const title = `${holidayName} ${TAG_HOLIDAY}`;
          if (CalendarQuotaManager.canCall(1)) {
            const event = CAL.createAllDayEvent(title, date);
            event.setColor(CalendarApp.EventColor.GRAY);
            CalendarQuotaManager.recordCall(1);
            Logger.log(`HolidayService.upsertHolidayEvents: Created holiday event for ${dateStr}`);
          }
        }
      }
    } catch (e) {
      Logger.log('HolidayService.upsertHolidayEvents: Error: ' + e);
    }
  },

  /**
   * Get the holiday name for a date (manual or ICS)
   * @param {Date} date
   * @return {string}
   */
  _getHolidayName(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const manual = this._manualHolidays.find(h => h.month === month && h.day === day);
    if (manual) return manual.name;
    if (this._calendarAvailable) {
      try {
        const events = this._holidayCalendar.getEventsForDay(date);
        for (const e of events) {
          if (!this.isExcludedName_(e.getTitle())) {
            return e.getTitle();
          }
        }
      } catch (_) {}
    }
    return 'Holiday';
  }
};
// ---------------------------------------------------------------------------
// End Modern HolidayService
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PHASE 1: Distributed FIFO Queue System (Modern, No Legacy)
// ---------------------------------------------------------------------------

const DIST_QUEUE_TAB_NAME = 'DistributedQueue_FIFO_v1';
const DLQ_TAB_NAME = 'DistributedQueue_DLQ_v1';
/**
 * Distributed FIFO queue using a dedicated sheet tab.
 * Implements atomic dequeue using compare-and-swap semantics and timestamp-based claiming.
 * All function and tab names are unique to avoid conflicts.
 *
 * Job States:
 *   - PENDING: Waiting to be processed
 *   - CLAIMED: Claimed by a worker, being processed
 *   - COMPLETED: Successfully processed (row deleted)
 *   - FAILED: (Optional, for DLQ)
 *
 * Usage:
 *   - distributedQueueEnqueue_v1(payload): Enqueue a new job
 *   - distributedQueueDequeueAtomic_v1(workerId, claimTimeoutSec): Atomically claim a job
 *   - distributedQueueComplete_v1(rowIdx): Mark job as completed (delete row)
 *   - distributedQueueListAll_v1(): List all jobs (for monitoring)
 */
function ensureDistributedQueueSheet_v1_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DIST_QUEUE_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DIST_QUEUE_TAB_NAME);
    sheet.appendRow(['id', 'payload', 'enqueuedAt', 'claimedAt', 'claimedBy', 'status']);
  }
  return sheet;
}

function distributedQueueEnqueue_v1(payload) {
  const sheet = ensureDistributedQueueSheet_v1_();
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  sheet.appendRow([id, JSON.stringify(payload), now, '', '', 'PENDING']);
  return id;
}

function distributedQueueDequeueAtomic_v1(workerId, claimTimeoutSec) {
  claimTimeoutSec = claimTimeoutSec || 60;
  const sheet = ensureDistributedQueueSheet_v1_();
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

function distributedQueueComplete_v1(rowIdx) {
  const sheet = ensureDistributedQueueSheet_v1_();
  sheet.deleteRow(rowIdx);
}

function distributedQueueListAll_v1() {
  const sheet = ensureDistributedQueueSheet_v1_();
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
 * Enqueues a failed job into the Dead-Letter Queue (DLQ) sheet for manual inspection.
 * @param {Object} job - The original job object that failed.
 * @param {string} reason - The error message or reason for failure.
 * @private
 */
function deadLetterEnqueue_v1_(job, reason) {
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


// ---------------------------------------------------------------------------
// Idempotency Helpers (CacheService-based, Modern)
// ---------------------------------------------------------------------------

/**
 * Checks if a job with the given requestId has already been processed.
 * Uses CACHE for fast, concurrency-safe idempotency.
 */
function isAlreadyProcessed(requestId) {
  if (!requestId) return false;
  return CACHE.get('REQ_' + requestId) === 'DONE';
}

/**
 * Marks a job with the given requestId as processed.
 * Uses CACHE for fast, concurrency-safe idempotency.
 */
function markProcessed(requestId) {
  if (!requestId) return;
  CACHE.put('REQ_' + requestId, 'DONE', 3600); // 1 hour TTL
}

// ---------------------------------------------------------------------------
// End of Phase 1: Distributed Queue System
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PHASE 2: Modern AvailabilityService with OCC and Data Integrity
// ---------------------------------------------------------------------------

/**
 * AvailabilityService: Modern, atomic, OCC-protected slot decrementing and integrity checks.
 * All updates are idempotent and concurrency-safe. No legacy code.
 */
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
  _performGuardedDecrement: function(sheet, rowIdx, txn) {
    // Read the entire row in one call
    const rowRange = sheet.getRange(rowIdx, 1, 1, AVAIL_CHECKSUM_COL);
    const rowValues = rowRange.getValues()[0];
    const [date, booked, left, version] = rowValues;
    if (left <= 0) throw new Error('No slots left for ' + date);
    // Track for rollback
    if (txn) txn.track(sheet, rowIdx, rowValues.slice()); // Save a copy
    // Update in memory
    rowValues[1] = booked + 1; // AVAIL_BOOKED_COL - 1
    rowValues[2] = left - 1;   // AVAIL_LEFT_COL - 1
    rowValues[3] = (version || 1) + 1; // AVAIL_VERSION_COL - 1
    // Update checksum
    rowValues[4] = computeRowChecksum(rowValues);
    // Write the entire row back in one call
    rowRange.setValues([rowValues]);
    return rowValues[2]; // new left
  },

  /**
   * Ensures all business days in the next FUTURE_DAYS have rows in all Availability_* sheets.
   * Skips weekends and holidays. Safe to run nightly or on demand.
   */
  seedAvailabilityWindow: function() {
    const today = DateUtils.formatYMD(new Date());
    for (const entry of FORM_REGISTRY) {
      try {
        const sheet = getSpreadsheet_(entry).getSheetByName(entry.availabilitySheetName);
        if (!sheet) continue;
        ensureVersionColumn(sheet);
        ensureChecksumColumn(sheet);
        const existingDates = new Set();
        const lastRow = sheet.getLastRow();
        for (let i = 2; i <= lastRow; i++) {
          const dateStr = sheet.getRange(i, 1).getValue();
          if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
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
    // Set initial version for all existing rows
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
    // Set initial checksum for all existing rows
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

// ---------------------------------------------------------------------------
// End of Phase 2: Modern AvailabilityService
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PHASE 3: Modern Locking, Transaction Context, and Utilities
// ---------------------------------------------------------------------------

/**
 * LockContextManager: Modern per-date/global locking for concurrency control.
 * Uses CacheService for per-date locks, LockService for global lock.
 */
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

/**
 * WorkerLeaseManager: Manages worker leases to prevent concurrent job processing.
 * Uses CacheService for distributed locking across multiple worker instances.
 */
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
      
      // Wait before retry
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

/**
 * getSpreadsheet_: Safe, cached spreadsheet access for registry entries.
 */
function getSpreadsheet_(registryEntry) {
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
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  },
  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }
};

// ---------------------------------------------------------------------------
// End of Phase 3: Modern Locking, Transaction, and Utilities
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PHASE 4: Modern Monitoring, Auditing, and Data Integrity
// ---------------------------------------------------------------------------

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
 * Validates and auto-corrects all availability sheets for data integrity.
 * Checks version, slot counts, and checksum. Auto-corrects checksum if needed.
 */
function auditAvailabilitySheets() {
  Logger.log('auditAvailabilitySheets: start');
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet_(entry).getSheetByName(entry.availabilitySheetName);
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

// ---------------------------------------------------------------------------
// End of Phase 4: Modern Monitoring, Auditing, and Data Integrity
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Modern onFormSubmit: Concurrency, Idempotency, and Distributed Queue
// ---------------------------------------------------------------------------

/**
 * Modern onFormSubmit handler: concurrency-safe, idempotent, and async side effects.
 * @param {Object} e - Spreadsheet onFormSubmit event object.
 */
function onFormSubmit(e) {
  const perfStart = Date.now();
  try {
    Logger.log('onFormSubmit: start');
    // 1. Validate event and extract row data
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
    if (typeof dateChoice !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(dateChoice)) {
      Logger.log('onFormSubmit: invalid dateChoice format: ' + dateChoice);
      return;
    }
    const dateString = dateChoice.split(' ')[0];
    const dateObj = new Date(dateString);
    if (isNaN(dateObj)) {
      Logger.log('onFormSubmit: Invalid dateChoice parsed ' + dateChoice);
      return;
    }
    // 2. Registry lookup
    const registryEntry = FORM_REGISTRY.find(r => r.spreadsheetId === sheet.getParent().getId());
    if (!registryEntry) {
      Logger.log('onFormSubmit: registry lookup failed for spreadsheet: ' + sheet.getParent().getId());
      return;
    }
    // 3. Generate unique requestId for idempotency
    const requestId = Utilities.base64Encode(Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(rowValues[0]) + row + sheet.getName()
    ));
    // 4. Atomic slot decrement (OCC, idempotent)
    let txn = new TransactionContext();
    try {
      AvailabilityService.decrementSlotAllCategories(dateObj, txn, requestId);
    } catch (err) {
      Logger.log('onFormSubmit: Error in AvailabilityService.decrementSlotAllCategories: ' + err);
      // Optionally: sendThrottledError('onFormSubmit-decrementSlotAllCategories', err);
      txn.rollback();
      return;
    }
    // 5. Enqueue all side effects as async jobs (distributed queue)
    distributedQueueEnqueue_v1({
      type: 'CALENDAR_SYNC',
      date: dateString,
      registry: registryEntry,
      rowData: { lastName, firstName, purok, barangay },
      requestId
    });
    distributedQueueEnqueue_v1({
      type: 'DROPDOWN_UPDATE',
      date: dateString,
      registry: registryEntry,
      requestId
    });
    distributedQueueEnqueue_v1({
      type: 'CLEANUP',
      registry: registryEntry,
      requestId
    });
    distributedQueueEnqueue_v1({
      type: 'UNIFIED_LIST_UPDATE',
      requestId
    });
    // 6. Log completion and performance
    Logger.log('onFormSubmit: end (user booking complete, side effects async)');
    ConcurrencyMonitor._logMetric('function_perf', { fn: 'onFormSubmit', ms: Date.now() - perfStart });
  } catch (err) {
    Logger.log('onFormSubmit: Error: ' + err);
    // Optionally: sendThrottledError('onFormSubmit', err);
  }
}
// ---------------------------------------------------------------------------
// End Modern onFormSubmit
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Modern Google Forms and Calendar Integration Utilities
// ---------------------------------------------------------------------------

/**
 * FormTriggerService: Manage onFormSubmit triggers for all forms in FORM_REGISTRY.
 */
const FormTriggerService = {
  createAllFormTriggers() {
    for (const entry of FORM_REGISTRY) {
      try {
        const form = FormApp.openById(entry.formId);
        if (!this.hasTrigger(form, 'onFormSubmit')) {
          ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();
        }
      } catch (e) {
        Logger.log('FormTriggerService: Error creating trigger for ' + entry.formId + ': ' + e);
      }
    }
  },
  removeAllFormTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    }
  },
  hasTrigger(form, handler) {
    return ScriptApp.getProjectTriggers().some(tr =>
      tr.getHandlerFunction() === handler && tr.getTriggerSourceId() === form.getId()
    );
  },
  listAllTriggers() {
    return ScriptApp.getProjectTriggers();
  }
};

/**
 * Updates dropdown options in a form for a given date based on slot availability.
 * @param {Object} registryEntry
 * @param {string} dateStr - YYYY-MM-DD
 */
function updateFormDropdownForDate(registryEntry, dateStr) {
  try {
    const form = FormApp.openById(registryEntry.formId);
    const sheet = getSpreadsheet_(registryEntry).getSheetByName(registryEntry.availabilitySheetName);
    const lastRow = sheet.getLastRow();
    let slotsLeft = null;
    for (let i = 2; i <= lastRow; i++) {
      const row = sheet.getRange(i, 1, 1, 3).getValues()[0];
      if (row[0] === dateStr) {
        slotsLeft = row[2];
        break;
      }
    }
    // Find dropdown item by field name
    const items = form.getItems(FormApp.ItemType.LIST);
    for (const item of items) {
      const title = item.getTitle();
      if (title.toLowerCase().includes('date')) {
        const list = item.asListItem();
        const choices = list.getChoices().map(c => c.getValue());
        const newChoices = choices.map(choice =>
          choice.startsWith(dateStr)
            ? `${dateStr} (${slotsLeft !== null ? slotsLeft : 'N/A'} slots left)`
            : choice
        );
        list.setChoiceValues(newChoices);
      }
    }
  } catch (e) {
    Logger.log('updateFormDropdownForDate: Error: ' + e);
  }
}

/**
 * Generates a prefilled URL for a form with given field values.
 * @param {string} formId
 * @param {Object} fieldValues - { fieldName: value }
 * @return {string} Prefilled URL
 */
function generatePrefillUrl(formId, fieldValues) {
  const form = FormApp.openById(formId);
  const response = form.createResponse();
  for (const [field, value] of Object.entries(fieldValues)) {
    const item = form.getItems().find(i => i.getTitle() === field);
    if (item) {
      response.withItemResponse(item.asTextItem().createResponse(value));
    }
  }
  return response.toPrefilledUrl();
}

/**
 * Purges old form responses based on RESPONSE_RETENTION_DAYS.
 */
function purgeOldResponses() {
  const cutoff = new Date(Date.now() - RESPONSE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  for (const entry of FORM_REGISTRY) {
    try {
      const form = FormApp.openById(entry.formId);
      const responses = form.getResponses();
      for (const resp of responses) {
        if (resp.getTimestamp() < cutoff) {
          form.deleteResponse(resp.getId());
        }
      }
    } catch (e) {
      Logger.log('purgeOldResponses: Error for form ' + entry.formId + ': ' + e);
    }
  }
}

/**
 * CalendarQuotaManager: Safe Google Calendar API usage.
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
  }
};

/**
 * Upserts a daily summary event in the calendar for slot status.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} summary - e.g., '5 slots left'
 */
function upsertDailySummaryEvent(dateStr, summary) {
  try {
    const date = DateUtils.parseDate(dateStr);
    if (!date) return;
    const events = CAL.getEventsForDay(date).filter(e => e.getTitle().includes(FULL_SUMMARY_TAG));
    if (events.length > 0) {
      for (const evt of events) {
        CalendarQuotaManager.safeDeleteEvent(() => evt.deleteEvent());
      }
    }
    CalendarQuotaManager.safeCreateEvent(() => {
      const event = CAL.createAllDayEvent(`${summary} ${FULL_SUMMARY_TAG}`, date);
      event.setColor(CalendarApp.EventColor.BLUE);
      return event;
    });
  } catch (e) {
    Logger.log('upsertDailySummaryEvent: Error: ' + e);
  }
}

/**
 * Removes outdated or duplicate summary events from the calendar.
 */
function cleanupOldEvents() {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    const events = CAL.getEvents(start, now);
    for (const evt of events) {
      if (evt.getTitle().includes(FULL_SUMMARY_TAG)) {
        CalendarQuotaManager.safeDeleteEvent(() => evt.deleteEvent());
      }
    }
  } catch (e) {
    Logger.log('cleanupOldEvents: Error: ' + e);
  }
}
// ---------------------------------------------------------------------------
// End Modern Google Forms and Calendar Integration
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Modern Unified Appointment List Generation
// ---------------------------------------------------------------------------

const UNIFIED_LIST_SHEET = 'ListOfAppointments';
const UNIFIED_LIST_ARCHIVE_SHEET = 'ListOfAppointments_Archive';

/**
 * Generates the unified appointment list from all form response sheets.
 * Deduplicates, validates, and writes to ListOfAppointments sheet.
 */
function generateUnifiedAppointmentList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(UNIFIED_LIST_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(UNIFIED_LIST_SHEET);
    sheet.appendRow(['Timestamp', 'Form', 'Last Name', 'First Name', 'Purok', 'Barangay', 'Date', 'Status', 'RawRowId']);
  }
  // Build the unified list
  const unifiedList = buildAppointmentList();
  // Clear and write
  sheet.clearContents();
  sheet.appendRow(['Timestamp', 'Form', 'Last Name', 'First Name', 'Purok', 'Barangay', 'Date', 'Status', 'RawRowId']);
  for (const row of unifiedList) {
    sheet.appendRow(row);
  }
  // Archive old rows
  archiveOldRows(sheet);
}

/**
 * Builds the unified appointment list from all forms, deduplicated and validated.
 * @return {Array<Array>} Array of rows for the unified list.
 */
function buildAppointmentList() {
  const rows = [];
  const seen = new Set();
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet_(entry).getSheetByName(entry.sheetName);
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) { // skip header
        const [timestamp, lastName, firstName, purok, barangay, dateChoice] = data[i];
        if (!timestamp || !dateChoice) continue;
        const dateStr = typeof dateChoice === 'string' ? dateChoice.split(' ')[0] : '';
        const rowId = entry.formId + '_' + i;
        // Deduplicate by form+row
        if (seen.has(rowId)) continue;
        seen.add(rowId);
        // Validate date
        const dateObj = DateUtils.parseDate(dateStr);
        if (!dateObj) continue;
        // Status: future or past
        const status = dateObj >= new Date() ? 'Upcoming' : 'Past';
        rows.push([
          timestamp,
          entry.sheetName,
          lastName,
          firstName,
          purok,
          barangay,
          dateStr,
          status,
          rowId
        ]);
      }
    } catch (e) {
      Logger.log('buildAppointmentList: Error for ' + entry.sheetName + ': ' + e);
    }
  }
  // Sort by date, then timestamp
  rows.sort((a, b) => {
    const dA = DateUtils.parseDate(a[6]);
    const dB = DateUtils.parseDate(b[6]);
    if (dA && dB) return dA - dB || new Date(a[0]) - new Date(b[0]);
    return 0;
  });
  return rows;
}

/**
 * Archives past appointments from the unified list to an archive sheet.
 * @param {Sheet} sheet - The ListOfAppointments sheet.
 */
function archiveOldRows(sheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let archiveSheet = ss.getSheetByName(UNIFIED_LIST_ARCHIVE_SHEET);
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet(UNIFIED_LIST_ARCHIVE_SHEET);
    archiveSheet.appendRow(['Timestamp', 'Form', 'Last Name', 'First Name', 'Purok', 'Barangay', 'Date', 'Status', 'RawRowId']);
  }
  const now = new Date();
  const data = sheet.getDataRange().getValues();
  const keepRows = [data[0]];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dateObj = DateUtils.parseDate(row[6]);
    if (dateObj && dateObj < now) {
      archiveSheet.appendRow(row);
    } else {
      keepRows.push(row);
    }
  }
  // Rewrite sheet with only upcoming
  sheet.clearContents();
  for (const row of keepRows) {
    sheet.appendRow(row);
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
// ---------------------------------------------------------------------------
// End Modern Unified Appointment List Generation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Modern System-Wide Rebuild and Sync Functions (Nightly Orchestrator)
// ---------------------------------------------------------------------------

/**
 * Main nightly orchestrator: syncs all availability, dropdowns, events, and counters.
 * Safe to run from a time-driven trigger or manually.
 */
function updateAvailability_everywhere() {
  const perfStart = Date.now();
  let globalLock = LockContextManager.acquireGlobalLock(LOCK_TIMEOUT_MS);
  if (!globalLock) {
    Logger.log('updateAvailability_everywhere: Global lock busy, skipping');
    return;
  }
  try {
    Logger.log('updateAvailability_everywhere: start');
    rebuildSlotCounters();
    rebuildAllFormDropdowns();
    rebuildAppointmentEventsAllForms();
    generateUnifiedAppointmentList();
    cleanupOldEvents();
    auditAvailabilitySheets();
    Logger.log('updateAvailability_everywhere: end (nightly orchestrator)');
    ConcurrencyMonitor._logMetric('function_perf', { fn: 'updateAvailability_everywhere', ms: Date.now() - perfStart });
  } finally {
    globalLock.releaseLock();
  }
}

/**
 * Rebuilds the date dropdown for all forms from scratch based on latest availability.
 */
function rebuildAllFormDropdowns() {
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet_(entry).getSheetByName(entry.availabilitySheetName);
      const lastRow = sheet.getLastRow();
      const dates = [];
      for (let i = 2; i <= lastRow; i++) {
        const row = sheet.getRange(i, 1, 1, 3).getValues()[0];
        if (typeof row[0] === 'string' && row[0].match(/^\d{4}-\d{2}-\d{2}/)) {
          dates.push(row[0]);
        }
      }
      const form = FormApp.openById(entry.formId);
      const items = form.getItems(FormApp.ItemType.LIST);
      for (const item of items) {
        const title = item.getTitle();
        if (title.toLowerCase().includes('date')) {
          const list = item.asListItem();
          const newChoices = dates.map(date => `${date}`);
          list.setChoiceValues(newChoices);
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
        const sheet = getSpreadsheet_(entry).getSheetByName(entry.sheetName);
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

/**
 * Recalculates Booked and Slots Left for all dates by tallying form responses.
 */
function rebuildSlotCounters() {
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet_(entry).getSheetByName(entry.availabilitySheetName);
      if (!sheet) continue;
      // Reset all counts
      const lastRow = sheet.getLastRow();
      for (let i = 2; i <= lastRow; i++) {
        sheet.getRange(i, 2, 1, 2).setValues([[0, SLOT_CAP]]); // Booked, Left
      }
      // Tally from all responses
      const respSheet = getSpreadsheet_(entry).getSheetByName(entry.sheetName);
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
// ---------------------------------------------------------------------------
// End Modern System-Wide Rebuild and Sync Functions
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Modern Comprehensive Calendar Integrity Check
// ---------------------------------------------------------------------------

/**
 * Checks for orphaned appointment events in the calendar (no matching form response) and deletes them.
 * Safe to run nightly or on demand.
 */
function checkCalendarIntegrity() {
  Logger.log('checkCalendarIntegrity: start');
  const start = new Date(1970, 0, 1);
  const end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const allEvents = CAL.getEvents(start, end);
  // Build a set of all valid appointment keys from all form responses
  const validKeys = new Set();
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet_(entry).getSheetByName(entry.sheetName);
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const [timestamp, lastName, firstName, purok, barangay, dateChoice] = data[i];
        if (!dateChoice) continue;
        const dateStr = typeof dateChoice === 'string' ? dateChoice.split(' ')[0] : '';
        const key = `${APPT_EVENT_TAG}|${lastName}|${firstName}|${barangay}|${dateStr}`;
        validKeys.add(key);
      }
    } catch (e) {
      Logger.log('checkCalendarIntegrity: Error for ' + entry.sheetName + ': ' + e);
    }
  }
  // Scan calendar events for orphans
  let orphanCount = 0;
  for (const event of allEvents) {
    const title = event.getTitle();
    if (title.includes(APPT_EVENT_TAG)) {
      // Parse event key
      const match = title.match(/\[APPOINTMENT\] ([^,]+), ([^(]+) \(([^)]+)\)/);
      if (match) {
        const lastName = match[1].trim();
        const firstName = match[2].trim();
        const barangay = match[3].trim();
        const dateStr = DateUtils.formatYMD(event.getStartTime());
        const key = `${APPT_EVENT_TAG}|${lastName}|${firstName}|${barangay}|${dateStr}`;
        if (!validKeys.has(key)) {
          CalendarQuotaManager.safeDeleteEvent(() => event.deleteEvent());
          orphanCount++;
          Logger.log('checkCalendarIntegrity: Deleted orphaned event: ' + title + ' on ' + dateStr);
        }
      }
    }
  }
  Logger.log('checkCalendarIntegrity: end, orphans deleted: ' + orphanCount);
}
// ---------------------------------------------------------------------------
// End Modern Comprehensive Calendar Integrity Check
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Free-Tier Optimized Trigger Management
// ---------------------------------------------------------------------------

/**
 * Free-tier optimized trigger management system.
 * Respects Google Workspace limitations: 20 triggers max, 6 hours/day execution.
 */
const FreeTierTriggerManager = {
  
  /**
   * Sets up minimal, efficient triggers for free tier.
   * Uses only 8 triggers total to stay well under 20 limit.
   */
  setupFreeTierTriggers() {
    Logger.log('FreeTierTriggerManager: Setting up free-tier optimized triggers');
    
    try {
      // 1. Form submit triggers (7 forms = 7 triggers)
      this.setupFormTriggers();
      
      // 2. Async job worker trigger (1 trigger)
      this.setupAsyncJobWorkerTrigger();
      
      // 3. Daily maintenance trigger (1 trigger) - combines multiple functions
      this.setupDailyMaintenanceTrigger();
      
      Logger.log('FreeTierTriggerManager: Successfully set up 9 triggers (well under 20 limit)');
      
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
   * Sets up async job worker trigger to run every 5 minutes during business hours.
   * Free tier: 6 hours/day = 72 executions max per day.
   * 5-minute intervals = 288 possible executions, so we limit to business hours only.
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
 * Daily maintenance routine that combines multiple functions to save triggers.
 * Runs at 2 AM to avoid business hours.
 */
function dailyMaintenanceRoutine() {
  Logger.log('dailyMaintenanceRoutine: start');
  const startTime = Date.now();
  
  try {
    // 1. Reset calendar quota counters
    CalendarQuotaManager.initRun();
    Logger.log('dailyMaintenanceRoutine: Reset calendar quota');
    
    // 2. Purge old form responses (lightweight)
    purgeOldResponses();
    Logger.log('dailyMaintenanceRoutine: Purged old responses');
    
    // 3. Sync calendar instead of full rebuild
    syncAllAppointmentEvents(); // A new, more gentle sync function
    Logger.log('dailyMaintenanceRoutine: Synced calendar events');
    
    // 4. Check other integrity
    checkCalendarIntegrityLimited();
    Logger.log('dailyMaintenanceRoutine: Checked calendar integrity');
    
    const duration = Date.now() - startTime;
    Logger.log(`dailyMaintenanceRoutine: completed in ${duration}ms`);
    
  } catch (e) {
    Logger.log('dailyMaintenanceRoutine: Error: ' + e);
  }
}

/**
 * A more gentle version of rebuildAppointmentEventsAllForms.
 * It finds differences between sheets and calendar and only applies the delta.
 */
function syncAllAppointmentEvents() {
  const allFormResponses = new Map(); // key: event title, value: { def, instance }

  // 1. Aggregate all expected events from sheets
  for (const entry of FORM_REGISTRY) {
    try {
      const sheet = getSpreadsheet_(entry).getSheetByName(entry.sheetName);
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const [ts, lastName, firstName, purok, barangay, dateChoice] = data[i];
        if (!dateChoice) continue;
        const eventTitle = `${APPT_EVENT_TAG} ${lastName}, ${firstName} (${barangay})`;
        allFormResponses.set(eventTitle, true);
      }
    } catch (e) { /* ignore */ }
  }

  // 2. Get all existing calendar events
  const start = new Date();
  const end = new Date(start.getTime() + FUTURE_DAYS * 86400000);
  const calendarEvents = new Map(CAL.getEvents(start, end)
    .filter(e => e.getTitle().includes(APPT_EVENT_TAG))
    .map(e => [e.getTitle(), e]));

  // 3. Delete orphaned calendar events
  for (const [title, event] of calendarEvents.entries()) {
    if (!allFormResponses.has(title)) {
      CalendarQuotaManager.safeDeleteEvent(() => event.deleteEvent());
    }
  }
}

/**
 * Limited calendar integrity check for free tier.
 * Only checks recent dates to stay within execution time limits.
 */
function checkCalendarIntegrityLimited() {
  Logger.log('checkCalendarIntegrityLimited: start');
  
  try {
    // Only check last 30 days and next 30 days to stay within limits
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const allEvents = CAL.getEvents(start, end);
    
    // Build valid keys from recent form responses only
    const validKeys = new Set();
    for (const entry of FORM_REGISTRY) {
      try {
        const sheet = getSpreadsheet_(entry).getSheetByName(entry.sheetName);
        if (!sheet) continue;
        
        // Only check last 100 rows to stay within limits
        const lastRow = Math.min(sheet.getLastRow(), 100);
        if (lastRow <= 1) continue;
        
        const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
        for (const row of data) {
          const [timestamp, lastName, firstName, purok, barangay, dateChoice] = row;
          if (!dateChoice) continue;
          const dateStr = typeof dateChoice === 'string' ? dateChoice.split(' ')[0] : '';
          const key = `${APPT_EVENT_TAG}|${lastName}|${firstName}|${barangay}|${dateStr}`;
          validKeys.add(key);
        }
      } catch (e) {
        Logger.log('checkCalendarIntegrityLimited: Error for ' + entry.sheetName + ': ' + e);
      }
    }
    
    // Scan calendar events for orphans (limited scope)
    let orphanCount = 0;
    for (const event of allEvents) {
      const title = event.getTitle();
      if (title.includes(APPT_EVENT_TAG)) {
        const match = title.match(/\[APPOINTMENT\] ([^,]+), ([^(]+) \(([^)]+)\)/);
        if (match) {
          const lastName = match[1].trim();
          const firstName = match[2].trim();
          const barangay = match[3].trim();
          const dateStr = DateUtils.formatYMD(event.getStartTime());
          const key = `${APPT_EVENT_TAG}|${lastName}|${firstName}|${barangay}|${dateStr}`;
          if (!validKeys.has(key)) {
            CalendarQuotaManager.safeDeleteEvent(() => event.deleteEvent());
            orphanCount++;
            if (orphanCount >= 10) break; // Limit deletions to stay within quotas
          }
        }
      }
    }
    
    Logger.log(`checkCalendarIntegrityLimited: end, deleted ${orphanCount} orphaned events`);
    
  } catch (e) {
    Logger.log('checkCalendarIntegrityLimited: Error: ' + e);
  }
}

/**
 * Production-grade async job worker with lease management and fault tolerance.
 * Implements worker leasing, proper DLQ handling, and execution time monitoring.
 */
function masterAsyncJobWorker() {
  const workerId = 'worker_async_' + Utilities.getUuid();
  const claimTimeoutSec = 60; // 1 minute
  const maxBatch = 5; // Reduced from 10 to stay within free tier limits
  let processedCount = 0;
  let leaseAcquired = false;
  
  // Free-tier optimization: only run during business hours (Mon-Fri, 8am-5pm)
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 0 || day === 6 || hour < 8 || hour >= 17) {
    Logger.log('masterAsyncJobWorker: Outside business hours, skipping run.');
    return;
  }
  
  // Check execution time budget
  const executionStart = Date.now();
  const maxExecutionTime = 4 * 60 * 1000; // 4 minutes max per execution
  
  Logger.log('masterAsyncJobWorker: start (production-grade with lease management)');

  try {
    // Acquire worker lease to prevent concurrent processing
    leaseAcquired = WorkerLeaseManager.acquireLease(workerId);
    if (!leaseAcquired) {
      Logger.log('masterAsyncJobWorker: Failed to acquire lease, another worker is active');
      return;
    }
    
    Logger.log(`masterAsyncJobWorker: Lease acquired, starting job processing`);

    while (processedCount < maxBatch) {
      // Check execution time budget
      if (Date.now() - executionStart > maxExecutionTime) {
        Logger.log('masterAsyncJobWorker: Execution time limit reached, stopping');
        break;
      }
      
      const job = distributedQueueDequeueAtomic_v1(workerId, claimTimeoutSec);
      if (!job) {
        Logger.log('masterAsyncJobWorker: No pending jobs found');
        break;
      }

      const { payload, row: rowIdx, id: jobId } = job;
      Logger.log(`masterAsyncJobWorker: Claimed job ${jobId} of type ${payload.type}`);

      try {
        // Process the job based on type
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

        // Job completed successfully
        distributedQueueComplete_v1(rowIdx);
        Logger.log(`masterAsyncJobWorker: Completed job ${jobId}`);

      } catch (e) {
        // Job failed - move to Dead Letter Queue for manual review
        Logger.log(`masterAsyncJobWorker: FAILED job ${jobId}. Error: ${e.toString()}`);
        
        // Move to DLQ instead of deleting
        deadLetterEnqueue_v1_(job, e.toString());
        
        // Remove from main queue
        distributedQueueComplete_v1(rowIdx);
        
        // Log failure for monitoring
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
    // Always release the lease, even if errors occurred
    if (leaseAcquired) {
      WorkerLeaseManager.releaseLease(workerId);
    }
    
    const executionTime = Date.now() - executionStart;
    Logger.log(`masterAsyncJobWorker: Finished run, processed ${processedCount} jobs in ${executionTime}ms`);
    
    // Log performance metrics
    ConcurrencyMonitor._logMetric('worker_performance', {
      workerId: workerId,
      processedCount: processedCount,
      executionTime: executionTime,
      leaseAcquired: leaseAcquired
    });
  }
}

/**
 * Free-tier optimized form dropdown update.
 * Updates only the specific date to minimize API calls.
 */
function updateFormDropdownForDate(registryEntry, dateStr) {
  try {
    const form = FormApp.openById(registryEntry.formId);
    const sheet = getSpreadsheet_(registryEntry).getSheetByName(registryEntry.availabilitySheetName);
    const lastRow = sheet.getLastRow();
    let slotsLeft = null;
    
    // Find the specific date row
    for (let i = 2; i <= lastRow; i++) {
      const row = sheet.getRange(i, 1, 1, 3).getValues()[0];
      if (row[0] === dateStr) {
        slotsLeft = row[2];
        break;
      }
    }
    
    // Update only the specific date choice to minimize API calls
    const items = form.getItems(FormApp.ItemType.LIST);
    for (const item of items) {
      const title = item.getTitle();
      if (title.toLowerCase().includes('date')) {
        const list = item.asListItem();
        const choices = list.getChoices();
        const newChoices = choices.map(choice => {
          if (choice.getValue().startsWith(dateStr)) {
            return `${dateStr} (${slotsLeft !== null ? slotsLeft : 'N/A'} slots left)`;
          }
          return choice.getValue();
        });
        list.setChoiceValues(newChoices);
        break; // Only update the first date field found
      }
    }
    
    Logger.log(`updateFormDropdownForDate: Updated ${dateStr} with ${slotsLeft} slots left`);
    
  } catch (e) {
    Logger.log('updateFormDropdownForDate: Error: ' + e);
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
    // Idempotent: CalendarSyncService will deduplicate and update as needed
    CalendarSyncService.syncSummaryEvents(date, [], { created: 0, updated: 0, deleted: 0, errors: 0 });
    CalendarSyncService.syncAppointmentEvents(date, [], { created: 0, updated: 0, deleted: 0, errors: 0 });
    Logger.log(`processCalendarSyncJob_: Calendar sync completed for ${date}`);
  } catch (e) {
    Logger.log('processCalendarSyncJob_: Error: ' + e);
    // Optionally: sendThrottledError('processCalendarSyncJob_', e);
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
    // Use robust helper to update dropdown for the specific date
    updateFormDropdownForDate(registry, date);
    Logger.log(`processDropdownUpdateJob_: Dropdown updated for ${registry.formId} on ${date}`);
  } catch (e) {
    Logger.log('processDropdownUpdateJob_: Error: ' + e);
    // Optionally: sendThrottledError('processDropdownUpdateJob_', e);
  }
}

/**
 * Handler for CLEANUP jobs. Purges old responses for all forms (no registry-specific purge in modern version).
 * @param {Object} payload The job payload.
 * @private
 */
function processCleanupJob_(payload) {
  // The modern purgeOldResponses function handles all forms, no registry parameter needed
  purgeOldResponses();
}

// ---------------------------------------------------------------------------
// Setup and Monitoring Functions
// ---------------------------------------------------------------------------

/**
 * Complete setup function for free-tier deployment.
 * Call this once to set up all triggers and initialize the system.
 */
function setupFreeTierSystem() {
  Logger.log('setupFreeTierSystem: Starting free-tier system setup');
  
  try {
    // 1. Set up all triggers (9 total, well under 20 limit)
    FreeTierTriggerManager.setupFreeTierTriggers();
    
    // 2. Initialize calendar quota manager
    CalendarQuotaManager.initRun();
    
    // 3. Create initial unified appointment list
    generateUnifiedAppointmentList();
    
    // 4. Log current trigger status
    FreeTierTriggerManager.listAllTriggers();
    
    Logger.log('setupFreeTierSystem: Free-tier system setup completed successfully');
    
  } catch (e) {
    Logger.log('setupFreeTierSystem: Error during setup: ' + e);
    throw e;
  }
}

/**
 * Monitor free-tier system health and quotas.
 * Call this to check system status and usage.
 */
function monitorFreeTierSystem() {
  Logger.log('monitorFreeTierSystem: Checking system health');
  
  try {
    // 1. Check trigger count
    const triggers = FreeTierTriggerManager.listAllTriggers();
    const triggerCount = triggers.length;
    Logger.log(`monitorFreeTierSystem: Trigger count: ${triggerCount}/20 (${triggerCount < 15 ? 'OK' : 'WARNING'})`);
    
    // 2. Check calendar quota usage
    const quotaStats = CalendarQuotaManager.getQuotaStats();
    Logger.log(`monitorFreeTierSystem: Calendar API calls - Run: ${quotaStats.runCalls}/${quotaStats.runLimit}, Daily: ${quotaStats.dailyCalls}/${quotaStats.dailyLimit}`);
    
    // 3. Check queue status
    const queueStatus = checkQueueStatus();
    Logger.log(`monitorFreeTierSystem: Queue status: ${JSON.stringify(queueStatus)}`);
    
    // 4. Check execution time budget
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
    // 1. Test queue enqueue
    const testJob = {
      type: 'UNIFIED_LIST_UPDATE',
      requestId: 'test_' + Date.now()
    };
    
    const jobId = distributedQueueEnqueue_v1(testJob);
    Logger.log(`testFreeTierSystem: Enqueued test job with ID: ${jobId}`);
    
    // 2. Test job processing
    const workerId = 'test_worker_' + Utilities.getUuid();
    const job = distributedQueueDequeueAtomic_v1(workerId, 30);
    
    if (job) {
      Logger.log(`testFreeTierSystem: Successfully claimed test job: ${job.id}`);
      
      // Process the job
      processUnifiedListUpdateJob(job.payload);
      
      // Complete the job
      distributedQueueComplete_v1(job.row);
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
    // 1. Force release any stuck worker leases
    WorkerLeaseManager.forceReleaseLease();
    Logger.log('emergencyFreeTierCleanup: Released stuck worker leases');
    
    // 2. Clear all pending jobs (they will be regenerated)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const queueSheet = ss.getSheetByName(DIST_QUEUE_TAB_NAME);
    if (queueSheet && queueSheet.getLastRow() > 1) {
      queueSheet.clearContents();
      queueSheet.appendRow(['Timestamp', 'WorkerID', 'Payload']);
      Logger.log('emergencyFreeTierCleanup: Cleared pending jobs queue');
    }
    
    // 3. Clear DLQ
    const dlqSheet = ss.getSheetByName(DLQ_TAB_NAME);
    if (dlqSheet && dlqSheet.getLastRow() > 1) {
      dlqSheet.clearContents();
      dlqSheet.appendRow(['FailedAt', 'JobID', 'Reason', 'Payload']);
      Logger.log('emergencyFreeTierCleanup: Cleared dead letter queue');
    }
    
    // 4. Reset calendar quota
    CalendarQuotaManager.initRun();
    Logger.log('emergencyFreeTierCleanup: Reset calendar quota');
    
    // 5. Regenerate unified list
    generateUnifiedAppointmentList();
    Logger.log('emergencyFreeTierCleanup: Regenerated unified appointment list');
    
    Logger.log('emergencyFreeTierCleanup: Emergency cleanup completed');
    
  } catch (e) {
    Logger.log('emergencyFreeTierCleanup: Error during cleanup: ' + e);
    throw e;
  }
}

/**
 * Production-grade system monitoring and diagnostics.
 * Provides comprehensive system health information.
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

/**
 * Manually retry failed jobs from the Dead Letter Queue.
 * @param {number} limit - Maximum number of jobs to retry (default: 5)
 */
function retryFailedJobs(limit = 5) {
  Logger.log(`retryFailedJobs: Attempting to retry up to ${limit} failed jobs`);
  
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
        // Parse the original job payload
        const payload = JSON.parse(payloadStr);
        
        // Re-enqueue the job
        const newJobId = distributedQueueEnqueue_v1(payload);
        
        Logger.log(`retryFailedJobs: Re-enqueued job ${jobId} as ${newJobId}`);
        rowsToDelete.push(i + 2); // +2 because we start from row 2 and i is 0-based
        retriedCount++;
        
      } catch (e) {
        Logger.log(`retryFailedJobs: Error retrying job ${jobId}: ${e.toString()}`);
      }
    }
    
    // Remove retried jobs from DLQ (in reverse order to maintain row indices)
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      dlqSheet.deleteRow(rowsToDelete[i]);
    }
    
    const remainingJobs = dlqSheet.getLastRow() - 1;
    Logger.log(`retryFailedJobs: Retried ${retriedCount} jobs, ${remainingJobs} remaining in DLQ`);
    
    return { retried: retriedCount, remaining: remainingJobs };
    
  } catch (e) {
    Logger.log('retryFailedJobs: Error during retry process: ' + e);
    throw e;
  }
}

/**
 * Force release stuck worker leases (emergency function).
 * Use this if workers appear to be stuck or not releasing leases properly.
 */
function forceReleaseWorkerLeases() {
  Logger.log('forceReleaseWorkerLeases: Force releasing all worker leases');
  
  try {
    WorkerLeaseManager.forceReleaseLease();
    
    // Also clear any related cache entries
    const cache = CacheService.getScriptCache();
    cache.remove('worker_lease_lock');
    
    Logger.log('forceReleaseWorkerLeases: Successfully released all worker leases');
    return { success: true, message: 'All worker leases released' };
    
  } catch (e) {
    Logger.log('forceReleaseWorkerLeases: Error releasing leases: ' + e);
    return { success: false, error: e.toString() };
  }
}

// ---------------------------------------------------------------------------
// End Setup and Monitoring Functions
// ---------------------------------------------------------------------------

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
