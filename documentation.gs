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
 */ 