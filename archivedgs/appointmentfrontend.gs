/* eslint-disable no-redeclare */
/**
 * appointmentfrontend.gs
 *
 * Frontend scaffold for appointment functionality.
 * NO constants are duplicated - everything is imported from googleactionscriptcodeworking.gs.
 * Referenced constants: FUTURE_DAYS, FORM_REGISTRY, SLOT_CAP, LOCK_TIMEOUT_MS.
 * Uses 4-column layout (A:D) for active appointments and G:J for archived appointments.
 * 
 * Public APIs:
 * - generateUnifiedAppointmentList(): Manual/cron entry point with validation
 * - onFormSubmitTriggerWrapper(e): Safe wrapper for form-submit triggers
 * 
 * Validation Rules:
 * - Future window check: appointments must be within today + FUTURE_DAYS
 * - Registry match: sheet names must exist in FORM_REGISTRY
 * - Duplicate removal: based on ${sheetName}#${rowNum} keys
 * 
 * Created: 2024-06-01
 * Updated: 2024-06-11 - Added validation pipeline and public hooks
 */

// Shared constants (import-only, DO NOT REDECLARE)
const { FUTURE_DAYS, FORM_REGISTRY, SLOT_CAP, LOCK_TIMEOUT_MS } = globalThis;
if (!FUTURE_DAYS || !Array.isArray(FORM_REGISTRY)) throw new Error('Shared constants missing – check googleactionscriptcodeworking.gs');
const PRIMARY_SS_ID = FORM_REGISTRY[0].spreadsheetId; // local helper only

// Frontend-specific constants
const LIST_SHEET_NAME = 'ListOfAppointments';
const ARCHIVE_START_COL = 7; // column G

// New block layout constants
const BLOCK_ROWS = 23;
const VIEW_COLS = 4;
const TITLE_TEXT = 'Unified Appointment List';

/**
 * External manual/cron entry point for generating the unified appointment list.
 * Performs comprehensive validation including future window checks, registry matching,
 * and duplicate removal before rendering the appointment list.
 * 
 * This function can be called manually or by external cron jobs/triggers.
 * Uses script lock to prevent concurrent execution.
 */
