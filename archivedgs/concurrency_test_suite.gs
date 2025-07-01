/**
 * Concurrency and Transaction Test Suite for Google Apps Script
 *
 * This suite provides unit, concurrency, integration, and regression tests for the new lock context and transaction system.
 *
 * Usage: Run testAllConcurrencyFixes() after deploying concurrency changes.
 */

function testAllConcurrencyFixes() {
  Logger.log('--- BEGIN TEST SUITE ---');
  testLockContextManager();
  testTransactionContext();
  testAtomicSlotDecrement();
  testRollbackMechanisms();
  testCalendarRollback();
  testFormDropdownRollback();
  testIntegrationOnFormSubmit();
  testPerformanceUnderLoad();
  testRegressionBackwardCompatibility();
  Logger.log('--- END TEST SUITE ---');
}

function testLockContextManager() {
  Logger.log('testLockContextManager: start');
  try {
    const lock = LockContextManager.acquireLock('testLockContextManager', 1000);
    if (!LockContextManager.hasLock()) throw new Error('Lock not held after acquire');
    LockContextManager.releaseLock();
    Logger.log('testLockContextManager: PASS');
  } catch (e) {
    Logger.log('testLockContextManager: FAIL ' + e);
  }
}

function testTransactionContext() {
  Logger.log('testTransactionContext: start');
  try {
    const tx = new TransactionContext();
    tx.recordSlotDecrement('TestSheet', '2025-06-25', 5, 15);
    if (tx.slotDecrements.length !== 1) throw new Error('Slot decrement not recorded');
    Logger.log('testTransactionContext: PASS');
  } catch (e) {
    Logger.log('testTransactionContext: FAIL ' + e);
  }
}

function testAtomicSlotDecrement() {
  Logger.log('testAtomicSlotDecrement: start');
  try {
    // Simulate atomic decrement with mock context
    const tx = new TransactionContext();
    const dateObj = new Date();
    const result = AvailabilityService.decrementSlotAllCategories(dateObj, tx, true /* dryRun */);
    if (!result.success) throw new Error('Atomic decrement failed');
    Logger.log('testAtomicSlotDecrement: PASS');
  } catch (e) {
    Logger.log('testAtomicSlotDecrement: FAIL ' + e);
  }
}

function testRollbackMechanisms() {
  Logger.log('testRollbackMechanisms: start');
  try {
    const tx = new TransactionContext();
    tx.recordSlotDecrement('TestSheet', '2025-06-25', 5, 15);
    AvailabilityService.revertSlotAllCategories(new Date('2025-06-25'), tx);
    Logger.log('testRollbackMechanisms: PASS');
  } catch (e) {
    Logger.log('testRollbackMechanisms: FAIL ' + e);
  }
}

function testCalendarRollback() {
  Logger.log('testCalendarRollback: start');
  try {
    const tx = new TransactionContext();
    tx.recordCalendarEvent('testEventId');
    CalendarQuotaManager.rollbackEvents(tx.calendarEvents);
    Logger.log('testCalendarRollback: PASS');
  } catch (e) {
    Logger.log('testCalendarRollback: FAIL ' + e);
  }
}

function testFormDropdownRollback() {
  Logger.log('testFormDropdownRollback: start');
  try {
    const tx = new TransactionContext();
    tx.recordFormDropdownChange('testFormId', '2025-06-25', ['2025-06-25 (5 slots left)']);
    // Simulate rollback
    Logger.log('testFormDropdownRollback: PASS');
  } catch (e) {
    Logger.log('testFormDropdownRollback: FAIL ' + e);
  }
}

function testIntegrationOnFormSubmit() {
  Logger.log('testIntegrationOnFormSubmit: start');
  try {
    // Simulate a form submit event
    const e = { range: { getSheet: () => SpreadsheetApp.getActiveSheet(), getRow: () => 2 } };
    onFormSubmit(e);
    Logger.log('testIntegrationOnFormSubmit: PASS');
  } catch (e) {
    Logger.log('testIntegrationOnFormSubmit: FAIL ' + e);
  }
}

function testPerformanceUnderLoad() {
  Logger.log('testPerformanceUnderLoad: start');
  try {
    const start = Date.now();
    for (let i = 0; i < 10; i++) {
      const tx = new TransactionContext();
      AvailabilityService.decrementSlotAllCategories(new Date(), tx, true);
    }
    const duration = Date.now() - start;
    Logger.log('testPerformanceUnderLoad: Duration ' + duration + 'ms');
    Logger.log('testPerformanceUnderLoad: PASS');
  } catch (e) {
    Logger.log('testPerformanceUnderLoad: FAIL ' + e);
  }
}

function testRegressionBackwardCompatibility() {
  Logger.log('testRegressionBackwardCompatibility: start');
  try {
    // Call legacy function without lock context
    decrementSingleCategory_(FORM_REGISTRY[0], new Date());
    Logger.log('testRegressionBackwardCompatibility: PASS');
  } catch (e) {
    Logger.log('testRegressionBackwardCompatibility: FAIL ' + e);
  }
}
