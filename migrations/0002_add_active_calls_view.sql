-- View for currently active calls (people on hold right now)
DROP VIEW IF EXISTS active_calls;
CREATE VIEW active_calls AS
SELECT
    from_number_hash,
    from_number_display,
    city,
    state,
    country,
    start_time,
    -- Calculate current hold duration in seconds
    CAST((julianday('now') - julianday(start_time)) * 86400 AS INTEGER) as current_duration_seconds
FROM calls
WHERE status = 'answered'
  AND end_time IS NULL
  -- Only include calls from last 7 days (prevents stale records from webhook failures)
  -- People are dedicated - they'll stay on hold for DAYS
  AND start_time >= datetime('now', '-7 days')
ORDER BY start_time ASC;