function generateUnifiedAppointmentList() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    console.log('generateUnifiedAppointmentList: Lock busy, skipping');
    return;
  }
  
  try {
    generateListWithValidation_();
  } catch (error) {
    console.error('generateUnifiedAppointmentList: Error:', error);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Safe wrapper for form-submit triggers from other scripts.
 * Validates the event source against FORM_REGISTRY before processing.
 * Uses script lock to prevent concurrent execution.
 * 
 * @param {Event} e - Form submit event object
 */
function onFormSubmitTriggerWrapper(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    console.log('onFormSubmitTriggerWrapper: Lock busy, skipping');
    return;
  }
  
  try {
    // Optional validation of event source against FORM_REGISTRY
    if (e && e.source) {
      const sourceId = e.source.getId();
      const isValidSource = FORM_REGISTRY.some(entry => entry.formId === sourceId);
      if (!isValidSource) {
        console.warn(`onFormSubmitTriggerWrapper: Unknown form source ${sourceId}`);
      }
    }
    
    generateListWithValidation_();
  } catch (error) {
    console.error('onFormSubmitTriggerWrapper: Error:', error);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Builds the appointment list for the frontend using 4-column, 23-row block layout.
 * Aggregates future appointments from all response sheets and renders them
 * in structured date blocks into the ListOfAppointments sheet.
 */
function buildAppointmentList() {
  // Maintain backward compatibility by delegating to new unified function
  generateUnifiedAppointmentList();
}

/**
 * Frontend form submit handler.
 * Delegates to buildAppointmentList to refresh the appointment list.
 * Note: Triggers should be created via ensureFrontendTriggers_()
 * @param {Event} e - Event object (if needed).
 */
function onFormSubmit(e) {
  buildAppointmentList();
}

// ============================================================================
// PRIVATE HELPER FUNCTIONS
// ============================================================================

/**
 * Core appointment list generation with comprehensive validation pipeline.
 * Fetches all responses, validates them through multiple filters, and renders
 * the final appointment list using the 4-column block layout.
 * @private
 */
function generateListWithValidation_() {
  const rawAppts = fetchAllResponses_();
  const validatedAppts = validateAppointments_(rawAppts);
  const deduplicatedAppts = deduplicateAppointments_(validatedAppts);
  const grouped = groupByDate_(deduplicatedAppts);
  writeListSheet_(grouped);
}

/**
 * Returns ordered array of Y-M-D strings from today to today+FUTURE_DAYS.
 * @return {string[]} Array of date strings in YYYY-MM-DD format
 * @private
 */
function getDateWindow_() {
  const window = [];
  const today = DateUtils.startOfDay(new Date());
  const end = DateUtils.addDays(today, FUTURE_DAYS);
  
  for (let d = new Date(today); d <= end; d = DateUtils.addDays(d, 1)) {
    window.push(DateUtils.formatYMD(d));
  }
  
  return window.sort();
}

/**
 * Renders a single date block (23 rows) in the sheet.
 * @param {Sheet} sheet - The sheet to write to
 * @param {string} dateKey - Date string in YYYY-MM-DD format
 * @param {Array} appointments - Array of appointments for this date
 * @param {number} startRow - Starting row for this block
 * @private
 */
function renderDateBlock_(sheet, dateKey, appointments, startRow) {
  let rowPtr = startRow;
  
  // Merge A:D for date row and center with bold formatting
  sheet.getRange(rowPtr, 1, 1, VIEW_COLS).merge().setValue(dateKey);
  sheet.getRange(rowPtr, 1).setHorizontalAlignment('center').setFontWeight('bold');
  rowPtr++;
  
  // Write headers
  const headers = ['Sheet Tab Name', 'Full Name', 'Purok, Barangay', 'Reason for Disconnection'];
  sheet.getRange(rowPtr, 1, 1, VIEW_COLS).setValues([headers]);
  rowPtr++;
  
  // Write up to SLOT_CAP appointments
  const appointmentsToWrite = appointments.slice(0, SLOT_CAP);
  for (const appt of appointmentsToWrite) {
    const rowData = [
      appt.sheetName,
      appt.name,
      appt.address,
      appt.reason || ''
    ];
    sheet.getRange(rowPtr, 1, 1, VIEW_COLS).setValues([rowData]);
    rowPtr++;
  }
  
  // Pad blank rows until 20 rows total
  padBlankRows_(sheet, rowPtr, startRow + BLOCK_ROWS - 1);
}

/**
 * Pads blank rows in the current block.
 * @param {Sheet} sheet - The sheet to write to
 * @param {number} currentRow - Current row pointer
 * @param {number} endRow - End row of the block
 * @private
 */
function padBlankRows_(sheet, currentRow, endRow) {
  if (currentRow <= endRow) {
    const blankRowsNeeded = endRow - currentRow + 1;
    const blankData = Array(blankRowsNeeded).fill(['', '', '', '']);
    sheet.getRange(currentRow, 1, blankRowsNeeded, VIEW_COLS).setValues(blankData);
  }
}

/**
 * Fetches all appointment responses from every sheet defined in FORM_REGISTRY.
 * Filters for future appointments only.
 * @return {Array} Array of appointment objects
 * @private
 */
function fetchAllResponses_() {
  /* iterate FORM_REGISTRY, read data, return array */
  const allAppointments = [];
  const today = DateUtils.startOfDay(new Date());
  
  for (const entry of FORM_REGISTRY) {
    try {
      const spreadsheet = getSpreadsheet_(entry);
      
      const sheet = spreadsheet.getSheetByName(entry.sheetName);
      if (!sheet) continue;
      
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue; // Skip if only headers or empty
      
      // Process rows starting from row 2 (skip headers)
      for (let i = 1; i < data.length; i++) {
        const appointment = rowToAppt_(data[i], entry.sheetName, i + 1);
        if (appointment && appointment.dateObj >= today) {
          allAppointments.push(appointment);
        }
      }
    } catch (error) {
      console.error(`fetchAllResponses_: Error processing ${entry.sheetName}:`, error);
    }
  }
  
  return allAppointments;
}

/**
 * Validates appointments through multiple filters:
 * - Future window check: dateObj must be >= today and <= today + FUTURE_DAYS
 * - Registry match: sheetName must exist in FORM_REGISTRY
 * @param {Array} appts - Array of appointment objects to validate
 * @return {Array} Array of validated appointment objects
 * @private
 */
function validateAppointments_(appts) {
  const today = DateUtils.startOfDay(new Date());
  const futureLimit = DateUtils.addDays(today, FUTURE_DAYS);
  
  const registrySheetNames = new Set(FORM_REGISTRY.map(entry => entry.sheetName));
  
  const validatedAppts = [];
  let rejectedCount = 0;
  
  for (const appt of appts) {
    let isValid = true;
    const rejectionReasons = [];
    
    // Future window check
    if (appt.dateObj < today || appt.dateObj > futureLimit) {
      isValid = false;
      rejectionReasons.push('outside future window');
    }
    
    // Registry match check
    if (!registrySheetNames.has(appt.sheetName)) {
      isValid = false;
      rejectionReasons.push('sheet not in registry');
    }
    
    if (isValid) {
      validatedAppts.push(appt);
    } else {
      rejectedCount++;
      console.log(`validateAppointments_: Rejected appointment from ${appt.sheetName}#${appt.rowNum}: ${rejectionReasons.join(', ')}`);
    }
  }
  
  console.log(`validateAppointments_: Validated ${validatedAppts.length} appointments, rejected ${rejectedCount}`);
  return validatedAppts;
}

/**
 * Removes duplicate appointments based on ${sheetName}#${rowNum} keys.
 * Keeps the first occurrence of each duplicate and logs removed duplicates.
 * @param {Array} appts - Array of appointment objects to deduplicate
 * @return {Array} Array of deduplicated appointment objects
 * @private
 */
function deduplicateAppointments_(appts) {
  const seen = new Set();
  const deduplicatedAppts = [];
  let duplicateCount = 0;
  
  for (const appt of appts) {
    const key = `${appt.sheetName}#${appt.rowNum}`;
    
    if (seen.has(key)) {
      duplicateCount++;
      console.log(`deduplicateAppointments_: Removed duplicate appointment ${key} for ${appt.name}`);
    } else {
      seen.add(key);
      deduplicatedAppts.push(appt);
    }
  }
  
  console.log(`deduplicateAppointments_: Kept ${deduplicatedAppts.length} appointments, removed ${duplicateCount} duplicates`);
  return deduplicatedAppts;
}

/**
 * Converts a raw spreadsheet row into a normalized appointment object.
 * Assumes consistent column order across all forms.
 * @param {Array} row - Raw row data from spreadsheet
 * @param {string} sheetName - Name of the source sheet
 * @param {number} rowNum - Row number in the sheet
 * @return {Object|null} Normalized appointment object or null if invalid
 * @private
 */
function rowToAppt_(row, sheetName, rowNum) {
  /* map to {dateKey,timeStr,name,address,refNo,sheetName,rowNum,reason} */
  try {
    // Assuming standard column order: Timestamp, LastName, FirstName, Purok, Barangay, DateOfAppointment, [Reason]
    const [timestamp, lastName, firstName, purok, barangay, dateChoice, reasonCol] = row;
    
    if (!dateChoice || !lastName || !firstName) return null;
    
    // Extract date from dateChoice (format: "yyyy-MM-dd Day (X slots left)")
    const dateMatch = String(dateChoice).match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) return null;
    
    const dateKey = dateMatch[1];
    const dateObj = new Date(dateKey);
    if (isNaN(dateObj)) return null;
    
    // Extract reason only for ForDisconnection sheet
    let reason = '';
    if (sheetName === 'ForDisconnection' && reasonCol) {
      reason = String(reasonCol).trim();
    }
    
    return {
      dateKey: dateKey,
      dateObj: dateObj,
      timeStr: '09:00', // Default time, could be extracted from form if available
      name: `${firstName} ${lastName}`,
      address: `${purok}, ${barangay}`,
      refNo: `${sheetName.substring(0,3).toUpperCase()}-${rowNum}`,
      sheetName: sheetName,
      rowNum: rowNum,
      reason: reason
    };
  } catch (error) {
    console.error('rowToAppt_: Error processing row:', error);
    return null;
  }
}

/**
 * Groups appointments by date, pre-populated with all dates in the window.
 * @param {Array} appts - Array of appointment objects
 * @return {Map} Map of dateKey to sorted appointment arrays
 * @private
 */
function groupByDate_(appts) {
  /* build Map seeded with all dateKeys from getDateWindow_ */
  const dateWindow = getDateWindow_();
  const grouped = new Map();
  
  // Pre-populate with all dates in window
  for (const dateKey of dateWindow) {
    grouped.set(dateKey, []);
  }
  
  // Push appointments where applicable
  for (const appt of appts) {
    if (grouped.has(appt.dateKey)) {
      grouped.get(appt.dateKey).push(appt);
    }
  }
  
  // Sort appointments within each date by time, then by name
  for (const [dateKey, appointments] of grouped) {
    appointments.sort((a, b) => {
      const timeCompare = a.timeStr.localeCompare(b.timeStr);
      return timeCompare !== 0 ? timeCompare : a.name.localeCompare(b.name);
    });
  }
  
  return grouped;
}

/**
 * Writes the grouped appointments to the ListOfAppointments sheet using 4-column block layout.
 * Each date gets exactly 23 rows: title + date + header + up to 20 appointment rows.
 * @param {Map} grouped - Map of dateKey to appointment arrays
 * @private
 */
function writeListSheet_(grouped) {
  /* clear A:D & write block layout */
  try {
    const spreadsheet = SpreadsheetApp.openById(PRIMARY_SS_ID);
    let listSheet = spreadsheet.getSheetByName(LIST_SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!listSheet) {
      listSheet = spreadsheet.insertSheet(LIST_SHEET_NAME);
    }
    
    // Clear content A:D only, keep E:F and G:J untouched
    listSheet.getRange(1, 1, listSheet.getMaxRows(), VIEW_COLS).clearContent();
    
    let rowPtr = 1;
    
    // Write title
    listSheet.getRange(rowPtr, 1).setValue(TITLE_TEXT);
    listSheet.getRange(rowPtr, 1).setFontWeight('bold').setFontSize(14);
    rowPtr++;
    
    // Process each date in window
    for (const [dateKey, appointments] of grouped) {
      renderDateBlock_(listSheet, dateKey, appointments, rowPtr);
      rowPtr += BLOCK_ROWS;
    }
    
    // Freeze panes at Row 2 and apply formatting
    listSheet.setFrozenRows(2);
    
    // Apply bold+bg for date rows (every 23rd row starting from row 3)
    let dateRowPtr = 3;
    for (const [dateKey] of grouped) {
      listSheet.getRange(dateRowPtr, 1, 1, VIEW_COLS)
        .setBackground('#e6f3ff')
        .setFontWeight('bold');
      dateRowPtr += BLOCK_ROWS;
    }
    
    console.log(`writeListSheet_: Wrote ${grouped.size} date blocks in 4-column layout to ${LIST_SHEET_NAME}`);
  } catch (error) {
    console.error('writeListSheet_: Error in 4-column layout:', error);
  }
}

/**
 * Archives appointments older than today by moving 23-row blocks to archive columns G:J.
 * Inserts newest archived blocks at row 1 in G:J, pushing older archived blocks downward.
 * Processes blocks starting from row 2; reads date from merged row; moves old blocks.
 * @private
 */
function archiveOldRows_() {
  /* loop blocks by incrementing 23; move old blocks to archive with newest at top */
  try {
    const spreadsheet = SpreadsheetApp.openById(PRIMARY_SS_ID);
    const listSheet = spreadsheet.getSheetByName(LIST_SHEET_NAME);
    if (!listSheet) return;
    
    const today = DateUtils.startOfDay(new Date());
    
    const archiveColStart = ARCHIVE_START_COL;
    const archiveColEnd = ARCHIVE_START_COL + VIEW_COLS - 1;
    const maxRows = listSheet.getMaxRows();
    let archivedBlocks = 0;
    
    // Loop through blocks starting from row 2 (after title row)
    let blockStart = 2;
    while (blockStart < maxRows) {
      try {
        // Read date from merged row (A cell of the block)
        const dateCell = listSheet.getRange(blockStart, 1).getValue();
        if (!dateCell) break; // No more blocks
        
        const dateStr = String(dateCell);
        const blockDate = new Date(dateStr);
        
        if (!isNaN(blockDate) && blockDate < today) {
          // Read block data from A:D
          const blockRange = listSheet.getRange(blockStart, 1, BLOCK_ROWS, VIEW_COLS);
          const blockData = blockRange.getValues();
          
          // Insert new rows at row 1 to push existing archive data downward
          listSheet.insertRows(1, BLOCK_ROWS);
          
          // Write the copied block into the freshly inserted rows at G:J
          listSheet.getRange(1, archiveColStart, BLOCK_ROWS, VIEW_COLS).setValues(blockData);
          
          // Clear the original A:D block (now shifted down by BLOCK_ROWS due to insertion)
          listSheet.getRange(blockStart + BLOCK_ROWS, 1, BLOCK_ROWS, VIEW_COLS).clearContent();
          
          archivedBlocks++;
          console.log(`archiveOldRows_: Archived block for date ${dateStr} at top of archive`);
          
          // Don't increment blockStart since we removed a block and rows shifted
        } else {
          // Move to next block
          blockStart += BLOCK_ROWS;
        }
      } catch (blockError) {
        console.error(`archiveOldRows_: Error processing block at row ${blockStart}:`, blockError);
        blockStart += BLOCK_ROWS; // Skip problematic block
      }
    }
    
    if (archivedBlocks > 0) {
      console.log(`archiveOldRows_: Archived ${archivedBlocks} old date blocks to G:J with newest at top`);
      // Rebuild the list to reorganize remaining blocks
      buildAppointmentList();
    }
  } catch (error) {
    console.error('archiveOldRows_: Error in archive operation:', error);
  }
}

/**
 * Ensures frontend triggers exist for form submissions and nightly maintenance.
 * Creates time-driven trigger for nightly maintenance and form-submit triggers.
 * @private
 */
function ensureFrontendTriggers_() {
  /* create submit + time triggers */
  try {
    const existingTriggers = ScriptApp.getProjectTriggers();
    
    // Check for nightly maintenance trigger
    const hasNightlyTrigger = existingTriggers.some(trigger => 
      trigger.getHandlerFunction() === 'nightlyMaintenance_'
    );
    
    if (!hasNightlyTrigger) {
      ScriptApp.newTrigger('nightlyMaintenance_')
        .timeBased()
        .everyDays(1)
        .atHour(0)
        .nearMinute(5)
        .create();
      console.log('ensureFrontendTriggers_: Created nightly maintenance trigger');
    }
    
    // Check for form submit triggers using new wrapper function
    for (const entry of FORM_REGISTRY) {
      const hasFormTrigger = existingTriggers.some(trigger => 
        trigger.getHandlerFunction() === 'onFormSubmitTriggerWrapper' &&
        trigger.getTriggerSourceId() === entry.formId
      );
      
      if (!hasFormTrigger) {
        try {
          const form = FormApp.openById(entry.formId);
          ScriptApp.newTrigger('onFormSubmitTriggerWrapper')
            .forForm(form)
            .onFormSubmit()
            .create();
          console.log(`ensureFrontendTriggers_: Created form trigger for ${entry.formId}`);
        } catch (formError) {
          console.error(`ensureFrontendTriggers_: Error creating trigger for ${entry.formId}:`, formError);
        }
      }
    }
  } catch (error) {
    console.error('ensureFrontendTriggers_: Error:', error);
  }
}

/**
 * Nightly maintenance function that archives old appointments and rebuilds the list.
 * Called by time-driven trigger at 00:05 daily.
 * @private
 */
function nightlyMaintenance_() {
  console.log('nightlyMaintenance_: Starting nightly maintenance');
  try {
    archiveOldRows_();
    buildAppointmentList();
    console.log('nightlyMaintenance_: Completed successfully');
  } catch (error) {
    console.error('nightlyMaintenance_: Error:', error);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize frontend triggers (run manually or via IIFE)
// Uncomment the line below to auto-initialize triggers on script load
// (function() { ensureFrontendTriggers_(); })();
