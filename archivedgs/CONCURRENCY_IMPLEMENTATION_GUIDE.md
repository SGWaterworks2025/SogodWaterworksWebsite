# Sogod Waterworks Appointment System

## Concurrency Implementation Guide

---

### **Architecture Overview**

- **Hybrid concurrency model**: Critical booking operations (slot decrement) are atomic and fast, protected by per-date locks. Non-critical side effects (calendar, dropdown, cleanup) are handled asynchronously via a robust task queue.
- **Per-date locking**: Uses `CacheService` for date-specific locks, allowing parallel processing for different dates.
- **Async task queue**: All side effects are enqueued and processed by background workers, with deduplication, retries, and circuit breaker for queue depth.
- **Eventual consistency**: Nightly sync (`updateAvailability_everywhere`) fully regenerates calendar and dropdown state from the sheet, ensuring recovery from any async failure.
- **Monitoring**: Real-time and historical metrics for lock waits, queue depth, and function performance are logged to a dedicated sheet.

---

### **Implementation Phases**

1. **Per-Date Lock Management**: Added `LockContextManager` for per-date and global locks, with monitoring.
2. **Optimized Critical Section**: Refactored `AvailabilityService.decrementSlotAllCategories` for minimal I/O, batch writes, and rollback support.
3. **Async Task Queue**: Implemented `TaskQueueService` for robust, deduplicated, and retryable background processing.
4. **Hybrid onFormSubmit**: Only slot decrement is synchronous; all side effects are async tasks. Immediate user response.
5. **Transaction & Rollback**: Added `TransactionContext` for rollback of slot decrements on error.
6. **Optimized Triggers**: Per-operation locks, staggered execution, and quota-aware processing for background jobs.
7. **Monitoring & Error Handling**: `ConcurrencyMonitor` logs lock waits, queue depth, and function performance. Circuit breaker for overload.
8. **Documentation**: This guide.

---

### **Operational Procedures**

- **Monitoring**: Check the `ConcurrencyMonitor` sheet for lock wait warnings, queue depth, and function timings. Investigate any `[WARN]` or `[CIRCUIT BREAKER]` logs.
- **Troubleshooting**: If lock waits or queue depth are persistently high, consider increasing lock timeouts, reducing trigger frequency, or scaling up background processing.
- **Maintenance**: Periodically clear old rows from `TaskQueue` and `ConcurrencyMonitor` sheets. Review error logs for recurring issues.
- **Manual Recovery**: Run `updateAvailability_everywhere` to force regeneration of calendar and dropdown state if async tasks fail.

---

### **Configuration & Tuning**

- `PER_DATE_LOCK_TIMEOUT_MS`: Timeout for per-date locks (default: 5000ms)
- `LOCK_TIMEOUT_MS`: Timeout for global locks (default: 30000ms)
- `TASK_QUEUE_BATCH_SIZE`: Number of async tasks processed per run (default: 10)
- `TASK_QUEUE_MAX_RETRIES`: Max retries for failed async tasks (default: 3)
- `QUEUE_DEPTH_WARN`: Warning threshold for task queue depth (default: 50)
- `LOCK_WAIT_WARN_MS`: Warning threshold for lock wait time (default: 10000ms)
- Adjust these in the code as needed for your load and quota.

---

### **Testing & Validation**

- **Concurrency test suite**: Simulate 20+ concurrent submissions for different and same dates. Validate that only one booking per date is processed at a time, and that async side effects are eventually consistent.
- **Performance monitoring**: Use the `ConcurrencyMonitor` sheet to verify that lock waits and queue depth remain within acceptable limits under load.
- **Rollback tests**: Simulate errors after slot decrement and verify that rollbacks occur and no partial bookings are left.
- **Async task queue**: Test deduplication, retry, and circuit breaker logic by injecting failures and overloads.

---

### **Risk Management & Rollback**

- **Lock contention**: If lock waits are high, consider increasing timeouts or staggering triggers further.
- **Queue overload**: If the task queue grows too large, circuit breaker will defer new tasks. Investigate and resolve root cause.
- **Quota exhaustion**: If Calendar API quota is hit, heavy operations are skipped and will be retried on the next run.
- **Manual rollback**: If a critical error occurs, use the transaction log and `TransactionContext.rollback()` to revert slot decrements.
- **Eventual consistency**: Nightly sync ensures recovery from any missed async side effects.

---

### **References**

- **LockContextManager**: Per-date and global lock logic (see `googleactionscriptcodeworking.gs`)
- **AvailabilityService.decrementSlotAllCategories**: Critical section, batch ops, rollback
- **TaskQueueService**: Async task queue, deduplication, retry, circuit breaker
- **TransactionContext**: Rollback support
- **ConcurrencyMonitor**: Monitoring and logging
- **updateAvailability_everywhere**: Nightly full sync and recovery
- **onFormSubmit**: Hybrid concurrency entry point

---

**For further details, see code comments and the `ConcurrencyMonitor` sheet.** 