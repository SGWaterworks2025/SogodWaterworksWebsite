/**
 * Main worker: 
 *  • Reads form responses (coercing values into Dates),
 *  • Updates the Form's "Date of Appointment" dropdown,
 *  • Syncs per-day summary events on Calendar,
 *  • Writes an Availability table into a sheet.
 * Retention Policy: filters out form responses older than RESPONSE_RETENTION_DAYS days.
 * Constants:
 *  • SLOT_CAP: maximum appointments per day.
 *  • RESPONSE_RETENTION_DAYS: days to retain form responses.
 *  • FULL_SUMMARY_TAG: combined tag for identifying summary events.
 *  • CACHE counts entries expire after 300 seconds (5 minutes).
 * Testing: verify cap reached edge cases and color-coding.
 * Holidays excluded via `HOLIDAY_CAL_ID`.
 * v4: Added weekend purge functionality and enhanced business date validation.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Versioning & keys
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
const FULL_SUMMARY_TAG = '[DAILY_SUMMARY]'; // used by: upsertDailySummaryEvent, batchSyncCalendarSummaries, checkCalendarIntegrity
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

// ============================================================================
// RUNTIME SERVICES
// ============================================================================

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

// Initialize daily counter from cache/properties
try {
  const cached = CACHE.get(SCRIPT_VERSION + '_calendar_calls_today');
  if (cached) {
    calendarCallsToday = parseInt(cached, 10) || 0;
  } else {
    const props = PropertiesService.getScriptProperties();
    calendarCallsToday = parseInt(props.getProperty(SCRIPT_VERSION + '_calendar_calls_today') || '0', 10);
  }
} catch (e) {
  logTS('Error loading daily calendar call count: ' + e);
  calendarCallsToday = 0;
}

/**
 * Utility functions for date handling and validation
 */
const DateUtils = {
  /**
   * Build a Date object from year, month, day components
   * @param {number} year - Full year
   * @param {number} month - Month (1-12)
   * @param {number} day - Day of month
   * @return {Date} Date object
   */
  buildDate(year, month, day) {
    return new Date(year, month - 1, day);
  },

  /**
   * Format date as YYYY-MM-DD
   * @param {Date} date - Date to format
   * @return {string} Formatted date string
   */
  formatYMD(date) {
    if (!(date instanceof Date) || isNaN(date)) {
      throw new Error('Invalid date provided to formatYMD');
    }
    return Utilities.formatDate(date, TZ, 'yyyy-MM-dd');
  },

  /**
   * Parse YYYY-MM-DD string to Date
   * @param {string} dateStr - Date string to parse
   * @return {Date|null} Parsed date or null if invalid
   */
  parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    try {
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      
      const date = this.buildDate(year, month, day);
      return isNaN(date) ? null : date;
    } catch (e) {
      return null;
    }
  },

  /**
   * Check if date is a business day (not weekend or holiday)
   * @param {Date} date - Date to check
   * @return {boolean} True if business day
   */
  isBusinessDay(date) {
    if (!(date instanceof Date) || isNaN(date)) return false;
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    return !HolidayService.isHoliday(this.formatYMD(date));
  },

  /**
   * Add days to a date
   * @param {Date} date - Base date
   * @param {number} days - Number of days to add
   * @return {Date} New date
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Get start of day in script timezone
   * @param {Date} date - Date to get start of day for
   * @return {Date} Start of day
   */
  startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  },

  /**
   * Get end of day in script timezone
   * @param {Date} date - Date to get end of day for
   * @return {Date} End of day
   */
  endOfDay(date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  },

  /**
   * Check if date is before today
   * @param {Date} date - Date to check
   * @return {boolean} True if date is before today
   */
  isBeforeToday(date) {
    if (!(date instanceof Date) || isNaN(date)) return true;
    const today = this.startOfDay(new Date());
    const checkDate = this.startOfDay(date);
    return checkDate < today;
  },

  /**
   * Check if date is beyond future window
   * @param {Date} date - Date to check
   * @param {number} futureDays - Number of future days allowed (default: FUTURE_DAYS)
   * @return {boolean} True if date is beyond future window
   */
  isBeyondFutureWindow(date, futureDays = FUTURE_DAYS) {
    if (!(date instanceof Date) || isNaN(date)) return true;
    const futureLimit = this.addDays(new Date(), futureDays);
    return date > futureLimit;
  },

  /**
   * Check if date is a weekend
   * @param {Date} date - Date to check
   * @return {boolean} True if date is weekend (Saturday or Sunday)
   */
  isWeekend(date) {
    if (!(date instanceof Date) || isNaN(date)) return true;
    return [0, 6].includes(date.getDay());
  },

  /**
   * Check if date is a valid business date (not before today, not weekend, not beyond future window, not holiday)
   * @param {Date} date - Date to check
   * @param {number} futureDays - Number of future days allowed (default: FUTURE_DAYS)
   * @return {boolean} True if valid business date
   */
  isValidBusinessDate(date, futureDays = FUTURE_DAYS) {
    if (!(date instanceof Date) || isNaN(date)) return false;
    return !this.isBeforeToday(date) && 
           !this.isWeekend(date) && 
           !this.isBeyondFutureWindow(date, futureDays) && 
           !HolidayService.isHoliday(this.formatYMD(date));
  }
};

/**
 * Syncs appointment events for a specific date with form responses
 * @param {Date} dateObj - The date to sync appointments for
 * @param {Array} formResponses - Array of form response objects with lastName, firstName, purok, barangay, sheetName
 * @param {Calendar} calendar - Calendar instance to sync with
 */
function syncAppointmentsForDate(dateObj, formResponses, calendar) {
  const expected = new Set(
    formResponses.map(r =>
      `${r.sheetName}:${r.lastName}, ${r.firstName} ${r.purok}, ${r.barangay} ${APPT_EVENT_TAG}`
    )
  );
  const events = calendar.getEventsForDay(dateObj)
    .filter(e => e.getTitle().includes(APPT_EVENT_TAG));
  const existing = new Map(events.map(e => [e.getTitle().trim(), e]));
  expected.forEach(title => {
    if (!existing.has(title)) {
      CalendarQuotaManager.safeCreateEvent(() =>
        calendar.createAllDayEvent(title, dateObj)
      );
    }
  });
  existing.forEach((evt, title) => {
    if (!expected.has(title)) {
      CalendarQuotaManager.safeDeleteEvent(() => evt.deleteEvent());
    }
  });
}


/**
 * Calendar quota management service
 */
const CalendarQuotaManager = {
  /**
   * Initialize quota tracking for a run
   */
  initRun() {
    calendarCallsThisRun = 0;
  },

  /**
   * Check if we can make more calendar API calls
   * @param {number} count - Number of calls to check
   * @return {boolean} True if calls are allowed
   */
  canCall(count = 1) {
    if (calendarCallsThisRun + count > CALENDAR_API_CALL_LIMIT_PER_RUN) {
      logTS(`CalendarQuotaManager: Run limit exceeded (${calendarCallsThisRun}/${CALENDAR_API_CALL_LIMIT_PER_RUN})`);
      return false;
    }
    if (calendarCallsToday + count > CALENDAR_API_CALL_LIMIT_PER_DAY) {
      logTS(`CalendarQuotaManager: Daily limit exceeded (${calendarCallsToday}/${CALENDAR_API_CALL_LIMIT_PER_DAY})`);
      return false;
    }
    return true;
  },

  /**
   * Record calendar API calls
   * @param {number} count - Number of calls made
   */
  recordCall(count = 1) {
    calendarCallsThisRun += count;
    calendarCallsToday += count;
    
    // Update daily counter in cache and properties
    try {
      CACHE.put(SCRIPT_VERSION + '_calendar_calls_today', String(calendarCallsToday), 21600); // 6 hours
      PropertiesService.getScriptProperties().setProperty(SCRIPT_VERSION + '_calendar_calls_today', String(calendarCallsToday));
    } catch (e) {
      logTS('CalendarQuotaManager.recordCall: Error updating counters: ' + e);
    }
  },

  /**
   * Get current quota usage
   * @return {Object} Quota usage stats
   */
  getQuotaStats() {
    return {
      runCalls: calendarCallsThisRun,
      runLimit: CALENDAR_API_CALL_LIMIT_PER_RUN,
      dailyCalls: calendarCallsToday,
      dailyLimit: CALENDAR_API_CALL_LIMIT_PER_DAY
    };
  },

  /**
   * Safely create calendar event with quota checking
   * @param {string} title - Event title
   * @param {Date} date - Event date
   * @param {Object} opts - Additional options
   * @return {CalendarEvent|null} Created event or null if quota exceeded
   */
  safeCreateEvent(title, date, opts = {}) {
    if (!this.canCall(1)) {
      logTS('CalendarQuotaManager.safeCreateEvent: Quota exceeded');
      return null;
    }
    
    try {
      const event = CAL.createAllDayEvent(title, date);
      if (opts.description) {
        event.setDescription(opts.description);
      }
      this.recordCall(1);
      return event;
    } catch (e) {
      logTS('CalendarQuotaManager.safeCreateEvent: Error creating event: ' + e);
      return null;
    }
  },

  /**
   * Safely delete calendar event with quota checking
   * @param {CalendarEvent} event - Event to delete
   * @return {boolean} Success status
   */
  safeDeleteEvent(event) {
    if (!this.canCall(1)) {
      logTS('CalendarQuotaManager.safeDeleteEvent: Quota exceeded');
      return false;
    }
    
    try {
      event.deleteEvent();
      this.recordCall(1);
      return true;
    } catch (e) {
      logTS('CalendarQuotaManager.safeDeleteEvent: Error deleting event: ' + e);
      return false;
    }
  },

  /**
   * Safely update event title with quota checking
   * @param {CalendarEvent} event - Event to update
   * @param {string} newTitle - New title
   * @return {boolean} Success status
   */
  safeUpdateTitle(event, newTitle) {
    if (!this.canCall(1)) {
      logTS('CalendarQuotaManager.safeUpdateTitle: Quota exceeded');
      return false;
    }
    
    try {
      event.setTitle(newTitle);
      this.recordCall(1);
      return true;
    } catch (e) {
      logTS('CalendarQuotaManager.safeUpdateTitle: Error updating title: ' + e);
      return false;
    }
  },

  /**
   * Reset daily quota counters
   */
  resetDaily() {
    calendarCallsToday = 0;
    try {
      CACHE.put(SCRIPT_VERSION + '_calendar_calls_today', '0', 21600);
      PropertiesService.getScriptProperties().setProperty(SCRIPT_VERSION + '_calendar_calls_today', '0');
      logTS('CalendarQuotaManager.resetDaily: Daily counters reset');
    } catch (e) {
      logTS('CalendarQuotaManager.resetDaily: Error resetting counters: ' + e);
    }
  }
};

/**
 * Holiday service for managing holiday checks and caching
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
    { month: 8, day: 21, name: 'Ninoy Aquino Day' },
    { month: 11, day: 1, name: "All Saints' Day" },
    { month: 11, day: 2, name: "All Souls' Day" },
    { month: 11, day: 30, name: 'Bonifacio Day' },
    { month: 12, day: 8, name: 'Feast of the Immaculate Conception' },
    { month: 12, day: 25, name: 'Christmas Day' },
    { month: 12, day: 30, name: 'Rizal Day' },
    { month: 12, day: 31, name: "New Year's Eve" }
  ],

  /**
   * Check if a date is a holiday
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @return {boolean} True if holiday
   */
  isHoliday(dateStr) {
    if (!dateStr) return false;
    const date = DateUtils.parseDate(dateStr);
    if (!date) return false;

    // Try cache first for quick lookup
    try {
      const cached = CACHE.get(HOLIDAY_CACHE_KEY);
      if (cached) {
        const cachedHolidays = new Set(JSON.parse(cached));
        if (cachedHolidays.has(dateStr)) {
          return true;
        }
      }
    } catch (e) {
      logTS('HolidayService.isHoliday: Cache error: ' + e);
    }

    // Initialize calendar on first call
    if (!this._initialized) {
      this.initHolidayCalendar();
    }

    // Try ICS calendar first if available
    if (this._calendarAvailable) {
      try {
        const events = CalendarApp.getCalendarById(HOLIDAY_CAL_ID).getEventsForDay(date);
        return events.length > 0;
      } catch (e) {
        this._calendarAvailable = false;
        logTS('HolidayService.isHoliday: ICS calendar error, falling back to manual: ' + e);
      }
    }

    // Fallback to manual holidays if ICS unavailable
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return this._manualHolidays.some(h => h.month === month && h.day === day);
  },

  /**
   * Initialize the holiday calendar
   */
  initHolidayCalendar() {
    if (this._initialized) return;
    
    try {
      this._holidayCalendar = CalendarApp.getCalendarById(HOLIDAY_CAL_ID);
      this._calendarAvailable = true;
    } catch (e) {
      this._calendarAvailable = false;
      logTS('HolidayService: Calendar access failed: ' + e);
    }
    
    this._initialized = true;
  },

  /**
   * Fetch holiday dates within a range and cache them
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @return {Set<string>} Set of holiday date strings in yyyy-MM-dd format
   */
  fetchRange(start, end) {
    // Try cache first
    try {
      const cached = CACHE.get(HOLIDAY_CACHE_KEY);
      if (cached) {
        const cachedHolidays = new Set(JSON.parse(cached));
        // Check if requested range is subset of cached dates
        const startStr = DateUtils.formatYMD(start);
        const endStr = DateUtils.formatYMD(end);
        let currentDate = new Date(start);
        let allCached = true;
        
        while (currentDate <= end) {
          const dateStr = DateUtils.formatYMD(currentDate);
          // We only need to check if holidays are cached, not all dates
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Return cached holidays within range
        const rangeHolidays = new Set();
        currentDate = new Date(start);
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
      logTS('HolidayService.fetchRange: Cache error: ' + e);
    }

    // Initialize calendar availability
    if (!this._initialized) {
      this.initHolidayCalendar();
    }

    const holidayDates = new Set();

    // Try ICS calendar first if available
    if (this._calendarAvailable) {
      try {
        const events = this._holidayCalendar.getEvents(start, end);
        events.forEach(event => {
          const eventDate = event.getStartTime();
          holidayDates.add(DateUtils.formatYMD(eventDate));
        });
      } catch (e) {
        this._calendarAvailable = false;
        logTS('HolidayService.fetchRange: ICS calendar error, falling back to manual: ' + e);
      }
    }

    // Union with manual holidays (fallback or supplement)
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      
      if (this._manualHolidays.some(h => h.month === month && h.day === day)) {
        holidayDates.add(DateUtils.formatYMD(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Cache the results
    try {
      CACHE.put(HOLIDAY_CACHE_KEY, JSON.stringify([...holidayDates]), HOLIDAY_CACHE_TTL);
    } catch (e) {
      logTS('HolidayService.fetchRange: Cache put error: ' + e);
    }
    
    return holidayDates;
  },

  /**
   * Ensure holiday events exist in the calendar for the given range
   * @param {Date} start - Start date
   * @param {Date} end - End date
   */
  upsertHolidayEvents(start, end) {
    try {
      const holidayDates = this.fetchRange(start, end);
      
      for (const dateStr of holidayDates) {
        const date = DateUtils.parseDate(dateStr);
        if (!date) continue;
        
        // Check if holiday event already exists
        const existingEvents = CAL.getEventsForDay(date).filter(e => 
          e.getTitle().includes(TAG_HOLIDAY)
        );
        
        if (existingEvents.length === 0) {
          // Create holiday event
          const holidayName = this._getHolidayName(date);
          const title = `${holidayName} ${TAG_HOLIDAY}`;
          
          if (CalendarQuotaManager.canCall(1)) {
            const event = CAL.createAllDayEvent(title, date);
            event.setColor(CalendarApp.EventColor.GRAY);
            CalendarQuotaManager.recordCall(1);
            logTS(`HolidayService.upsertHolidayEvents: Created holiday event for ${dateStr}`);
          }
        }
      }
    } catch (e) {
      logTS('HolidayService.upsertHolidayEvents: Error: ' + e);
    }
  },

  /**
   * Get holiday name for a date
   * @param {Date} date - Date to check
   * @return {string} Holiday name or 'Holiday'
   * @private
   */
  _getHolidayName(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const holiday = this._manualHolidays.find(h => h.month === month && h.day === day);
    return holiday ? holiday.name : 'Holiday';
  }
};

/**
 * Purges past calendar events (appointments and summaries) before today
 */
function purgePastCalendarEvents() {
  const todayStart = DateUtils.startOfDay(new Date());
  logTS('purgePastCalendarEvents: start, cutoff=' + todayStart.toISOString());
  
  try {
    // Fetch all events from 1970 to today start
    const start = new Date(1970, 0, 1);
    const allEvents = CAL.getEvents(start, todayStart);
    
    // Filter events that are appointments or daily summaries
    const filteredEvents = allEvents.filter(event => {
      const title = event.getTitle();
      return title.includes('[APPOINTMENT]') || title.includes('[DAILY_SUMMARY]');
    });
    
    logTS(`purgePastCalendarEvents: Found ${filteredEvents.length} past events to delete`);
    
    if (filteredEvents.length === 0) {
      logTS('purgePastCalendarEvents: No past events to delete');
      return;
    }
    
    // Delete events in chunks to avoid timeouts
    const chunks = chunkArray(filteredEvents, CHUNK_SIZE);
    let deletedCount = 0;
    
    chunks.forEach((chunk, chunkIndex) => {
      try {
        chunk.forEach(ev => {
          if (CalendarQuotaManager.safeDeleteEvent(ev)) {
            deletedCount++;
          }
        });
        logTS(`purgePastCalendarEvents: Deleted chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} events)`);
      } catch (e) {
        logTS('purgePastCalendarEvents: Error deleting chunk: ' + e);
      }
    });
    
    logTS(`purgePastCalendarEvents: end, deleted ${deletedCount} past events`);
    
  } catch (e) {
    logTS('purgePastCalendarEvents: Error: ' + e);
    sendThrottledError('purgePastCalendarEvents', e);
  }
}

/**
 * Purges future summary events beyond the future window
 */
function purgeFutureSummaryEvents() {
  const futureCutoff = DateUtils.endOfDay(DateUtils.addDays(new Date(), FUTURE_DAYS));
  const farFuture = new Date(new Date().getFullYear() + 5, 11, 31); // 5 years in future for safety
  logTS('purgeFutureSummaryEvents: start, cutoff=' + futureCutoff.toISOString());
  
  try {
    // Fetch events from future cutoff + 1ms to far future
    const searchStart = new Date(futureCutoff.getTime() + 1);
    const allEvents = CAL.getEvents(searchStart, farFuture);
    
    // Filter events that contain FULL_SUMMARY_TAG
    const filteredEvents = allEvents.filter(event => {
      const title = event.getTitle();
      return title.includes(FULL_SUMMARY_TAG);
    });
    
    logTS(`purgeFutureSummaryEvents: Found ${filteredEvents.length} future summary events to delete`);
    
    if (filteredEvents.length === 0) {
      logTS('purgeFutureSummaryEvents: No future summary events to delete');
      return;
    }
    
    // Delete events in chunks to avoid timeouts
    const chunks = chunkArray(filteredEvents, CHUNK_SIZE);
    let deletedCount = 0;
    
    chunks.forEach((chunk, chunkIndex) => {
      try {
        chunk.forEach(ev => {
          if (CalendarQuotaManager.safeDeleteEvent(ev)) {
            deletedCount++;
          }
        });
        logTS(`purgeFutureSummaryEvents: Deleted chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} events)`);
      } catch (e) {
        logTS('purgeFutureSummaryEvents: Error deleting chunk: ' + e);
      }
    });
    
    logTS(`purgeFutureSummaryEvents: end, deleted ${deletedCount} future summary events`);
    
  } catch (e) {
    logTS('purgeFutureSummaryEvents: Error: ' + e);
    sendThrottledError('purgeFutureSummaryEvents', e);
  }
}

/**
 * Purges weekend summary events that shouldn't exist
 */
function purgeWeekendSummaryEvents() {
  const start = DateUtils.startOfDay(DateUtils.addDays(new Date(), -30));
  const end = DateUtils.endOfDay(DateUtils.addDays(new Date(), FUTURE_DAYS));
  logTS('WeekendPurge: start, window=' + start.toISOString() + ' to ' + end.toISOString());
  
  try {
    // Fetch all events with FULL_SUMMARY_TAG in the window
    const allEvents = CAL.getEvents(start, end);
    const summaryEvents = allEvents.filter(event => {
      const title = event.getTitle();
      return title.includes(FULL_SUMMARY_TAG);
    });
    
    // Filter events that are on invalid business dates
    const weekendEvents = summaryEvents.filter(event => {
      const eventDate = event.getStartTime();
      return !DateUtils.isValidBusinessDate(eventDate);
    });
    
    logTS(`WeekendPurge: Found ${weekendEvents.length} weekend/invalid summary events to delete`);
    
    if (weekendEvents.length === 0) {
      logTS('WeekendPurge: No weekend summary events to delete');
      return;
    }
    
    // Delete events in chunks to avoid timeouts
    const chunks = chunkArray(weekendEvents, CHUNK_SIZE);
    let deletedCount = 0;
    
    chunks.forEach((chunk, chunkIndex) => {
      try {
        chunk.forEach(ev => {
          if (CalendarQuotaManager.safeDeleteEvent(ev)) {
            deletedCount++;
          }
        });
        logTS(`WeekendPurge: Deleted chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} events)`);
      } catch (e) {
        logTS('WeekendPurge: Error deleting chunk: ' + e);
      }
    });
    
    logTS(`WeekendPurge: end, deleted ${deletedCount} weekend summary events`);
    
  } catch (e) {
    logTS('WeekendPurge: Error: ' + e);
    sendThrottledError('purgeWeekendSummaryEvents', e);
  }
}

/**
 * Calendar sync service for managing events and quotas
 */
const CalendarSyncService = {
  /**
   * Sync calendar events for a date range
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
      // Initialize quota manager
      CalendarQuotaManager.initRun();

      // Load all events
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
      const currentDate = new Date(start);
      while (currentDate <= end) {
        try {
          const dateStr = DateUtils.formatYMD(currentDate);
          const dateObj = new Date(currentDate);
          
          // Skip invalid dates using guards
          if (DateUtils.isBeforeToday(dateObj) || DateUtils.isWeekend(dateObj) || DateUtils.isBeyondFutureWindow(dateObj)) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }

          const dateEvents = eventsByDate.get(dateStr) || { summary: [], appointments: [] };

          // Skip holidays
          if (HolidayService.isHoliday(dateStr)) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }

          // Sync summary events
          this.syncSummaryEvents(dateStr, dateEvents.summary, results.summaryEvents);

          // Sync appointment events
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
   * Sync summary events for a date
   * @param {string} dateStr - Date string
   * @param {CalendarEvent[]} existingEvents - Existing summary events
   * @param {Object} results - Results object to update
   */
  syncSummaryEvents(dateStr, existingEvents, results) {
    try {
      const dateObj = DateUtils.parseDate(dateStr);
      if (!dateObj) {
        throw new Error(`Invalid date string: ${dateStr}`);
      }

      // Guard against invalid dates using new helper
      if (!DateUtils.isValidBusinessDate(dateObj)) {
        logTS('BizDateGuard: syncSummaryEvents skipping invalid date ' + dateStr);
        return;
      }

      // Get availability data
      const { totalBooked, minLeft } = this.getAvailabilityForDate(dateStr);
      const expectedTitle = `${minLeft} slots left ${FULL_SUMMARY_TAG}`;

      // Check for existing events with exact title match
      const existingWithTitle = CAL.getEvents(dateObj, dateObj, { search: expectedTitle });
      const hasExactMatch = existingWithTitle.length > 0;

      if (existingEvents.length === 0 && !hasExactMatch) {
        // Create new summary event only if no exact match exists
        const event = CalendarQuotaManager.safeCreateEvent(expectedTitle, dateObj);
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
        if (keeper.getTitle() !== expectedTitle) {
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
   * Sync appointment events for a date
   * @param {string} dateStr - Date string
   * @param {CalendarEvent[]} existingEvents - Existing appointment events
   * @param {Object} results - Results object to update
   */
  syncAppointmentEvents(dateStr, existingEvents, results) {
    try {
      const dateObj = DateUtils.parseDate(dateStr);
      if (!dateObj) {
        throw new Error(`Invalid date string: ${dateStr}`);
      }

      // Get expected appointments
      const expectedAppointments = this.getExpectedAppointmentsForDate(dateStr);
      const existingTitles = new Set(existingEvents.map(e => e.getTitle()));

      // Find missing and extra appointments
      const missing = new Set([...expectedAppointments].filter(x => !existingTitles.has(x)));
      const extra = new Set([...existingTitles].filter(x => !expectedAppointments.has(x)));

      // Create missing appointments
      for (const title of missing) {
        // Check for exact match before creating
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
   * Get availability data for a date
   * @param {string} dateStr - Date string
   * @return {Object} Availability data
   */
  getAvailabilityForDate(dateStr) {
    const totalBooked = {};
    let minLeft = SLOT_CAP;

    for (const entry of FORM_REGISTRY) {
      try {
        const sheet = getCachedSpreadsheet(entry.spreadsheetId).getSheetByName(entry.availabilitySheetName);
        if (!sheet) continue;

        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0] === dateStr) {
            const booked = row[AVAIL_BOOKED_COL - 1] || 0;
            const left = row[AVAIL_LEFT_COL - 1] || SLOT_CAP;
            totalBooked[entry.formId] = booked;
            minLeft = Math.min(minLeft, left);
          }
        }
      } catch (e) {
        ErrorService.logError('CalendarSyncService.getAvailabilityForDate', e, { dateStr, formId: entry.formId });
      }
    }

    return { totalBooked, minLeft };
  },

  /**
   * Get expected appointments for a date with deduplication
   * @param {string} dateStr - Date string
   * @return {Set<string>} Set of expected appointment titles
   */
  getExpectedAppointmentsForDate(dateStr) {
    const expectedTitles = new Set();
    const seenSubmissions = new Set(); // For deduplication

    for (const entry of FORM_REGISTRY) {
      try {
        const sheet = getCachedSpreadsheet(entry.spreadsheetId).getSheetByName(entry.sheetName);
        if (!sheet) continue;

        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const lastNameCol = headers.indexOf('Last Name');
        const firstNameCol = headers.indexOf('First Name');
        const purokCol = headers.indexOf('Purok');
        const barangayCol = headers.indexOf('Barangay');
        const dateCol = headers.indexOf('Date of Appointment');
        const timestampCol = headers.indexOf('Timestamp');

        if (lastNameCol === -1 || firstNameCol === -1 || purokCol === -1 || 
            barangayCol === -1 || dateCol === -1 || timestampCol === -1) continue;

        // Sort by timestamp to handle duplicates
        const rows = data.slice(1)
          .map((row, index) => ({ row, index: index + 1 }))
          .filter(({ row }) => row[dateCol] === dateStr)
          .sort((a, b) => new Date(b.row[timestampCol]) - new Date(a.row[timestampCol]));

        for (const { row } of rows) {
          const submissionKey = `${row[lastNameCol]}-${row[firstNameCol]}-${row[purokCol]}-${row[barangayCol]}`;
          if (!seenSubmissions.has(submissionKey)) {
            seenSubmissions.add(submissionKey);
            const title = `${entry.sheetName}:${row[lastNameCol]}, ${row[firstNameCol]} ${row[purokCol]}, ${row[barangayCol]} ${APPT_EVENT_TAG}`;
            expectedTitles.add(title);
          }
        }
      } catch (e) {
        ErrorService.logError('CalendarSyncService.getExpectedAppointmentsForDate', e, { dateStr, formId: entry.formId });
      }
    }

    return expectedTitles;
  }
};

/**
 * Availability management service for seeding windows and guarded decrements
 */
const AvailabilityService = {
  /**
   * Seeds availability window by ensuring all dates from startDate to startDate+futureDays exist in all sheets
   * @param {Date} startDate - Starting date (typically today)
   * @param {number} futureDays - Number of days to seed forward
   */
  seedAvailabilityWindow(startDate, futureDays) {
    logTS('AvailabilityService.seedAvailabilityWindow: start');
    
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
      logTS('AvailabilityService.seedAvailabilityWindow: Lock busy, skipping');
      return;
    }
    
    try {
      const today = DateUtils.formatYMD(startDate);
      const endDate = new Date(startDate.getTime() + futureDays * 86400000);
      const endDateStr = DateUtils.formatYMD(endDate);
      
      // Process each registry entry
      FORM_REGISTRY.forEach(entry => {
        try {
          logTS('AvailabilityService.seedAvailabilityWindow: Processing ' + entry.availabilitySheetName);
          
          const sheet = getOrCreateSheet_(entry);
          
          // Ensure headers exist
          const dataRange = sheet.getDataRange();
          const values = dataRange.getValues();
          if (values.length === 0) {
            sheet.getRange(1, 1, 1, 3).setValues([['Date', 'Booked', 'Slots Left']]);
          }
          
          // Single loop to delete stale rows (Date < today OR Date > endDate)
          const rowsToDelete = [];
          for (let i = 1; i < values.length; i++) {
            const cellDate = safeParseDate_(values[i][0]);
            if (cellDate && (cellDate < today || cellDate > endDateStr)) {
              rowsToDelete.push(i + 1); // +1 for 1-based indexing
            }
          }
          
          // Delete stale rows in reverse order
          rowsToDelete.reverse().forEach(rowIndex => {
            try {
              sheet.deleteRow(rowIndex);
            } catch (e) {
              logTS('AvailabilityService.seedAvailabilityWindow: Error deleting row: ' + e);
            }
          });
          
          // Re-read data after deletions
          const currentData = sheet.getDataRange().getValues();
          const existingDates = new Set();
          for (let i = 1; i < currentData.length; i++) {
            const cellDate = safeParseDate_(currentData[i][0]);
            if (cellDate) {
              existingDates.add(cellDate);
            }
          }
          
          // Generate missing rows only for dates from today through endDate
          const missingRows = [];
          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dateString = DateUtils.formatYMD(currentDate);
            
            // Skip weekends and holidays
            if (!DateUtils.isWeekend(currentDate) && !HolidayService.isHoliday(dateString)) {
              if (!existingDates.has(dateString)) {
                missingRows.push([dateString, 0, SLOT_CAP]);
              }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          // Append missing rows
          if (missingRows.length > 0) {
            const lastRow = sheet.getLastRow();
            sheet.getRange(lastRow + 1, 1, missingRows.length, 3).setValues(missingRows);
            logTS('AvailabilityService.seedAvailabilityWindow: Added ' + missingRows.length + ' missing dates to ' + entry.availabilitySheetName);
          }
          
        } catch (e) {
          logTS('AvailabilityService.seedAvailabilityWindow: Error processing ' + entry.availabilitySheetName + ': ' + e);
          sendThrottledError('AvailabilityService.seedAvailabilityWindow-' + entry.availabilitySheetName, e);
        }
      });
      
      logTS('AvailabilityService.seedAvailabilityWindow: end');
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Decrements slots across all categories with preflight guard against overbooking
   * @param {Date} dateObj - The appointment date object
   * @return {number[]} Array of newLeft values from each sheet, or empty array if failed
   */
  decrementSlotAllCategories(dateObj) {
    logTS('AvailabilityService.decrementSlotAllCategories: start for ' + DateUtils.formatYMD(dateObj));
    
    const dateString = DateUtils.formatYMD(dateObj);
    
    // Holiday guard: early exit on holidays
    if (HolidayService.isHoliday(dateString)) {
      logTS('AvailabilityService.decrementSlotAllCategories: booking on holiday rejected: ' + dateString);
      throw new Error('Cannot book appointments on holidays');
    }
    
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
      logTS('AvailabilityService.decrementSlotAllCategories: Lock busy, skipping for ' + dateString);
      throw new Error('System busy, please try again');
    }
    
    try {
      // Phase 1: Read all current "Slots Left" values and check for overbooking
      const sheetData = [];
      let hasOverbooking = false;
      
      for (const entry of FORM_REGISTRY) {
        try {
          const sheet = getSpreadsheet_(entry).getSheetByName(entry.availabilitySheetName);
          if (!sheet) {
            logTS('AvailabilityService.decrementSlotAllCategories: Sheet not found: ' + entry.availabilitySheetName);
            sheetData.push({ entry, sheet: null, targetRow: -1, currentLeft: 0 });
            continue;
          }
          
          const dataRange = sheet.getDataRange();
          const values = dataRange.getValues();
          
          let targetRow = -1;
          let currentLeft = SLOT_CAP;
          
          // Find the row for this date
          for (let i = 1; i < values.length; i++) {
            const cellDate = safeParseDate_(values[i][0]);
            if (cellDate === dateString) {
              targetRow = i + 1; // +1 for 1-based indexing
              currentLeft = typeof values[i][AVAIL_LEFT_COL - 1] === 'number' ? values[i][AVAIL_LEFT_COL - 1] : SLOT_CAP;
              break;
            }
          }
          
          // If no row found, create one
          if (targetRow === -1) {
            if (values.length === 0) {
              sheet.getRange(1, 1, 1, 3).setValues([['Date', 'Booked', 'Slots Left']]);
            }
            targetRow = sheet.getLastRow() + 1;
            sheet.getRange(targetRow, 1, 1, 3).setValues([[dateString, 0, SLOT_CAP]]);
            currentLeft = SLOT_CAP;
          }
          
          // Check for overbooking
          if (currentLeft <= 0) {
            hasOverbooking = true;
            logTS('AvailabilityService.decrementSlotAllCategories: Overbooking detected in ' + entry.availabilitySheetName + ' for ' + dateString);
          }
          
          sheetData.push({ entry, sheet, targetRow, currentLeft });
          
        } catch (e) {
          logTS('AvailabilityService.decrementSlotAllCategories: Error reading ' + entry.availabilitySheetName + ': ' + e);
          sendThrottledError('AvailabilityService.decrementSlotAllCategories-read-' + entry.availabilitySheetName, e);
          sheetData.push({ entry, sheet: null, targetRow: -1, currentLeft: 0 });
          hasOverbooking = true;
        }
      }
      
      // If any sheet has overbooking, abort the entire operation
      if (hasOverbooking) {
        throw new Error('No available slots for ' + dateString);
      }
      
      // Phase 2: Write decremented values to all sheets
      const newLeftValues = [];
      
      for (const data of sheetData) {
        try {
          if (!data.sheet || data.targetRow === -1) {
            newLeftValues.push(0);
            continue;
          }
          
          const currentBooked = data.sheet.getRange(data.targetRow, AVAIL_BOOKED_COL).getValue();
          const newBooked = (typeof currentBooked === 'number' ? currentBooked : 0) + 1;
          const newLeft = Math.max(0, data.currentLeft - 1);
          
          data.sheet.getRange(data.targetRow, AVAIL_BOOKED_COL).setValue(newBooked);
          data.sheet.getRange(data.targetRow, AVAIL_LEFT_COL).setValue(newLeft);
          
          newLeftValues.push(newLeft);
          logTS('AvailabilityService.decrementSlotAllCategories: Updated ' + data.entry.availabilitySheetName + ' for ' + dateString + ': ' + data.currentLeft + '→' + newLeft);
          
        } catch (e) {
          logTS('AvailabilityService.decrementSlotAllCategories: Error writing to ' + data.entry.availabilitySheetName + ': ' + e);
          sendThrottledError('AvailabilityService.decrementSlotAllCategories-write-' + data.entry.availabilitySheetName, e);
          newLeftValues.push(0);
        }
      }
      
      logTS('AvailabilityService.decrementSlotAllCategories: end for ' + dateString + ' with results: ' + JSON.stringify(newLeftValues));
      return newLeftValues;
      
    } finally {
      lock.releaseLock();
    }
  }
};

// Helper functions
function getCachedSpreadsheet(id) {
  if (!_ssCache[id]) {
    _ssCache[id] = SpreadsheetApp.openById(id);
  }
  return _ssCache[id];
}

function getCachedForm(id) {
  if (!_formCache[id]) {
    _formCache[id] = FormApp.openById(id);
  }
  return _formCache[id];
}

function removeTestTriggers_() {
  ScriptApp.getProjectTriggers().forEach(tr => {
    if (tr.getHandlerFunction() === 'runTests') ScriptApp.deleteTrigger(tr);
  });
}

/**
 * Service to manage creation, deletion, and validation of triggers.
 */
const TriggerService = {
  listAllTriggers() {
    return ScriptApp.getProjectTriggers();
  },
  removeSpreadsheetBoundFormSubmitTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      try {
        if (trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT &&
            trigger.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS) {
          ScriptApp.deleteTrigger(trigger);
          logTS('TriggerService: removed spreadsheet trigger ' + trigger.getUniqueId());
        }
      } catch (e) {
        logTS('TriggerService: error removing trigger: ' + e);
        sendThrottledError('TriggerService.removeSpreadsheetBoundFormSubmitTriggers', e);
      }
    });
  },
  triggerExists({handlerFunction, eventType, source, sourceId}) {
    return ScriptApp.getProjectTriggers().some(trigger => {
      if (handlerFunction && trigger.getHandlerFunction() !== handlerFunction) return false;
      if (eventType && trigger.getEventType() !== eventType) return false;
      if (source && trigger.getTriggerSource() !== source) return false;
      if (sourceId && trigger.getTriggerSourceId() !== sourceId) return false;
      return true;
    });
  },
  createFormSubmitTrigger(formId) {
    try {
      const form = FormApp.openById(formId);
      ScriptApp.newTrigger('onFormSubmit')
        .forForm(form)
        .onFormSubmit()
        .create();
      logTS('TriggerService: created form submit trigger for ' + formId);
    } catch (e) {
      logTS('TriggerService: error creating form submit trigger for ' + formId + ': ' + e);
      sendThrottledError('TriggerService.createFormSubmitTrigger-' + formId, e);
    }
  },
  ensureTimeTriggers() {
    const existing = ScriptApp.getProjectTriggers();
    // Daily purgeOldResponsesAll at midnight
    if (!this.triggerExists({handlerFunction: 'purgeOldResponsesAll', eventType: ScriptApp.EventType.CLOCK})) {
      ScriptApp.newTrigger('purgeOldResponsesAll')
        .timeBased()
        .everyDays(1)
        .atHour(0)
        .create();
      logTS('TriggerService: created daily purgeOldResponsesAll trigger');
    }
    // Hourly rebuildAllFormDropdowns
    if (!this.triggerExists({handlerFunction: 'rebuildAllFormDropdowns', eventType: ScriptApp.EventType.CLOCK})) {
      ScriptApp.newTrigger('rebuildAllFormDropdowns')
        .timeBased()
        .everyHours(1)
        .create();
      logTS('TriggerService: created hourly rebuildAllFormDropdowns trigger');
    }
    // Daily midnight updateAvailability_everywhere
    if (!this.triggerExists({handlerFunction: 'updateAvailability_everywhere', eventType: ScriptApp.EventType.CLOCK})) {
      ScriptApp.newTrigger('updateAvailability_everywhere')
        .timeBased()
        .everyDays(1)
        .atHour(0)
        .create();
      logTS('TriggerService: created daily midnight updateAvailability_everywhere trigger');
    }
    // Daily calendar quota reset at midnight
    if (!this.triggerExists({handlerFunction: 'resetCalendarQuotaDaily', eventType: ScriptApp.EventType.CLOCK})) {
      ScriptApp.newTrigger('resetCalendarQuotaDaily')
        .timeBased()
        .everyDays(1)
        .atHour(0)
        .create();
      logTS('TriggerService: created daily calendar quota reset trigger');
    }
    // Remove extraneous clock triggers
    existing.forEach(trigger => {
      try {
        if (trigger.getEventType() === ScriptApp.EventType.CLOCK &&
            ['purgeOldResponsesAll', 'rebuildAllFormDropdowns', 'updateAvailability_everywhere', 'resetCalendarQuotaDaily']
              .indexOf(trigger.getHandlerFunction()) === -1) {
          ScriptApp.deleteTrigger(trigger);
          logTS('TriggerService: removed extraneous clock trigger for ' + trigger.getHandlerFunction());
        }
      } catch (e) {
        logTS('TriggerService: error removing extraneous trigger: ' + e);
      }
    });
  }
};

/**
 * Helper to open the correct spreadsheet for a registry entry.
 * @param {Object} registryEntry - Registry entry with spreadsheetId.
 * @return {Spreadsheet} Opened spreadsheet.
 */
function getSpreadsheet_(registryEntry) {
  if (!registryEntry || typeof registryEntry.spreadsheetId !== 'string') {
    sendThrottledError('getSpreadsheet_', new Error('Invalid registryEntry'));
    throw new Error('Invalid registryEntry');
  }
  try {
    return SpreadsheetApp.openById(registryEntry.spreadsheetId);
  } catch (err) {
    sendThrottledError('getSpreadsheet_', err);
    throw err;
  }
}

/**
 * Rebuilds all appointment events by deleting existing ones and recreating from form response sheets.
 * Ensures appointment events always mirror the current sheet data.
 */
function rebuildAppointmentEventsAllForms() {
  logTS('rebuildAppointmentEventsAllForms:start');
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    logTS('rebuildAppointmentEventsAllForms: Lock busy, skipping');
    return;
  }
  
  try {
    // 1. Compute date range for appointment events
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + MAX_ADVANCE_DAYS * 86400000);
    
    // 2. Delete all existing appointment events in the range
    logTS('rebuildAppointmentEventsAllForms: Deleting existing appointment events');
    try {
      const existingEvents = CAL.getEvents(startDate, endDate);
      const appointmentEvents = existingEvents.filter(ev => ev.getTitle().startsWith(TAG_APPOINTMENT));
      
      // Delete in chunks to avoid timeout
      chunkArray(appointmentEvents, CHUNK_SIZE).forEach(chunk => {
        try {
          chunk.forEach(ev => ev.deleteEvent());
          logTS(`rebuildAppointmentEventsAllForms: Deleted ${chunk.length} appointment events`);
        } catch (e) {
          logTS('rebuildAppointmentEventsAllForms: Error deleting chunk: ' + e);
          sendThrottledError('rebuildAppointmentEventsAllForms-deleteChunk', e);
        }
      });
      
      logTS(`rebuildAppointmentEventsAllForms: Deleted total of ${appointmentEvents.length} appointment events`);
    } catch (e) {
      logTS('rebuildAppointmentEventsAllForms: Error fetching/deleting events: ' + e);
      sendThrottledError('rebuildAppointmentEventsAllForms-deleteEvents', e);
    }
    
    // 3. Recreate appointment events from all form response sheets
    logTS('rebuildAppointmentEventsAllForms: Recreating appointment events from response sheets');
    
    for (const entry of FORM_REGISTRY) {
      try {
        logTS('rebuildAppointmentEventsAllForms: processing ' + entry.sheetName);
        
        // Open the response sheet
        const sheet = getSpreadsheet_(entry).getSheetByName(entry.sheetName);
        if (!sheet) {
          logTS('rebuildAppointmentEventsAllForms: Sheet not found: ' + entry.sheetName);
          continue;
        }
        
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) {
          logTS('rebuildAppointmentEventsAllForms: No data rows in ' + entry.sheetName);
          continue;
        }
        
        // Read all response data from row 2 onward
        const responseData = sheet.getRange(2, 2, lastRow - 1, 5).getValues();
        let eventsCreated = 0;
        
        responseData.forEach((row, index) => {
          try {
            const [lastName, firstName, purok, barangay, dateChoice] = row;
            
            // Skip rows with missing or invalid data
            if (!dateChoice || typeof dateChoice !== 'string') {
              return;
            }
            
            // Extract date from dateChoice (format: "yyyy-MM-dd Day (X slots left)")
            const dateMatch = dateChoice.match(/^(\d{4}-\d{2}-\d{2})/);
            if (!dateMatch) {
              return;
            }
            
            const dateString = dateMatch[1];
            const appointmentDate = DateUtils.parseDate(dateString);
            if (!appointmentDate) {
              return;
            }
            
            // Skip dates outside our range
            if (appointmentDate < startDate || appointmentDate > endDate) {
              return;
            }
            
            // Skip holidays
            if (HolidayService.isHoliday(dateString)) {
              return;
            }
            
            // Create appointment event
            createCalendarEventFromResponse_(
              { lastName, firstName, purok, barangay },
              entry,
              appointmentDate
            );
            
            eventsCreated++;
            
          } catch (rowErr) {
            logTS(`rebuildAppointmentEventsAllForms: Error processing row ${index + 2} in ${entry.sheetName}: ${rowErr}`);
            sendThrottledError(`rebuildAppointmentEventsAllForms-processRow-${entry.sheetName}`, rowErr);
          }
        });
        
        logTS(`rebuildAppointmentEventsAllForms: Created ${eventsCreated} events for ${entry.sheetName}`);
        
      } catch (entryErr) {
        logTS(`rebuildAppointmentEventsAllForms: Error processing ${entry.sheetName}: ${entryErr}`);
        sendThrottledError(`rebuildAppointmentEventsAllForms-processEntry-${entry.sheetName}`, entryErr);
      }
    }
    
    logTS('rebuildAppointmentEventsAllForms:end');
    
  } catch (err) {
    logTS('rebuildAppointmentEventsAllForms: Error: ' + err);
    sendThrottledError('rebuildAppointmentEventsAllForms', err);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Retrieves the registry entry for a given form ID or spreadsheet ID.
 * @param {string} formId - The form ID or spreadsheet ID to look up.
 * @return {Object} Registry entry {formId, sheetName, availabilitySheetName}.
 * @throws {Error} If form not found in registry.
 */
function getRegistryEntry_(formId) {
  if (!formId || typeof formId !== 'string') {
    throw new Error('Invalid formId');
  }
  let registryEntry = FORM_REGISTRY.find(f => f.formId === formId);
  if (!registryEntry) {
    registryEntry = FORM_REGISTRY.find(f => f.spreadsheetId === formId);
  }
  if (!registryEntry) {
    throw new Error('Form not found in registry: ' + formId);
  }
  return registryEntry;
}

// Module-level throttle state
const propsEmail = PropertiesService.getScriptProperties();

// Module-level cache for form list item
let cachedListItem = null;
let cachedCounts = null;

/**
 * Creates a calendar event for a form submission and handles rollback on failure.
 * @param {Object} responseData - Object containing form response data {lastName, firstName, purok, barangay}.
 * @param {Object} registry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @param {Date} chosenDateObj - The appointment date object.
 */
function createCalendarEventFromResponse_(responseData, registry, chosenDateObj) {
  try {
    const lastName = responseData.lastName || 'User';
    const firstName = responseData.firstName || 'Unknown';
    const purok = responseData.purok || '';
    const barangay = responseData.barangay || '';

    const titleWithTag = `${registry.sheetName}:${lastName}, ${firstName} ${purok}, ${barangay} ${APPT_EVENT_TAG}`;
    
    // Check for existing events with the same title
    const existing = CAL.getEventsForDay(chosenDateObj)
                        .filter(e => e.getTitle().trim() === titleWithTag);
    if (existing.length) return existing[0];

    const title = titleWithTag;
    const description =
      `Last Name: ${lastName}\n` +
      `First Name: ${firstName}\n` +
      `Purok: ${purok}\n` +
      `Barangay: ${barangay}`;

    const event = CalendarQuotaManager.safeCreateEvent(titleWithTag, chosenDateObj, {
      description: description
    });

    if (!event) {
      logTS('createCalendarEventFromResponse_: Failed to create event due to quota limits');
      throw new Error('Calendar quota exceeded - could not create appointment event');
    }

    // Color-code based on remaining availability
    const dateString = DateUtils.formatYMD(chosenDateObj);
    const sheet = getSpreadsheet_(registry).getSheetByName(registry.availabilitySheetName);
    if (sheet) {
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      let slotsLeft = SLOT_CAP;

      for (let i = 1; i < values.length; i++) {
        const cellDate = safeParseDate_(values[i][0]);
        if (cellDate === dateString) {
          slotsLeft = typeof values[i][AVAIL_LEFT_COL - 1] === 'number' ? values[i][AVAIL_LEFT_COL - 1] : SLOT_CAP;
          break;
        }
      }

      const color = slotsLeft > 0 ? EVENT_COLOR_AVAILABLE : EVENT_COLOR_FULL;
      try {
        event.setColor(color);
      } catch (e) {
        logTS('createCalendarEventFromResponse_: Error setting event color: ' + e);
      }
    }

    logTS('createCalendarEventFromResponse_: Created appointment event for ' + dateString);
    return event;
  } catch (err) {
    logTS('createCalendarEventFromResponse_: Calendar error, reverting availability: ' + err);
    try {
      revertAvailabilityForDate_(registry, chosenDateObj);
    } catch (revertErr) {
      logTS('createCalendarEventFromResponse_: Revert failed: ' + revertErr);
    }
    throw err;
  }
}

/**
 * Reverts availability for a date by decrementing booked count and incrementing slots left.
 * @param {Object} registry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @param {Date} dateObj - The date to revert availability for.
 */
function revertAvailabilityForDate_(registry, dateObj) {
  try {
    const dateString = DateUtils.formatYMD(dateObj);
    const sheet = getSpreadsheet_(registry).getSheetByName(registry.availabilitySheetName);
    if (!sheet) {
      logTS('revertAvailabilityForDate_: Sheet not found: ' + registry.availabilitySheetName);
      return;
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    for (let i = 1; i < values.length; i++) {
      const cellDate = safeParseDate_(values[i][0]);
      if (cellDate === dateString) {
        const targetRow = i + 1;
        const currentBooked = typeof values[i][AVAIL_BOOKED_COL - 1] === 'number' ? values[i][AVAIL_BOOKED_COL - 1] : 0;
        const currentLeft = typeof values[i][AVAIL_LEFT_COL - 1] === 'number' ? values[i][AVAIL_LEFT_COL - 1] : SLOT_CAP;

        const newBooked = Math.max(0, currentBooked - 1);
        const newLeft = Math.min(SLOT_CAP, currentLeft + 1);

        sheet.getRange(targetRow, AVAIL_BOOKED_COL).setValue(newBooked);
        sheet.getRange(targetRow, AVAIL_LEFT_COL).setValue(newLeft);

        logTS('revertAvailabilityForDate_: Reverted availability for ' + dateString + ' to ' + newBooked + '/' + SLOT_CAP);
        return;
      }
    }

    logTS('revertAvailabilityForDate_: Date not found in availability sheet: ' + dateString);
  } catch (err) {
    logTS('revertAvailabilityForDate_: Error reverting availability: ' + err);
    sendThrottledError('revertAvailabilityForDate_', err);
  }
}

/**
 * Updates the form's date dropdown by reading availability sheet and filtering available dates.
 * @param {Object} registry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 */
function updateFormDateDropdown_(registry) {
  try {
    logTS('updateFormDateDropdown_: start for ' + registry.formId);
    
    const form = FormApp.openById(registry.formId);
    const li = getAppointmentListItem_(form);
    const sheet = getSpreadsheet_(registry).getSheetByName(registry.availabilitySheetName);
    
    if (!sheet) {
      logTS('updateFormDateDropdown_: Availability sheet not found: ' + registry.availabilitySheetName);
      return;
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const choices = [];
    const today = new Date();
    const maxDate = new Date(today.getTime() + MAX_ADVANCE_DAYS * 86400000);
    
    for (let i = 1; i < values.length; i++) {
      const dateString = safeParseDate_(values[i][0]);
      if (!dateString) continue;
      
      const date = DateUtils.parseDate(dateString);
      if (!date || date < today || date > maxDate) continue;
      
      // Skip holidays
      if (HolidayService.isHoliday(dateString)) continue;
      
      // Skip weekends
      if (DateUtils.isWeekend(date)) continue;
      
      const slotsLeft = typeof values[i][AVAIL_LEFT_COL - 1] === 'number' ? values[i][AVAIL_LEFT_COL - 1] : SLOT_CAP;
      
      // Only include dates with available slots
      if (slotsLeft > 0) {
        const weekday = Utilities.formatDate(date, TZ, 'EEE');
        const label = `${dateString} ${weekday} (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)`;
        choices.push(label);
      }
    }
    
    // Sort choices by date
    choices.sort((a, b) => {
      const dateA = a.split(' ')[0];
      const dateB = b.split(' ')[0];
      return dateA.localeCompare(dateB);
    });
    
    if (choices.length === 0) {
      logTS('updateFormDateDropdown_: no choices for ' + registry.formId + ', skipping update');
      return;
    }
    li.setChoiceValues(choices);
    cachedListItem = null; // Invalidate cache
    
    logTS('updateFormDateDropdown_: Updated ' + choices.length + ' choices for ' + registry.formId);
  } catch (err) {
    logTS('updateFormDateDropdown_: Error updating form dropdown: ' + err);
    sendThrottledError('updateFormDateDropdown_', err);
  }
}

/**
 * Ensures all forms in the registry have submit triggers.
 */
function ensureAllFormTriggersExist() {
  try {
    if (!Array.isArray(FORM_REGISTRY) || FORM_REGISTRY.length === 0 ||
        new Set(FORM_REGISTRY.map(r => r.formId)).size !== FORM_REGISTRY.length) {
      throw new Error('FORM_REGISTRY must be a non-empty array of unique formIds');
    }
    TriggerService.removeSpreadsheetBoundFormSubmitTriggers();
    logTS('ensureAllFormTriggersExist: cleaned up spreadsheet triggers');
    const existingTriggers = TriggerService.listAllTriggers();
    const created = [];
    const skipped = [];
    FORM_REGISTRY.forEach(entry => {
      try {
        const formId = entry.formId;
        if (!formId || typeof formId !== 'string') {
          throw new Error('Invalid formId in registry');
        }
        const exists = TriggerService.triggerExists({
          handlerFunction: 'onFormSubmit',
          eventType: ScriptApp.EventType.ON_FORM_SUBMIT,
          source: ScriptApp.TriggerSource.FORMS,
          sourceId: formId
        });
        if (exists) {
          skipped.push(formId);
        } else {
          TriggerService.createFormSubmitTrigger(formId);
          created.push(formId);
        }
      } catch (formErr) {
        sendThrottledError('ensureAllFormTriggersExist-form-' + entry.formId, formErr);
      }
    });
    logTS(`ensureAllFormTriggersExist: Created triggers for: ${JSON.stringify(created)}`);
    logTS(`ensureAllFormTriggersExist: Skipped (already existed): ${JSON.stringify(skipped)}`);
  } catch (err) {
    sendThrottledError('ensureAllFormTriggersExist', err);
    throw err;
  }
}

/**
 * Removes any existing spreadsheet-bound form submit triggers to prevent conflicts.
 * @deprecated Use TriggerService.removeSpreadsheetBoundFormSubmitTriggers instead.
 */
function removeSpreadsheetTriggers() {
  TriggerService.removeSpreadsheetBoundFormSubmitTriggers();
}

/**
 * Resets the daily calendar quota counter (called by midnight trigger)
 */
function resetCalendarQuotaDaily() {
  logTS('resetCalendarQuotaDaily: start');
  try {
    CalendarQuotaManager.resetDaily();
    logTS('resetCalendarQuotaDaily: end');
  } catch (err) {
    logTS('resetCalendarQuotaDaily: error: ' + err);
    sendThrottledError('resetCalendarQuotaDaily', err);
  }
}

/**
 * Sets up time-driven triggers for daily cleanup and form dropdown rebuilds.
 */
function setupTimeDrivenTriggers() {
  try {
    removeTestTriggers_();
    TriggerService.ensureTimeTriggers();
  } catch (err) {
    sendThrottledError('setupTimeDrivenTriggers', err);
    throw err;
  }
}

/**
 * Rebuilds all form dropdowns by reading availability sheets.
 */
function rebuildAllFormDropdowns() {
  try {
    logTS('rebuildAllFormDropdowns: start');
    
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
      logTS('rebuildAllFormDropdowns: Lock busy, skipping');
      return;
    }
    
    try {
      FORM_REGISTRY.forEach(entry => {
        try {
          updateFormDateDropdown_(entry);
        } catch (err) {
          logTS('rebuildAllFormDropdowns: Error updating form ' + entry.formId + ': ' + err);
          sendThrottledError('rebuildAllFormDropdowns-' + entry.formId, err);
        }
      });
      
      logTS('rebuildAllFormDropdowns: end');
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    logTS('rebuildAllFormDropdowns: Error: ' + err);
    sendThrottledError('rebuildAllFormDropdowns', err);
  }
}

/**
 * Checks if a given date is a holiday.
 * @param {string} dateText - Date string in yyyy-MM-dd format.
 * @return {boolean} True if the date is a holiday, false otherwise.
 */
function isHoliday_(dateText) {
  try {
    return HolidayService.isHoliday(dateText);
  } catch (e) {
    logTS('isHoliday_: error delegating to HolidayService: ' + e);
    return true; // Assume holiday on error to be safe
  }
}

/**
 * Safely parses a cell value into a date string.
 * @param {*} cell - The cell value to parse.
 * @return {string|null} Date string in yyyy-MM-dd format or null if invalid.
 */
function safeParseDate_(cell) {
  try {
    if (cell instanceof Date && !isNaN(cell)) {
      return DateUtils.formatYMD(cell);
    }
    const s = String(cell);
    const m = s.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) {
      const testDate = DateUtils.parseDate(m[1]);
      if (testDate) {
        return m[1];
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Splits an array into chunks of specified size.
 * @param {Array} arr - Array to chunk.
 * @param {number} size - Chunk size.
 * @return {Array[]} Array of chunks.
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Logs a timestamped message to the Logger.
 * @param {string} label - The message to log.
 */
function logTS(label) {
  Logger.log(`[${new Date().toISOString()}] ${label}`);
}

/**
 * Formats a Date object as yyyy-MM-dd.
 * @param {Date} date - The date to format.
 * @return {string} Formatted date string.
 */
function formatYMD_(date) {
  return DateUtils.formatYMD(date);
}

/**
 * Safely puts a value into cache with error handling.
 * @param {string} key - Cache key.
 * @param {string} value - Value to cache.
 * @param {number} ttl - Time to live in seconds.
 */
function safeCachePut(key, value, ttl) {
  try {
    CACHE.put(key, value, ttl);
  } catch (e) {
    logTS('safeCachePut error: ' + e);
  }
}

/**
 * Safely gets a value from cache with error handling and logging.
 * @param {string} key - Cache key.
 * @return {string|null} Cached value or null if not found/error.
 */
function safeCacheGet(key) {
  try {
    const value = CACHE.get(key);
    if (value) {
      logTS('cache hit: ' + key);
      return value;
    } else {
      logTS('cache miss: ' + key);
        return null;
    }
  } catch (e) {
    logTS('safeCacheGet error: ' + e);
    return null;
  }
}

/**
 * Safely removes a value from cache with error handling.
 * @param {string} key - Cache key to remove.
 */
function safeCacheRemove(key) {
  try {
    CACHE.remove(key);
    logTS('cache removed: ' + key);
  } catch (e) {
    logTS('safeCacheRemove error: ' + e);
  }
}

/**
 * Reads the "Slots Left" value directly from the availability sheet for a given date.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @param {string} dateStr - Date string in yyyy-MM-dd format.
 * @return {number} Number of slots left, or 0 if not found/error.
 */
function getLeftFromSheet(registryEntry, dateStr) {
  try {
    const sheet = getSpreadsheet_(registryEntry).getSheetByName(registryEntry.availabilitySheetName);
    if (!sheet) {
      logTS('getLeftFromSheet: Sheet not found: ' + registryEntry.availabilitySheetName);
      return 0;
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Search for the date in the sheet rows
    for (let i = 1; i < values.length; i++) {
      const cellDate = safeParseDate_(values[i][0]);
      if (cellDate === dateStr) {
        const slotsLeft = typeof values[i][AVAIL_LEFT_COL - 1] === 'number' ? values[i][AVAIL_LEFT_COL - 1] : 0;
        return slotsLeft;
      }
    }
    
    // Date not found in sheet
    return 0;
  } catch (err) {
    logTS('getLeftFromSheet: Error reading sheet: ' + err);
    sendThrottledError('getLeftFromSheet', err);
    return 0;
  }
}

/**
 * Decrements slots across all availability categories for a given date.
 * @param {Date} dateObj - The appointment date object.
 * @return {number[]} Array of newLeft values from each sheet, or empty array if failed.
 */
function decrementSlotAllCategories_(dateObj) {
  logTS('decrementSlotAllCategories_:start for ' + DateUtils.formatYMD(dateObj));
  
  const dateString = DateUtils.formatYMD(dateObj);
  
  // Holiday guard: early exit on holidays
  if (HolidayService.isHoliday(dateString)) {
    logTS('decrementSlotAllCategories_: booking on holiday rejected: ' + dateString);
    return [];
  }
  
  // 1. Acquire script lock
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    logTS('decrementSlotAllCategories_: Lock busy, skipping for ' + dateString);
    return [];
  }
  
  try {
    const allLeftValues = [];
    
    // 2. Group registry entries by spreadsheetId
    const spreadsheetGroups = {};
    FORM_REGISTRY.forEach(entry => {
      if (!spreadsheetGroups[entry.spreadsheetId]) {
        spreadsheetGroups[entry.spreadsheetId] = [];
      }
      spreadsheetGroups[entry.spreadsheetId].push(entry);
    });
    
    // 3. Process each spreadsheet group
    Object.keys(spreadsheetGroups).forEach(spreadsheetId => {
      try {
        const entries = spreadsheetGroups[spreadsheetId];
        logTS('decrementSlotAllCategories_: Processing spreadsheet ' + spreadsheetId + ' with ' + entries.length + ' sheets');
        
        // Open the spreadsheet
        let spreadsheet;
        try {
          spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        } catch (err) {
          logTS('decrementSlotAllCategories_: Error opening spreadsheet ' + spreadsheetId + ': ' + err);
          sendThrottledError('decrementSlotAllCategories_-openSpreadsheet', err);
          return;
        }
        
        // 4. Loop through each availability sheet in this spreadsheet
        entries.forEach(entry => {
          try {
            const sheetName = entry.availabilitySheetName;
            const sheet = spreadsheet.getSheetByName(sheetName);
            if (!sheet) {
              logTS('decrementSlotAllCategories_: Sheet not found: ' + sheetName);
              allLeftValues.push(0); // Add 0 for missing sheet
              return;
            }
            
            // Read sheet data and find the matching date row
            const dataRange = sheet.getDataRange();
            const values = dataRange.getValues();
            
            let targetRow = -1;
            let currentBooked = 0;
            let currentLeft = SLOT_CAP;
            
            // Search for existing row with this date
            for (let i = 1; i < values.length; i++) {
              const cellDate = safeParseDate_(values[i][0]);
              if (cellDate === dateString) {
                targetRow = i + 1; // +1 because sheet rows are 1-indexed
                currentBooked = typeof values[i][AVAIL_BOOKED_COL - 1] === 'number' ? values[i][AVAIL_BOOKED_COL - 1] : 0;
                currentLeft = typeof values[i][AVAIL_LEFT_COL - 1] === 'number' ? values[i][AVAIL_LEFT_COL - 1] : SLOT_CAP;
                break;
              }
            }
            
            // If no existing row found, create new row
            if (targetRow === -1) {
              try {
                // Ensure headers exist
                if (values.length === 0) {
                  sheet.getRange(1, 1, 1, 3).setValues([['Date', 'Booked', 'Slots Left']]);
                }
                targetRow = sheet.getLastRow() + 1;
                sheet.getRange(targetRow, 1, 1, 3).setValues([[dateString, 0, SLOT_CAP]]);
                currentBooked = 0;
                currentLeft = SLOT_CAP;
              } catch (err) {
                logTS('decrementSlotAllCategories_: Error creating row in ' + sheetName + ': ' + err);
                sendThrottledError('decrementSlotAllCategories_-createRow-' + sheetName, err);
                allLeftValues.push(0);
                return;
              }
            }
            
            // 5. Guard against overbooking (left >= 0)
            if (currentLeft <= 0) {
              logTS('decrementSlotAllCategories_: overbook attempt for ' + dateString + ' in ' + sheetName);
              allLeftValues.push(0);
              return;
            }
            
            // 6. Decrement and write back
            const newBooked = currentBooked + 1;
            const newLeft = Math.max(0, currentLeft - 1);
            
            try {
              sheet.getRange(targetRow, AVAIL_BOOKED_COL).setValue(newBooked);
              sheet.getRange(targetRow, AVAIL_LEFT_COL).setValue(newLeft);
              
              logTS('decrementSlotAllCategories_: Successfully updated ' + sheetName + ' for ' + dateString + ': ' + currentLeft + '→' + newLeft);
              allLeftValues.push(newLeft);
            } catch (err) {
              logTS('decrementSlotAllCategories_: Error writing to ' + sheetName + ': ' + err);
              sendThrottledError('decrementSlotAllCategories_-writeSheet-' + sheetName, err);
              allLeftValues.push(0);
            }
            
          } catch (err) {
            logTS('decrementSlotAllCategories_: Error processing sheet ' + entry.availabilitySheetName + ': ' + err);
            sendThrottledError('decrementSlotAllCategories_-processSheet-' + entry.availabilitySheetName, err);
            allLeftValues.push(0);
          }
        });
        
      } catch (err) {
        logTS('decrementSlotAllCategories_: Error processing spreadsheet group ' + spreadsheetId + ': ' + err);
        sendThrottledError('decrementSlotAllCategories_-processGroup-' + spreadsheetId, err);
      }
    });
    
    logTS('decrementSlotAllCategories_:end for ' + dateString + ' with results: ' + JSON.stringify(allLeftValues));
    return allLeftValues;
    
  } catch (err) {
    logTS('Error in decrementSlotAllCategories_: ' + err);
    sendThrottledError('decrementSlotAllCategories_', err);
    return [];
  } finally {
    lock.releaseLock();
  }
}

/**
 * Retrieves holiday dates between two dates (inclusive) and caches them.
 * @param {Date} startDate - Start date.
 * @param {Date} endDate - End date.
 * @return {Set<string>} Set of holiday date strings in yyyy-MM-dd format.
 */
function getHolidayDates(startDate, endDate) {
  return HolidayService.fetchRange(startDate, endDate);
}

/**
 * Removes summary events and appointment events that fall on holiday dates within the specified range.
 * @param {Date} startDate - Start date for the range.
 * @param {Date} endDate - End date for the range.
 */
function removeHolidaySummaries(startDate, endDate) {
  logTS('removeHolidaySummaries:start');
  const holidaySet = getHolidayDates(startDate, endDate);
  const summariesToDelete = [];
  const appointmentsToDelete = [];
  
  holidaySet.forEach(dateText => {
    const [y, m, d] = dateText.split('-').map(Number);
    const dayDate = new Date(y, m - 1, d);
    const dayEvents = CAL.getEventsForDay(dayDate);
    
    // Collect summary events on holidays
    const summaries = dayEvents.filter(ev => ev.getDescription().indexOf(FULL_SUMMARY_TAG) === 0);
    summariesToDelete.push(...summaries);
    
    // Collect appointment events on holidays
    const appointments = dayEvents.filter(ev => ev.getTitle().startsWith(TAG_APPOINTMENT));
    appointmentsToDelete.push(...appointments);
  });
  
  // Delete summary events in chunks
  chunkArray(summariesToDelete, CHUNK_SIZE).forEach(chunk => {
    try { 
      chunk.forEach(ev => ev.deleteEvent()); 
      logTS(`Deleted ${chunk.length} holiday summary events`);
    }
    catch(e){ 
      logTS('Chunk delete error in removeHolidaySummaries (summaries): '+e); 
    }
  });
  
  // Delete appointment events in chunks
  chunkArray(appointmentsToDelete, CHUNK_SIZE).forEach(chunk => {
    try { 
      chunk.forEach(ev => ev.deleteEvent()); 
      logTS(`Deleted ${chunk.length} holiday appointment events`);
    }
    catch(e){ 
      logTS('Chunk delete error in removeHolidaySummaries (appointments): '+e); 
    }
  });
  
  logTS('removeHolidaySummaries:end');
}

/**
 * Sends throttled error emails to avoid spam.
 * @param {string} functionName - Name of the function that errored.
 * @param {*} err - The error object or message.
 */
function sendThrottledError(functionName, err) {
  try {
    if (IS_DEV) {
      FormApp.getUi().alert(String(err));
    } else {
      const lastEmail = parseInt(propsEmail.getProperty('LAST_ERROR_EMAIL_TS')||'0',10);
      const now = Date.now();
      if(now - lastEmail >= EMAIL_THROTTLE_MS) {
        propsEmail.setProperty('LAST_ERROR_EMAIL_TS',String(now));
        const subject = `Error @ ${new Date().toISOString()} - ${functionName}`;
        MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject, String(err));
      }
    }
  } catch (e) {
    logTS('sendThrottledError failed: ' + e);
  }
}

/**
 * Rebuilds slot counters by tallying form responses and updating all availability sheets.
 * @return {Object} Map of sheetName to {date: {booked, left}} with logs and error handling.
 */
function rebuildSlotCounters() {
  logTS('rebuildSlotCounters:start');
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    logTS('rebuildSlotCounters: Lock busy, skipping');
    return {};
  }
  
  try {
    const results = {};
    
    // 1. Iterate each registry entry
    FORM_REGISTRY.forEach(entry => {
      try {
        logTS('rebuildSlotCounters: Processing ' + entry.sheetName);
        
        // 2. Tally submissions per date from Form Responses sheet
        const dates = getResponseDates(entry);
        const counts = tallyByDate(dates);
        
        // 3. Update availability sheet with tallied counts
        const sheet = getOrCreateSheet_(entry);
        
        // Clear existing data and write headers
        sheet.clearContents();
        sheet.getRange(1, 1, 1, 3).setValues([['Date', 'Booked', 'Slots Left']]);
        
        // Build rows for each date with counts
        const rows = [];
        const sheetResults = {};
        
        Object.keys(counts).forEach(dateStr => {
          const booked = counts[dateStr] || 0;
          const left = SLOT_CAP - booked;
          rows.push([dateStr, booked, left]);
          sheetResults[dateStr] = { booked, left };
        });
        
        // Write all rows at once if we have data
        if (rows.length > 0) {
          sheet.getRange(2, 1, rows.length, 3).setValues(rows);
        }
        
        results[entry.availabilitySheetName] = sheetResults;
        logTS('rebuildSlotCounters: Completed ' + entry.sheetName + ' with ' + rows.length + ' dates');
        
      } catch (err) {
        logTS('rebuildSlotCounters: Error processing ' + entry.sheetName + ': ' + err);
        sendThrottledError('rebuildSlotCounters-' + entry.sheetName, err);
        results[entry.availabilitySheetName] = {};
      }
    });
    
    logTS('rebuildSlotCounters:end');
    return results;
    
  } catch (err) {
    logTS('Error in rebuildSlotCounters: ' + err);
    sendThrottledError('rebuildSlotCounters', err);
    return {};
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper function to build a date window from startDate to startDate+futureDays
 * Skips weekends and holidays, returns sorted yyyy-MM-dd strings
 * @param {Date} startDate - Starting date
 * @param {number} futureDays - Number of days to look ahead
 * @return {string[]} Array of date strings in yyyy-MM-dd format
 */
function buildDateWindow(startDate, futureDays) {
  const dateWindow = [];
  const endDate = new Date(startDate.getTime() + futureDays * 86400000);
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateString = DateUtils.formatYMD(currentDate);
    
    // Skip weekends and holidays
    if (!DateUtils.isWeekend(currentDate) && !HolidayService.isHoliday(dateString)) {
      dateWindow.push(dateString);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dateWindow.sort();
}

/**
 * Nightly orchestrator: fully rebuilds each availability sheet from form responses,
 * then aggregates across them for calendar summaries and form dropdown updates
 */
function updateAvailability_everywhere() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    logTS('updateAvailability_everywhere: Lock busy, skipping');
    return;
  }
  
  try {
    logTS('updateAvailability_everywhere: start (nightly orchestrator)');
    
    const today = new Date();
    
    // Purge past calendar events first
    purgePastCalendarEvents();
    
    // Purge future summary events beyond window
    purgeFutureSummaryEvents();
    
    // Purge weekend summary events
    purgeWeekendSummaryEvents();
    
    // Initialize services
    CalendarQuotaManager.initRun();
    AvailabilityService.seedAvailabilityWindow(today, FUTURE_DAYS);
    const start = today;
    const end = DateUtils.addDays(today, FUTURE_DAYS);
    
    // Sync calendar events
    const syncResults = CalendarSyncService.syncDateRange(start, end);
    
    // Log results
    logTS('updateAvailability_everywhere: Calendar sync results:');
    logTS(`Summary events: ${JSON.stringify(syncResults.summaryEvents)}`);
    logTS(`Appointment events: ${JSON.stringify(syncResults.appointmentEvents)}`);
    
    // Update form dropdowns
    const dateWindow = buildDateWindow(today, FUTURE_DAYS);
    const labels = dateWindow.map(dateStr => {
      const availability = CalendarSyncService.getAvailabilityForDate(dateStr);
      const minLeft = availability.minLeft;
      
      if (minLeft <= 0) return null; // Skip fully booked dates
      
      const dateObj = DateUtils.parseDate(dateStr);
      if (!dateObj) return null;
      
      const weekday = Utilities.formatDate(dateObj, TZ, 'EEE');
      return `${dateStr} ${weekday} (${minLeft} slot${minLeft === 1 ? '' : 's'} left)`;
    }).filter(label => label !== null);
    
    // Update all forms
    for (const entry of FORM_REGISTRY) {
      try {
        const form = FormApp.openById(entry.formId);
        batchUpdateForm(labels, form);
      } catch (e) {
        ErrorService.logError('updateAvailability_everywhere', e, { formId: entry.formId });
      }
    }
    
    logTS('updateAvailability_everywhere: end (nightly orchestrator)');
    
  } catch (e) {
    ErrorService.logError('updateAvailability_everywhere', e);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Synchronizes a single form: reads responses, updates form, calendar, and sheet.
 * @param {Object} entry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 */
function syncOneForm(entry) {
  try {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
      logTS('Lock busy, skipping syncOneForm for ' + entry.formId);
      return;
    }
    try {
      // Throttle full sync to once per minute per script
      const propsSync = PropertiesService.getScriptProperties();
      const nowSync = Date.now();
      const lastSync = parseInt(propsSync.getProperty('LAST_FULL_SYNC_TS') || '0', 10);
      if (nowSync - lastSync < THROTTLE_INTERVAL_MS) {
        logTS('Skipping syncOneForm due to throttle for ' + entry.formId);
        return;
      }
      propsSync.setProperty('LAST_FULL_SYNC_TS', String(nowSync));

      logTS('syncOneForm:start for ' + entry.formId);
      const form = FormApp.openById(entry.formId);
      const dates = getResponseDates(entry);
      let counts = safeCacheGet(CACHE_KEY + '_' + entry.formId);
      if (counts) {
        counts = JSON.parse(counts);
      } else {
        counts = tallyByDate(dates);
        safeCachePut(CACHE_KEY + '_' + entry.formId, JSON.stringify(counts), 300);
      }
      const { availDates, choices } = buildBusinessDays(counts);
      
      // Filter out any holidays that might have slipped through
      const nonHolidayDates = availDates.filter(dateStr => {
        if (HolidayService.isHoliday(dateStr)) {
          logTS('syncOneForm: filtering out holiday ' + dateStr);
          return false;
        }
        return true;
      });
      
      batchUpdateForm(choices, form);
      batchSyncCalendarSummaries(nonHolidayDates, counts);
      batchWriteAvailabilitySheet(entry, nonHolidayDates, counts);
      safeCacheRemove(CACHE_KEY + '_' + entry.formId); // Invalidate cache after full sync
      cachedCounts = null;
      logTS('syncOneForm:end for ' + entry.formId);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    Logger.log('Error in syncOneForm for ' + entry.formId + ': ' + err);
    sendThrottledError('syncOneForm', err);
    throw err;
  }
}

/**
 * Simplified form submit handler using AvailabilityService with guarded decrements
 * @param {Object} e - Spreadsheet onFormSubmit event object.
 */
function onFormSubmit(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    logTS('onFormSubmit: Lock busy, skipping');
    return;
  }
  
  try {
    logTS('onFormSubmit: start');
    
    // Initialize calendar quota manager
    CalendarQuotaManager.initRun();
    
    // Identify sheet and row
    if (!e || !e.range || !e.range.getSheet) {
      logTS('onFormSubmit: invalid event object');
      return;
    }
    
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const rowValues = sheet.getRange(row, 2, 1, 5).getValues();
    if (!rowValues || !rowValues[0]) {
      logTS('onFormSubmit: unable to read row values');
      return;
    }
    
    const [lastName, firstName, purok, barangay, dateChoice] = rowValues[0];
    if (typeof dateChoice !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(dateChoice)) {
      logTS('onFormSubmit: invalid dateChoice format: ' + dateChoice);
      return;
    }
    
    const dateString = dateChoice.split(' ')[0];
    const dateObj = new Date(dateString);
    if (isNaN(dateObj)) {
      logTS('onFormSubmit: Invalid dateChoice parsed ' + dateChoice);
      return;
    }
    
    // Lookup registry entry by spreadsheet ID
    const registryEntry = FORM_REGISTRY.find(r => r.spreadsheetId === sheet.getParent().getId());
    if (!registryEntry) {
      logTS('onFormSubmit: registry lookup failed for spreadsheet: ' + sheet.getParent().getId());
      return;
    }
    
    // Use AvailabilityService for guarded decrement across all categories
    let allLefts;
    try {
      allLefts = AvailabilityService.decrementSlotAllCategories(dateObj);
    } catch (err) {
      logTS('onFormSubmit: Error in AvailabilityService.decrementSlotAllCategories: ' + err);
      sendThrottledError('onFormSubmit-decrementSlotAllCategories', err);
      return; // Abort submission on error
    }
    
    if (!allLefts || allLefts.length === 0) {
      logTS('onFormSubmit: no availability data from AvailabilityService.decrementSlotAllCategories');
      return;
    }
    
    const minLeft = Math.min(...allLefts);
    if (minLeft < 0) {
      logTS('onFormSubmit: negative availability detected for ' + dateString);
      return;
    }
    
    // Upsert summary event with minimum availability
    try {
      upsertDailySummaryEvent(dateObj, undefined, minLeft, registryEntry);
    } catch (err) {
      logTS('onFormSubmit: Error in upsertDailySummaryEvent: ' + err);
      sendThrottledError('onFormSubmit-upsertDailySummaryEvent', err);
    }
    
    // Create appointment event using sync approach
    try {
      syncAppointmentsForDate(dateObj, [{ lastName, firstName, purok, barangay, sheetName: registryEntry.sheetName }], CAL);
    } catch (err) {
      logTS('onFormSubmit: Error in syncAppointmentsForDate: ' + err);
      sendThrottledError('onFormSubmit-syncAppointmentsForDate', err);
    }
    
    // Update form dropdown for that date using minimum availability
    try {
      updateFormDropdownForDate_(registryEntry, dateObj, minLeft);
    } catch (err) {
      logTS('onFormSubmit: Error in updateFormDropdownForDate_: ' + err);
      sendThrottledError('onFormSubmit-updateFormDropdownForDate_', err);
    }
    
    // Purge old responses for this form
    try {
      purgeOldResponses(registryEntry);
    } catch (err) {
      logTS('onFormSubmit: Error in purgeOldResponses: ' + err);
      sendThrottledError('onFormSubmit-purgeOldResponses', err);
    }
    
    // Increment submit counter and schedule fallback if needed
    try {
      const props = PropertiesService.getScriptProperties();
      let count = parseInt(props.getProperty(SUBMIT_COUNT_KEY) || '0', 10) + 1;
      props.setProperty(SUBMIT_COUNT_KEY, String(count));
      if (count >= 10) {
        ScriptApp.newTrigger('updateAvailability_everywhere')
          .timeBased()
          .after(1000)
          .create();
        logTS('onFormSubmit: Scheduled fallback sync after 10 submissions');
        props.setProperty(SUBMIT_COUNT_KEY, '0');
      }
    } catch (err) {
      logTS('onFormSubmit: Error incrementing submit counter: ' + err);
      sendThrottledError('onFormSubmit-counter', err);
    }
    
    logTS('onFormSubmit: end');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Returns timezone offset string for the script's timezone.
 * @return {string} Timezone offset in ±HH:mm format.
 */
function getTZOffsetString_() {
  try {
    const now = new Date();
    const end = new Date(now.getTime() + MAX_ADVANCE_DAYS * 86400000);
    const utcTime = new Date(now.toISOString());
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
    const offsetMs = localTime.getTime() - utcTime.getTime();
    const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
    const offsetMinutes = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));
    const sign = offsetMs >= 0 ? '+' : '-';
    const result = sign + String(offsetHours).padStart(2, '0') + ':' + String(offsetMinutes).padStart(2, '0');
    
    // Upsert holiday events after returning the offset
    try {
      HolidayService.upsertHolidayEvents(now, end);
    } catch (holidayErr) {
      logTS('getTZOffsetString_: Error upserting holiday events: ' + holidayErr);
    }
    
    return result;
  } catch (err) {
    logTS('Error in getTZOffsetString_: ' + err);
    return '+08:00'; // Default to Philippine timezone
  }
}

/**
 * Decrements availability for a single category/sheet only.
 * @param {Object} registry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @param {Date} dateObj - The appointment date object.
 * @return {Object|null} {newBooked, newLeft} or null if failed/unavailable.
 */
function decrementSingleCategory_(registry, dateObj) {
  logTS('decrementSingleCategory_:start for ' + DateUtils.formatYMD(dateObj));
  
  const dateString = DateUtils.formatYMD(dateObj);
  
  // Holiday guard: early exit on holidays
  if (HolidayService.isHoliday(dateString)) {
    logTS('decrementSingleCategory_: booking on holiday rejected: ' + dateString);
    return null;
  }
  
  // 1. Acquire script lock
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    logTS('decrementSingleCategory_: Lock busy, skipping for ' + dateString);
    return null;
  }
  
  try {
    // 2. Fetch the sheet via getSpreadsheet_
    let sheet;
    try {
      sheet = getSpreadsheet_(registry).getSheetByName(registry.availabilitySheetName);
      if (!sheet) {
        throw new Error('Availability sheet not found: ' + registry.availabilitySheetName);
      }
    } catch (err) {
      sendThrottledError('decrementSingleCategory_-getSheet', err);
      throw err;
    }
    
    // 3. Read sheet data and search for dateString in column A
    let dataRange, values;
    try {
      dataRange = sheet.getDataRange();
      values = dataRange.getValues();
    } catch (err) {
      sendThrottledError('decrementSingleCategory_-getValues', err);
      throw err;
    }
    
    let targetRow = -1;
    let currentBooked = 0;
    let currentLeft = SLOT_CAP;
    
    // Search for existing row with this date
    for (let i = 1; i < values.length; i++) { // Start from row 1 (skip header)
      const cellDate = safeParseDate_(values[i][0]);
      if (cellDate === dateString) {
        targetRow = i + 1; // +1 because sheet rows are 1-indexed
        currentBooked = typeof values[i][AVAIL_BOOKED_COL - 1] === 'number' ? values[i][AVAIL_BOOKED_COL - 1] : 0;
        currentLeft = typeof values[i][AVAIL_LEFT_COL - 1] === 'number' ? values[i][AVAIL_LEFT_COL - 1] : SLOT_CAP;
        break;
      }
    }
    
    // If no existing row found, append new row
    if (targetRow === -1) {
      try {
        // Ensure headers exist
        if (values.length === 0) {
          sheet.getRange(1, 1, 1, 3).setValues([['Date', 'Booked', 'Slots Left']]);
        }
        targetRow = sheet.getLastRow() + 1;
        sheet.getRange(targetRow, 1, 1, 3).setValues([[dateString, 0, SLOT_CAP]]);
        currentBooked = 0;
        currentLeft = SLOT_CAP;
      } catch (err) {
        sendThrottledError('decrementSingleCategory_-createRow', err);
        throw err;
      }
    }
    
    // 4. Fetch currentBooked and currentLeft via column indices
    try {
      currentBooked = sheet.getRange(targetRow, AVAIL_BOOKED_COL).getValue();
      currentLeft = sheet.getRange(targetRow, AVAIL_LEFT_COL).getValue();
      currentBooked = typeof currentBooked === 'number' ? currentBooked : 0;
      currentLeft = typeof currentLeft === 'number' ? currentLeft : SLOT_CAP;
    } catch (err) {
      sendThrottledError('decrementSingleCategory_-getCurrentValues', err);
      throw err;
    }
    
    // 5. Check for overbooking
    if (currentLeft <= 0) {
      logTS('decrementSingleCategory_: overbook attempt for ' + dateString);
      return null;
    }
    
    // 6. Increment booked, recalc left, write back to sheet
    const newBooked = currentBooked + 1;
    const newLeft = Math.max(0, currentLeft - 1);
    
    logTS(`decrementSingleCategory_: Booking ${dateString}: ${currentBooked}→${newBooked}, ${currentLeft}→${newLeft}`);
    
    try {
      sheet.getRange(targetRow, AVAIL_BOOKED_COL).setValue(newBooked);
      sheet.getRange(targetRow, AVAIL_LEFT_COL).setValue(newLeft);
    } catch (err) {
      sendThrottledError('decrementSingleCategory_-updateSheet', err);
      throw err;
    }
    
    logTS('decrementSingleCategory_:end for ' + dateString);
    return { newBooked, newLeft };
  } catch (err) {
    logTS('Error in decrementSingleCategory_: ' + err);
    sendThrottledError('decrementSingleCategory_', err);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Detects the column index for a given header name in a sheet.
 * @param {Sheet} sheet - The sheet to search in.
 * @param {string} headerName - The header name to find.
 * @return {number} 1-based column index, or -1 if not found.
 */
function detectColumnIndex_(sheet, headerName) {
  try {
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) return -1;
    
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const index = headers.indexOf(headerName);
    return index === -1 ? -1 : index + 1; // Convert to 1-based index
  } catch (err) {
    logTS('detectColumnIndex_ error: ' + err);
    return -1;
  }
}

/**
 * Lightweight helper that reads the updated row from the availability sheet for a single date
 * and invokes upsertDailySummaryEvent with the correct counts.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @param {Date} dateObj - The appointment date object.
 */
function miniSyncCalendarSummaryForDate_(registryEntry, dateObj) {
  try {
    logTS('miniSyncCalendarSummaryForDate_:start for ' + DateUtils.formatYMD(dateObj));
    
    const dateString = DateUtils.formatYMD(dateObj);
    
    // Holiday guard: early exit on holidays
    if (HolidayService.isHoliday(dateString)) {
      logTS('miniSyncCalendarSummaryForDate_: skipping holiday ' + dateString);
      return;
    }
    
    // 1. Open the sheet
    const sheet = getSpreadsheet_(registryEntry).getSheetByName(registryEntry.availabilitySheetName);
    if (!sheet) {
      logTS('miniSyncCalendarSummaryForDate_: Sheet not found: ' + registryEntry.availabilitySheetName);
      return;
    }
    
    // 2. Detect the "Date" column index
    const dateColIndex = detectColumnIndex_(sheet, 'Date');
    if (dateColIndex === -1) {
      logTS('miniSyncCalendarSummaryForDate_: Date column not found');
      return;
    }
    
    // 3. Read the data range and find the matching row
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let booked = 0;
    let left = SLOT_CAP;
    let found = false;
    
    for (let i = 1; i < values.length; i++) { // Start from row 1 (skip header)
      const cellDate = safeParseDate_(values[i][dateColIndex - 1]); // Convert to 0-based index
      if (cellDate === dateString) {
        // 4. Extract booked and slots-left values
        booked = typeof values[i][AVAIL_BOOKED_COL - 1] === 'number' ? values[i][AVAIL_BOOKED_COL - 1] : 0;
        left = typeof values[i][AVAIL_LEFT_COL - 1] === 'number' ? values[i][AVAIL_LEFT_COL - 1] : SLOT_CAP;
        found = true;
        break;
      }
    }
    
    if (!found) {
      logTS('miniSyncCalendarSummaryForDate_: Date not found in availability sheet: ' + dateString);
      return;
    }
    
    // 5. Call upsertDailySummaryEvent with the correct counts
    upsertDailySummaryEvent(dateObj, booked, left, registryEntry);
    
    logTS('miniSyncCalendarSummaryForDate_:end for ' + dateString);
  } catch (err) {
    logTS('miniSyncCalendarSummaryForDate_: Error: ' + err);
    sendThrottledError('miniSyncCalendarSummaryForDate_', err);
  }
}

/**
 * Ensures a daily summary event exists or is updated for a given appointment date.
 * Creates or updates a calendar event with correct title and color.
 * @param {Date} appointmentDate - Date object for the appointment.
 * @param {number} bookedCount - Number of bookings made for the date.
 * @param {number} leftCount - Number of slots left for the date.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 */
function upsertDailySummaryEvent(appointmentDate, bookedCount, leftCount, registryEntry) {
  const dateString = Utilities.formatDate(appointmentDate, TZ, 'yyyy-MM-dd');

  // Guard against invalid dates using new helper
  if (!DateUtils.isValidBusinessDate(appointmentDate)) {
    logTS('BizDateGuard: upsertDailySummaryEvent early exit on invalid date ' + dateString);
    return;
  }

  // Input validation
  if (!(appointmentDate instanceof Date) || isNaN(appointmentDate)) {
    logTS('upsertDailySummaryEvent: invalid appointmentDate: ' + appointmentDate);
    return;
  }
  if (typeof bookedCount !== 'number' || typeof leftCount !== 'number') {
    logTS('upsertDailySummaryEvent: invalid counts: ' + bookedCount + ', ' + leftCount);
    return;
  }
  if (!registryEntry || typeof registryEntry !== 'object') {
    logTS('upsertDailySummaryEvent: invalid registryEntry');
    return;
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    logTS('upsertDailySummaryEvent: Lock busy, skipping for ' + dateString);
    return;
  }

  try {
    const cal = registryEntry.calendarId
      ? CalendarApp.getCalendarById(registryEntry.calendarId)
      : CalendarApp.getDefaultCalendar();

    const events = cal.getEventsForDay(appointmentDate, { search: FULL_SUMMARY_TAG });

    // Delete duplicates if any
    if (events.length > 1) {
      for (let i = 1; i < events.length; i++) {
        CalendarQuotaManager.safeDeleteEvent(events[i]);
      }
    }

    const title = `${leftCount} slots left (${SLOT_CAP} total) ${FULL_SUMMARY_TAG}`;
    const color = leftCount > 0 ? EVENT_COLOR_AVAILABLE : EVENT_COLOR_FULL;

    if (events.length >= 1) {
      try {
        const ev = events[0];
        
        // Check if title is already correct to avoid unnecessary API call
        const currentTitle = ev.getTitle();
        if (currentTitle === title) {
          logTS(`upsertDailySummaryEvent: Title unchanged for ${dateString}, skipping update`);
          return;
        }
        
        const titleUpdated = CalendarQuotaManager.safeUpdateTitle(ev, title);
        if (titleUpdated) {
          try {
            ev.setColor(color);
          } catch (e) {
            logTS('upsertDailySummaryEvent: error setting color: ' + e);
          }
          logTS(`upsertDailySummaryEvent: Updated event for ${dateString}`);
        }
      } catch (e) {
        logTS('upsertDailySummaryEvent: error updating event: ' + e);
        sendThrottledError('upsertDailySummaryEvent-updateEvent', e);
      }
    } else {
      const ev = CalendarQuotaManager.safeCreateEvent(title, appointmentDate, { description: FULL_SUMMARY_TAG });
      if (ev) {
        try {
          ev.setColor(color);
        } catch (e) {
          logTS('upsertDailySummaryEvent: error setting color on new event: ' + e);
        }
        logTS(`upsertDailySummaryEvent: Created event for ${dateString}`);
      }
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Purges old responses from the form response sheet based on retention policy.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 */
function purgeOldResponses(registryEntry) {
  logTS('purgeOldResponses:start for ' + registryEntry.sheetName);
  
  try {
    // 1. Open the response sheet
    let sheet;
    try {
      sheet = getSpreadsheet_(registryEntry).getSheetByName(registryEntry.sheetName);
      if (!sheet) {
        logTS('purgeOldResponses: sheet not found: ' + registryEntry.sheetName);
        return;
      }
    } catch (err) {
      sendThrottledError('purgeOldResponses-getSheet', err);
      return;
    }
    
    let lastRow;
    try {
      lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        logTS('purgeOldResponses: no data rows to process');
        return;
      }
    } catch (err) {
      sendThrottledError('purgeOldResponses-getLastRow', err);
      return;
    }
    
    // 2. Read timestamps using RESP_DATE_COL constant (now numeric)
    let timestampColumn;
    try {
      // Guard against invalid column index
      const maxColumns = sheet.getMaxColumns();
      if (RESP_DATE_COL > maxColumns) {
        logTS(`purgeOldResponses: RESP_DATE_COL (${RESP_DATE_COL}) exceeds max columns (${maxColumns})`);
        return;
      }
      timestampColumn = sheet.getRange(2, RESP_DATE_COL, lastRow - 1, 1).getValues();
    } catch (err) {
      sendThrottledError('purgeOldResponses-getRange', err);
      return;
    }
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RESPONSE_RETENTION_DAYS);
    
    // 3. Delete rows older than RESPONSE_RETENTION_DAYS
    const rowsToDelete = [];
    
    for (let i = 0; i < timestampColumn.length; i++) {
      const cellValue = timestampColumn[i][0];
      let rowDate = null;
      
      if (cellValue instanceof Date) {
        rowDate = cellValue;
      } else if (typeof cellValue === 'string') {
        rowDate = new Date(cellValue);
      }
      
      if (rowDate && !isNaN(rowDate) && rowDate < cutoffDate) {
        rowsToDelete.push(i + 2); // +2 because we started from row 2 and i is 0-based
      }
    }
    
    // Delete rows in reverse order to maintain row indices
    rowsToDelete.reverse().forEach(rowIndex => {
      try {
        sheet.deleteRow(rowIndex);
        logTS('purgeOldResponses: deleted row ' + rowIndex);
      } catch (err) {
        logTS('purgeOldResponses: error deleting row ' + rowIndex + ': ' + err);
        sendThrottledError('purgeOldResponses-deleteRow', err);
      }
    });
    
    if (rowsToDelete.length > 0) {
      logTS('purgeOldResponses: deleted ' + rowsToDelete.length + ' old responses');
    } else {
      logTS('purgeOldResponses: no old responses to delete');
    }
    
    logTS('purgeOldResponses:end for ' + registryEntry.sheetName);
  } catch (err) {
    logTS('Error in purgeOldResponses: ' + err);
    sendThrottledError('purgeOldResponses', err);
    throw err;
  }
}

/**
 * Purges old responses for all forms in the registry.
 */
function purgeOldResponsesAll() {
  FORM_REGISTRY.forEach(entry => purgeOldResponses(entry));
}

/**
 * Rebuilds all availability sheets and calendar summary events for all registered forms.
 * Clears existing data and recreates from current form responses.
 */
function rebuildAllAvailabilityAndCalendar() {
  logTS('rebuildAllAvailabilityAndCalendar:start');
  
  try {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
      logTS('Lock busy, skipping rebuildAllAvailabilityAndCalendar');
      return;
    }
    
    try {
      FORM_REGISTRY.forEach(entry => {
        logTS('rebuildAllAvailabilityAndCalendar: processing ' + entry.sheetName);
        
        // 1. Fetch response dates and tally counts
        const dates = getResponseDates(entry);
        const counts = tallyByDate(dates);
        
        // 2. Clear or create availability sheet
        const sheet = getOrCreateSheet_(entry);
        sheet.clearContents();
        
        // 3. Write header row
        sheet.getRange(1, 1, 1, 3).setValues([['Date', 'Booked', 'Slots Left']]);
        
        // 4. Build rows for each date with counts
        const rows = [];
        Object.keys(counts).forEach(dateString => {
          const booked = counts[dateString] || 0;
          const left = SLOT_CAP - booked;
          rows.push([dateString, booked, left]);
        });
        
        // Write all rows at once if we have data
        if (rows.length > 0) {
          sheet.getRange(2, 1, rows.length, 3).setValues(rows);
        }
        
        // 5. Purge existing calendar events for this form
        purgeCalendarEventsForForm(entry);
        
        // 6. Recreate summary events for each date
        Object.keys(counts).forEach(dateString => {
          const booked = counts[dateString] || 0;
          const left = getLeftFromSheet(entry, dateString);
          const [y, m, d] = dateString.split('-').map(Number);
          const appointmentDate = new Date(y, m - 1, d);
          
          // Skip invalid business dates before calling upsertDailySummaryEvent
          if (!DateUtils.isValidBusinessDate(appointmentDate)) {
            logTS('BizDateGuard: rebuildAllAvailabilityAndCalendar skipping invalid date ' + dateString);
            return;
          }
          
          upsertDailySummaryEvent(appointmentDate, booked, left, entry);
        });
        
        logTS('rebuildAllAvailabilityAndCalendar: completed ' + entry.sheetName);
      });
      
      logTS('rebuildAllAvailabilityAndCalendar:end');
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    logTS('Error in rebuildAllAvailabilityAndCalendar: ' + err);
    sendThrottledError('rebuildAllAvailabilityAndCalendar', err);
    throw err;
  }
}

/**
 * Purges all calendar summary events for a specific form within a ±1 year window.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 */
function purgeCalendarEventsForForm(registryEntry) {
  if (!registryEntry || typeof registryEntry.sheetName !== 'string') {
    logTS('purgeCalendarEventsForForm: invalid registryEntry');
    return;
  }
  logTS('purgeCalendarEventsForForm:start for ' + registryEntry.sheetName);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    logTS('purgeCalendarEventsForForm: lock busy, skipping for ' + registryEntry.sheetName);
    return;
  }
  try {
    // Compute ±1 year window
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneYearFuture = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    
    // Fetch all summary events in the window
    const allSummaryEvents = CAL.getEvents(oneYearAgo, oneYearFuture, { search: FULL_SUMMARY_TAG });
    
    // Filter events for this specific form
    const formEvents = allSummaryEvents.filter(ev => {
      const description = ev.getDescription();
      return description.includes(`[form=${registryEntry.sheetName}]`);
    });
    
    logTS(`purgeCalendarEventsForForm: found ${formEvents.length} events for ${registryEntry.sheetName}`);
    
    // Delete events in chunks
    chunkArray(formEvents, CHUNK_SIZE).forEach(chunk => {
      try {
        chunk.forEach(ev => ev.deleteEvent());
        logTS(`purgeCalendarEventsForForm: deleted ${chunk.length} events for ${registryEntry.sheetName}`);
      } catch (e) {
        logTS('purgeCalendarEventsForForm: chunk delete error: ' + e);
      }
    });
    
    logTS('purgeCalendarEventsForForm:end for ' + registryEntry.sheetName);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Integrity Checker: cleans up old events and form options regularly.
 */
function checkCalendarIntegrity() {
  try {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
      logTS('Lock busy, skipping checkCalendarIntegrity');
      return;
    }
    try {
      // Throttle integrity check to once per minute
      const propsInt = PropertiesService.getScriptProperties();
      const nowInt = Date.now();
      const lastInt = parseInt(propsInt.getProperty('LAST_INTEGRITY_TS') || '0', 10);
      if (nowInt - lastInt < THROTTLE_INTERVAL_MS) {
        logTS('Skipping checkCalendarIntegrity due to throttle');
        return;
      }
      propsInt.setProperty('LAST_INTEGRITY_TS', String(nowInt));
      
      logTS('checkCalendarIntegrity:start');
      // Using first form in registry for form dropdown cleanup
      const primaryEntry = FORM_REGISTRY[0];
      const dates = getResponseDates(primaryEntry);
      const respCount = dates.length;
      const props = PropertiesService.getScriptProperties();
      const lastCount = props.getProperty('LAST_RESPONSE_COUNT');
      if (lastCount && parseInt(lastCount, 10) === respCount) {
        logTS('checkCalendarIntegrity:end');
        return;
      }
      props.setProperty('LAST_RESPONSE_COUNT', String(respCount));
      
      // Remove holiday summaries and appointments within advance window before other cleanup
      const now = new Date();
      const holidayEnd = new Date(now.getTime() + MAX_ADVANCE_DAYS * 86400000);
      removeHolidaySummaries(now, holidayEnd);
      // Upsert holiday events back
      try {
        HolidayService.upsertHolidayEvents(now, holidayEnd);
      } catch (err) {
        logTS('checkCalendarIntegrity: error upserting holiday events: ' + err);
        sendThrottledError('checkCalendarIntegrity-upsertHolidayEvents', err);
      }
      // Remove past events using purge functions
      purgePastCalendarEvents();
      
      // Remove future summary events beyond window
      purgeFutureSummaryEvents();
      
      // Purge weekend summary events
      purgeWeekendSummaryEvents();
      
      // Validate summary window
      validateSummaryWindow();
      
      // Delete orphaned upcoming appointments
      const validDates = new Set(dates);
      const rangeEnd = new Date(now);
      rangeEnd.setDate(now.getDate() + 30);
      let upcoming = [];
      try {
        upcoming = CAL.getEvents(now, rangeEnd);
      } catch (calErr) {
        sendThrottledError('checkCalendarIntegrity-getUpcomingEvents', calErr);
      }
      const orphanedEvents = [];
      upcoming.forEach(ev => {
        try {
          const title = ev.getTitle();
          if (!title.startsWith(TAG_APPOINTMENT)) return;
          const evDate = formatYMD_(ev.getStartTime());
          if (!validDates.has(evDate)) {
            orphanedEvents.push(ev);
          }
        } catch (evErr) {
          sendThrottledError('checkCalendarIntegrity-processEvent', evErr);
        }
      });
      chunkArray(orphanedEvents, CHUNK_SIZE).forEach(chunk => {
        try { chunk.forEach(ev => ev.deleteEvent()); }
        catch(e){ 
          logTS('Chunk delete error: '+e); 
          sendThrottledError('checkCalendarIntegrity-deleteOrphanedEvents', e);
        }
      });
      const deletedCount = orphanedEvents.length;
      if (deletedCount > 0) {
        // Instead of full sync, just refresh summaries for affected dates
        const affectedDates = new Set();
        orphanedEvents.forEach(ev => {
          const evDate = formatYMD_(ev.getStartTime());
          affectedDates.add(evDate);
        });
        
        // Refresh summaries for affected dates only (within business days window)
        const currentCounts = cachedCounts || tallyByDate(getResponseDates(primaryEntry));
        const { availDates } = buildBusinessDays(currentCounts);
        const availDatesSet = new Set(availDates);
        
        affectedDates.forEach(dateStr => {
          // Early exit on holidays before any summary creation
          if (HolidayService.isHoliday(dateStr)) {
            logTS('checkCalendarIntegrity: skipping holiday ' + dateStr);
            return;
          }
          // Only update summaries for dates within the business days window
          if (availDatesSet.has(dateStr)) {
            const used = currentCounts[dateStr] || 0;
            const left = getLeftFromSheet(primaryEntry, dateStr);
            if (left > 0) { // Only update if date still has availability
              try {
                const appointmentDate = DateUtils.parseDate(dateStr);
                if (appointmentDate) {
                  upsertDailySummaryEvent(appointmentDate, used, left, primaryEntry);
                }
              } catch (err) {
                sendThrottledError('checkCalendarIntegrity-upsertSummary', err);
              }
            }
          }
        });
      }
      // Prune yesterday from form dropdown
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = formatYMD_(yesterday);
        const form = FormApp.openById(primaryEntry.formId);
        const li = getAppointmentListItem_(form);
        const allVals = li.getChoices().map(c => c.getValue());
        const filtered = allVals.filter(v => !v.startsWith(yStr));
        li.setChoiceValues(filtered);
        cachedListItem = null;
      } catch (formErr) {
        sendThrottledError('checkCalendarIntegrity-pruneFormDropdown', formErr);
      }
      logTS('checkCalendarIntegrity:end');
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    Logger.log('Error in checkCalendarIntegrity: ' + err);
    sendThrottledError('checkCalendarIntegrity', err);
    throw err;
  }
}

/** Private Helpers **/

/**
 * Retrieves the ListItem for "Date of Appointment" from a specific form.
 * @param {Form} form - FormApp Form instance.
 * @return {FormListItem} The list item.
 * @throws If the item is not found.
 */
function getAppointmentListItem_(form) {
  if (cachedListItem && cachedListItem.getParentFormId && cachedListItem.getParentFormId() === form.getId()) {
    return cachedListItem;
  }
  const item = form.getItems(FormApp.ItemType.LIST)
                   .find(i => i.asListItem().getTitle() === 'Date of Appointment');
  if (!item) throw new Error('No LIST item titled "Date of Appointment"');
  const listItem = item.asListItem();
  listItem.getParentFormId = () => form.getId();
  cachedListItem = listItem;
  return listItem;
}

/**
 * Returns a Date set to the end of the given day.
 * @param {Date} date - Base date.
 * @return {Date} Date at 23:59:59.999 of the same day.
 */
function getEndOfDay_(date) {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

/**
 * Reads dates from form response sheet, filters out old entries.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @return {string[]} Array of yyyy-MM-dd date strings.
 */
function getResponseDates(registryEntry) {
  logTS('getResponseDates:start for ' + registryEntry.sheetName);
  
  let sheet;
  try {
    sheet = getSpreadsheet_(registryEntry).getSheetByName(registryEntry.sheetName);
    if (!sheet) {
      logTS('getResponseDates: sheet not found: ' + registryEntry.sheetName);
      return [];
    }
  } catch (err) {
    sendThrottledError('getResponseDates-getSheet', err);
    return [];
  }
  
  let lastRow;
  try {
    lastRow = sheet.getLastRow();
  } catch (err) {
    sendThrottledError('getResponseDates-getLastRow', err);
    return [];
  }
  
  let raw = [];
  if (lastRow > 1) {
    try {
      // Guard against invalid column index
      const maxColumns = sheet.getMaxColumns();
      if (RESP_DATE_COL > maxColumns) {
        logTS(`getResponseDates: RESP_DATE_COL (${RESP_DATE_COL}) exceeds max columns (${maxColumns})`);
        return [];
      }
      raw = sheet.getRange(2, RESP_DATE_COL, lastRow - 1, 1).getValues();
    } catch (err) {
      sendThrottledError('getResponseDates-getRange', err);
      return [];
    }
  }
  
  const dates = raw.map(([cell]) => {
    const parsed = safeParseDate_(cell);
    return parsed;
  }).filter(Boolean);
  
  // Filter by retention policy
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RESPONSE_RETENTION_DAYS);
  const cutoffStr = formatYMD_(cutoff);
  const filtered = dates.filter(d => d >= cutoffStr);
  logTS('getResponseDates:end for ' + registryEntry.sheetName);
  return filtered;
}

/**
 * Tallies count of entries per date.
 * @param {string[]} dates - Array of date strings.
 * @return {Object.<string,number>} Map of date to count.
 */
function tallyByDate(dates) {
  logTS('tallyByDate:start');
  const counts = dates.reduce((m, d) => {
    m[d] = (m[d] || 0) + 1;
    return m;
  }, {});
  safeCachePut(CACHE_KEY, JSON.stringify(counts), 300);
  logTS('tallyByDate:end');
  return counts;
}

/**
 * Builds list of business days and form choice strings.
 * Limited to BUSINESS_DAYS_WINDOW actual business days (Mon-Fri).
 * @param {Object.<string,number>} counts - Map of date to booked count.
 * @return {{availDates:string[],choices:string[]}} Available dates and choice labels.
 */
function buildBusinessDays(counts) {
  logTS('buildBusinessDays:start');
  const items = [];
  const today = new Date();
  let businessDaysFound = 0;
  let dayOffset = 0;
  
  // Count actual business days up to BUSINESS_DAYS_WINDOW
  while (businessDaysFound < BUSINESS_DAYS_WINDOW) {
    const d = new Date(today);
    d.setDate(today.getDate() + dayOffset);
    const wd = d.getDay();
    
    // Skip weekends
    if (!DateUtils.isWeekend(d)) {
      const key = DateUtils.formatYMD(d);
      // Skip holidays - prevent holiday dates from ever appearing in items
      if (HolidayService.isHoliday(key)) {
        logTS('buildBusinessDays: skipping holiday ' + key);
        dayOffset++;
        continue;
      }
      const used = counts[key] || 0;
      const left = SLOT_CAP - used;
      const weekday = Utilities.formatDate(d, TZ, 'EEE');
      
      // Only include dates with available slots
      if (left > 0) {
        const label = `${key} ${weekday} (${left} slot${left === 1 ? '' : 's'} left)`;
        items.push({ date: key, label: label, left: left });
      }
      
      businessDaysFound++;
    }
    
    dayOffset++;
    
    // Safety break to prevent infinite loop
    if (dayOffset > 100) break;
  }
  
  items.sort((a, b) => new Date(a.date) - new Date(b.date));
  const availDates = items.map(item => item.date);
  const choices = items.map(item => item.label);
  
  logTS('buildBusinessDays:end');
  return { availDates, choices };
}

/**
 * Updates the form's date choice list.
 * @param {string[]} choices - Array of choice values.
 * @param {Form} form - FormApp Form instance.
 */
function batchUpdateForm(choices, form) {
  logTS('batchUpdateForm:start for ' + form.getId());
  const li = getAppointmentListItem_(form);
  li.setChoiceValues(choices);
  logTS('batchUpdateForm:end for ' + form.getId());
}

/**
 * Syncs per-day summary calendar events.
 * @param {string[]} availDates - Dates to summarize.
 * @param {Object.<string,number>} counts - Map of date to booked count.
 */
function batchSyncCalendarSummaries(availDates, counts) {
  logTS('batchSyncCalendarSummaries:start');
  if (!availDates.length) {
    logTS('batchSyncCalendarSummaries:end');
    return;
  }
  
  // Use ONLY upsert helper for each date to ensure exactly one summary per date
  availDates.forEach(dateStr => {
    const dateObj = DateUtils.parseDate(dateStr);
    if (!dateObj) return;
    
    // Guard against invalid dates using new helper
    if (!DateUtils.isValidBusinessDate(dateObj)) {
      logTS('BizDateGuard: batchSyncCalendarSummaries skipping invalid date ' + dateStr);
      return;
    }
    const used = counts[dateStr] || 0;
    const left = getLeftFromSheet(FORM_REGISTRY[0], dateStr);
    
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const appointmentDate = new Date(y, m - 1, d);
      // Use first form entry as default for legacy calls
      const entry = FORM_REGISTRY[0];
      upsertDailySummaryEvent(appointmentDate, used, left, entry);
    } catch (err) {
      sendThrottledError('batchSyncCalendarSummaries-upsert', err);
    }
  });
  
  // Validation: check for duplicate summaries and log anomalies
  availDates.forEach(dateStr => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dayDate = new Date(y, m - 1, d);
      let summaries;
      try {
        summaries = CAL.getEventsForDay(dayDate)
          .filter(ev => ev.getDescription().indexOf(FULL_SUMMARY_TAG) === 0);
      } catch (calErr) {
        sendThrottledError('batchSyncCalendarSummaries-getEventsForDay', calErr);
        return;
      }
      
      if (summaries.length > 1) {
        logTS(`ANOMALY: Found ${summaries.length} summary events for ${dateStr}`);
      } else if (summaries.length === 0) {
        logTS(`ANOMALY: No summary event found for ${dateStr}`);
      }
    } catch (err) {
      sendThrottledError('batchSyncCalendarSummaries-validation', err);
    }
  });
  
  logTS('batchSyncCalendarSummaries:end');
}

/**
 * Writes availability table into the sheet and applies color coding.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @param {string[]} availDates - Dates to write.
 * @param {Object.<string,number>} counts - Map of date to booked count.
 */
function batchWriteAvailabilitySheet(registryEntry, availDates, counts) {
  logTS('batchWriteAvailabilitySheet:start for ' + registryEntry.availabilitySheetName);
  const sheet = getOrCreateSheet_(registryEntry);
  sheet.clearContents();
  const rows = [['Date', 'Booked', 'Slots Left']];
  availDates.forEach(dateStr => {
    const used = counts[dateStr] || 0;
    const left = SLOT_CAP - used;
    rows.push([dateStr, used, left]);
  });
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  colorCodeAvailabilitySheet_(registryEntry);
  logTS('batchWriteAvailabilitySheet:end for ' + registryEntry.availabilitySheetName);
}

/**
 * Generates a prefilled form URL for a specific date.
 * @param {string} dateText - Date string yyyy-MM-dd.
 * @param {Object} extraFields - Optional extra fields to prefill by field ID.
 * @return {string} Prefilled form URL.
 */
function generatePrefillUrl(dateText, extraFields) {
  logTS('generatePrefillUrl:start');
  try {
    const d = new Date(dateText);
    const weekday = Utilities.formatDate(d, TZ, 'EEE');
    // Use first form for demonstration
    const form = FormApp.openById(FORM_REGISTRY[0].formId);
    const li = getAppointmentListItem_(form);
    const choices = li.getChoices().map(c => c.getValue());
    
    // Find the matching choice for this date
    const matchingChoice = choices.find(choice => choice.startsWith(dateText));
    if (!matchingChoice) {
      logTS(`generatePrefillUrl: No choice found for date ${dateText}`);
      return form.getPublishedUrl();
    }
    
    // Create a prefilled response
    const response = form.createResponse();
    const listItemResponse = li.createResponse(matchingChoice);
    response.withItemResponse(listItemResponse);
    
    // Add extra fields if provided using FIELD_ID_MAP
    if (extraFields) {
      Object.entries(extraFields).forEach(([fieldName, value]) => {
        try {
          const itemId = FIELD_ID_MAP[fieldName];
          if (!itemId) return;
          const item = form.getItemById(itemId);
          if (!item) return;
          const itemType = item.getType();
          if (itemType === FormApp.ItemType.TEXT) {
            response.withItemResponse(item.asTextItem().createResponse(value));
          } else if (itemType === FormApp.ItemType.LIST) {
            response.withItemResponse(item.asListItem().createResponse(value));
          } else if (itemType === FormApp.ItemType.MULTIPLE_CHOICE) {
            response.withItemResponse(item.asMultipleChoiceItem().createResponse(value));
          }
        } catch (e) {
          logTS(`Error prefilling field ${fieldName}: ${e}`);
        }
      });
    }
    
    const prefillUrl = response.toPrefilledUrl();
    logTS('generatePrefillUrl:end');
    return prefillUrl;
  } catch (err) {
    logTS('Error in generatePrefillUrl: ' + err);
    return FormApp.openById(FORM_REGISTRY[0].formId).getPublishedUrl();
  }
}

/**
 * Decrements the form choice count for a given date.
 * @param {string} dateText - Date string yyyy-MM-dd.
 * @param {string} formId - Form ID to target.
 * @return {number} Remaining slots left.
 */
function decrementChoiceForDate(dateText, formId) {
  logTS('decrementChoiceForDate:start for ' + formId);
  try {
    const d = new Date(dateText);
    const weekday = Utilities.formatDate(d, TZ, 'EEE');
    const form = FormApp.openById(formId);
    const li = getAppointmentListItem_(form);
    const raw = li.getChoices().map(c => c.getValue());
    let newLeft = 0;
    let found = false;
    const updated = raw.map(val => {
      if (val.startsWith(dateText)) {
        found = true;
        const m = val.match(/\((\d+)\s+slots?\s+left\)/);
        let left = m ? parseInt(m[1], 10) - 1 : SLOT_CAP - 1;
        if (left < 0) left = 0;
        newLeft = left;
        if (left > 0) {
          return `${dateText} ${weekday} (${left} slot${left === 1 ? '' : 's'} left)`;
        } else {
          // Remove fully booked dates from choices
          return null;
        }
      }
      return val;
    }).filter(val => val !== null);
    
    if (!found) {
      logTS(`decrementChoiceForDate: Date ${dateText} not found in choices`);
      cachedListItem = null;
      return 0;
    }
    li.setChoiceValues(updated);
    logTS('decrementChoiceForDate:end for ' + formId);
    return newLeft;
  } catch (err) {
    logTS('Error in decrementChoiceForDate: ' + err);
    return 0;
  }
}



/**
 * Updates a single row in the availability sheet for a given date.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @param {string} dateText - Date string yyyy-MM-dd.
 * @param {number} left - Slots left.
 */
function updateSheetRowForDate(registryEntry, dateText, left) {
  logTS('updateSheetRowForDate:start for ' + registryEntry.availabilitySheetName);
  try {
    const sheet = getOrCreateSheet_(registryEntry);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      logTS('updateSheetRowForDate: No data rows found');
      return;
    }
    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const dateIdx = headers.indexOf('Date') + 1;
    const bookedIdx = headers.indexOf('Booked') + 1;
    const leftIdx = headers.indexOf('Slots Left') + 1;
    if (dateIdx === 0 || bookedIdx === 0 || leftIdx === 0) {
      logTS('updateSheetRowForDate: Required headers not found');
      return;
    }
    const data = sheet.getRange(2, dateIdx, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === dateText) {
        const rowNum = i + 2;
        sheet.getRange(rowNum, bookedIdx).setValue(SLOT_CAP - left);
        sheet.getRange(rowNum, leftIdx).setValue(left);
        break;
      }
    }
    sheet.sort({column: dateIdx, ascending: true});
  } catch (err) {
    logTS('Error in updateSheetRowForDate: ' + err);
    throw err;
  }
  logTS('updateSheetRowForDate:end for ' + registryEntry.availabilitySheetName);
}

/**
 * Retrieves or creates a sheet by name in the registry's spreadsheet.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @return {Sheet} The sheet object.
 */
function getOrCreateSheet_(registryEntry) {
  try {
    const ss = getSpreadsheet_(registryEntry);
    let sh = ss.getSheetByName(registryEntry.availabilitySheetName);
    if (!sh) sh = ss.insertSheet(registryEntry.availabilitySheetName);
    return sh;
  } catch (err) {
    sendThrottledError('getOrCreateSheet_', err);
    throw err;
  }
}

/**
 * Applies color-coding to availability sheet rows.
 * Red background if no slots left, green if slots available.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @private
 */
function colorCodeAvailabilitySheet_(registryEntry) {
  logTS('colorCodeAvailabilitySheet_:start for ' + registryEntry.availabilitySheetName);
  try {
    const sheet = getOrCreateSheet_(registryEntry);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      logTS('colorCodeAvailabilitySheet_: No data rows to color');
      return;
    }
    const lastCol = sheet.getLastColumn();
    const dataRows = lastRow - 1; // Exclude header row
    
    // Get all "Slots Left" values at once
    const slotsLeftValues = sheet.getRange(2, AVAIL_LEFT_COL, dataRows, 1).getValues();
    
    // Build 2D color matrix
    const colorsMatrix = [];
    for (let i = 0; i < dataRows; i++) {
      const left = slotsLeftValues[i][0];
      const color = left === 0 ? '#f4cccc' : '#d9ead3'; // Red if full, green if available
      // Create row array with same color for all columns
      const rowColors = new Array(lastCol).fill(color);
      colorsMatrix.push(rowColors);
    }
    
    // Apply all background colors in a single batch operation
    sheet.getRange(2, 1, dataRows, lastCol).setBackgrounds(colorsMatrix);
    logTS('colorCodeAvailabilitySheet_:end for ' + registryEntry.availabilitySheetName);
  } catch (err) {
    sendThrottledError('colorCodeAvailabilitySheet_', err);
    throw err;
  }
}

/**
 * Updates the form dropdown for a single date without rebuilding the entire dropdown.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 * @param {Date} dateObj - The appointment date object.
 * @param {number} slotsLeft - Number of slots remaining for this date.
 */
function updateFormDropdownForDate_(registryEntry, dateObj, slotsLeft) {
  try {
    logTS('updateFormDropdownForDate_: start for ' + registryEntry.formId + ' date ' + DateUtils.formatYMD(dateObj));
    
    const form = FormApp.openById(registryEntry.formId);
    const li = getAppointmentListItem_(form);
    const dateString = DateUtils.formatYMD(dateObj);
    
    // Get current choice values
    const currentChoices = li.getChoices().map(c => c.getValue());
    
    // Find and update the choice for this specific date
    const updatedChoices = currentChoices.map(choice => {
      if (choice.startsWith(dateString)) {
        if (slotsLeft > 0) {
          // Update the slot count in the choice text
          const weekday = Utilities.formatDate(dateObj, TZ, 'EEE');
          return `${dateString} ${weekday} (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)`;
        } else {
          // Remove fully booked dates by returning null
          return null;
        }
      }
      return choice;
    }).filter(choice => choice !== null); // Remove null entries (fully booked dates)
    
    // Update the form dropdown
    li.setChoiceValues(updatedChoices);
    cachedListItem = null; // Invalidate cache
    
    logTS('updateFormDropdownForDate_: Updated choice for ' + dateString + ' with ' + slotsLeft + ' slots left');
  } catch (err) {
    logTS('updateFormDropdownForDate_: Error updating form dropdown for single date: ' + err);
    sendThrottledError('updateFormDropdownForDate_', err);
  }
}

/**
 * Processes availability sheet by reading live values and updating calendar/form dropdowns.
 * @param {Object} registryEntry - Registry entry {formId, sheetName, availabilitySheetName, spreadsheetId}.
 */
function processAvailabilitySheet_(registryEntry) {
  try {
    logTS('processAvailabilitySheet_: start for ' + registryEntry.availabilitySheetName);
    
    // Open spreadsheet and availability sheet
    const sheet = getSpreadsheet_(registryEntry).getSheetByName(registryEntry.availabilitySheetName);
    if (!sheet) {
      logTS('processAvailabilitySheet_: Sheet not found: ' + registryEntry.availabilitySheetName);
      return;
    }
    
    // Read all rows from the sheet
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) {
      logTS('processAvailabilitySheet_: No data rows found in sheet');
      return;
    }
    
    const today = new Date();
    
    // Process each row (skip header row)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Parse date from column A using safeParseDate_
      const dateString = safeParseDate_(row[0]);
      if (!dateString) continue;
      
      const dateObj = DateUtils.parseDate(dateString);
      if (!dateObj) continue;
      
      // Skip past dates
      if (dateObj < today) continue;
      
      // Skip holidays
      if (HolidayService.isHoliday(dateString)) continue;
      
      // Read booked count from column B and slots left from column C
      const bookedCount = typeof row[AVAIL_BOOKED_COL - 1] === 'number' ? row[AVAIL_BOOKED_COL - 1] : 0;
      const slotsLeft = typeof row[AVAIL_LEFT_COL - 1] === 'number' ? row[AVAIL_LEFT_COL - 1] : SLOT_CAP;
      
      // Update calendar summary event
      try {
        upsertDailySummaryEvent(dateObj, bookedCount, slotsLeft, registryEntry);
      } catch (e) {
        sendThrottledError('processAvailabilitySheet_-upsertDailySummaryEvent', e);
      }
      
      // Update form dropdown for this date
      try {
        updateFormDropdownForDate_(registryEntry, dateObj, slotsLeft);
      } catch (e) {
        sendThrottledError('processAvailabilitySheet_-updateFormDropdownForDate_', e);
      }
    }
    
    logTS('processAvailabilitySheet_: end for ' + registryEntry.availabilitySheetName);
  } catch (err) {
    logTS('processAvailabilitySheet_: Error: ' + err);
    sendThrottledError('processAvailabilitySheet_', err);
  }
}



/**
 * Validates the summary window ensuring exactly one summary on valid business dates and none elsewhere
 */
function validateSummaryWindow() {
  logTS('validateSummaryWindow: start');
  
  try {
    const today = new Date();
    const endDate = DateUtils.addDays(today, FUTURE_DAYS);
    
    // Build complete date window including weekends for validation
    const allDates = [];
    let currentDate = new Date(today);
    while (currentDate <= endDate) {
      allDates.push(DateUtils.formatYMD(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    logTS(`validateSummaryWindow: Checking ${allDates.length} dates from ${DateUtils.formatYMD(today)} to ${DateUtils.formatYMD(endDate)}`);
    
    let validatedCount = 0;
    let createdCount = 0;
    let deletedCount = 0;
    
    for (const dateStr of allDates) {
      try {
        const dateObj = DateUtils.parseDate(dateStr);
        if (!dateObj) continue;
        
        // Get existing summary events for this date
        const existingEvents = CAL.getEventsForDay(dateObj).filter(e => 
          e.getTitle().includes(FULL_SUMMARY_TAG)
        );
        
        if (DateUtils.isValidBusinessDate(dateObj)) {
          // Valid business date: ensure exactly one summary
          if (existingEvents.length === 0) {
            // Create missing summary
            const availability = CalendarSyncService.getAvailabilityForDate(dateStr);
            const minLeft = availability.minLeft;
            const registryEntry = FORM_REGISTRY[0]; // Use first form as default
            
            try {
              upsertDailySummaryEvent(dateObj, undefined, minLeft, registryEntry);
              createdCount++;
              logTS(`validateSummaryWindow: Created summary for valid date ${dateStr}`);
            } catch (e) {
              logTS(`validateSummaryWindow: Error creating summary for ${dateStr}: ${e}`);
            }
          } else if (existingEvents.length > 1) {
            // Delete duplicates, keep first
            for (let i = 1; i < existingEvents.length; i++) {
              if (CalendarQuotaManager.safeDeleteEvent(existingEvents[i])) {
                deletedCount++;
              }
            }
            logTS(`validateSummaryWindow: Removed ${existingEvents.length - 1} duplicate summaries for ${dateStr}`);
          }
          validatedCount++;
        } else {
          // Invalid date: delete all summaries
          for (const event of existingEvents) {
            if (CalendarQuotaManager.safeDeleteEvent(event)) {
              deletedCount++;
            }
          }
          if (existingEvents.length > 0) {
            logTS(`validateSummaryWindow: Removed ${existingEvents.length} summaries from invalid date ${dateStr}`);
          }
        }
      } catch (e) {
        logTS(`validateSummaryWindow: Error processing date ${dateStr}: ${e}`);
      }
    }
    
    logTS(`validateSummaryWindow: end - validated ${validatedCount} business dates, created ${createdCount}, deleted ${deletedCount}`);
    
  } catch (e) {
    logTS('validateSummaryWindow: Error: ' + e);
    sendThrottledError('validateSummaryWindow', e);
  }
}

/**
 * Enhanced error handling and logging service
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
    
    logTS(`ERROR [${context}]: ${error.message}`);
    if (error.stack) {
      logTS(`Stack: ${error.stack}`);
    }
    if (Object.keys(metadata).length > 0) {
      logTS(`Metadata: ${JSON.stringify(metadata)}`);
    }
    
    // Store in script properties for debugging
    try {
      const props = PropertiesService.getScriptProperties();
      const recentErrors = JSON.parse(props.getProperty('RECENT_ERRORS') || '[]');
      recentErrors.unshift(errorInfo);
      if (recentErrors.length > 100) recentErrors.pop(); // Keep last 100 errors
      props.setProperty('RECENT_ERRORS', JSON.stringify(recentErrors));
    } catch (e) {
      logTS('ErrorService.logError: Failed to store error: ' + e);
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
        const body = `
Error occurred in ${context}:
Message: ${error.message}
Stack: ${error.stack}
Metadata: ${JSON.stringify(metadata, null, 2)}
Time: ${new Date().toISOString()}
        `;
        
        MailApp.sendEmail({
          to: Session.getEffectiveUser().getEmail(),
          subject: subject,
          body: body
        });
        
        props.setProperty(errorKey, String(now));
      }
    } catch (e) {
      logTS('ErrorService.sendThrottledError: Failed to send notification: ' + e);
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
      logTS('ErrorService.getRecentErrors: Failed to get errors: ' + e);
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
      logTS('ErrorService.clearErrorHistory: Failed to clear errors: ' + e);
    }
  }
};

  /**
   * TRAYCER THIS IS A WARNING TO YOU, DO NOT CHANGE ANYTHING FROM LINE ONE UP TO THIS LINE HERE. IF YOU WANT TO MAKE CHANGES DO IT BELOW THIS CLAUSE. ABOVE ARE EXTREMEMLY IMPORTANT REALTIME FUNCTIONS AND LINE OF CODE THAT IS CRITICAL TO THE OPERATIONS OF THE WEBSITE.
   */





