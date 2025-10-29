-- Create calls table with privacy-preserving phone number storage
DROP TABLE IF EXISTS calls;
CREATE TABLE calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_sid TEXT UNIQUE NOT NULL,
    from_number TEXT NOT NULL,  -- This will store the hash
    from_number_hash TEXT,
    from_number_display TEXT,
    from_area_code TEXT,
    to_number TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_seconds INTEGER,
    status TEXT NOT NULL,
    city TEXT,
    state TEXT,
    country TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX idx_from_number_hash ON calls(from_number_hash);
CREATE INDEX idx_from_area_code ON calls(from_area_code);
CREATE INDEX idx_duration ON calls(duration_seconds DESC);
CREATE INDEX idx_start_time ON calls(start_time DESC);
CREATE INDEX idx_status ON calls(status);

-- View for longest single hold times
DROP VIEW IF EXISTS longest_single_hold;
CREATE VIEW longest_single_hold AS
SELECT
    from_number_hash,
    from_number_display,
    duration_seconds,
    ROUND(duration_seconds / 60.0, 2) as duration_minutes,
    city,
    state,
    country,
    start_time,
    end_time
FROM calls
WHERE status = 'completed' AND duration_seconds IS NOT NULL
ORDER BY duration_seconds DESC
LIMIT 10;

-- View for most calls by caller
DROP VIEW IF EXISTS most_calls;
CREATE VIEW most_calls AS
SELECT
    from_number_hash,
    MAX(from_number_display) as from_number_display,
    COUNT(*) as total_calls,
    MAX(city) as city,
    MAX(state) as state,
    MAX(country) as country,
    SUM(duration_seconds) as total_duration_seconds,
    ROUND(SUM(duration_seconds) / 60.0, 2) as total_duration_minutes,
    ROUND(AVG(duration_seconds), 2) as avg_duration_seconds
FROM calls
WHERE status = 'completed'
GROUP BY from_number_hash
ORDER BY total_calls DESC;

-- View for most total time on hold
DROP VIEW IF EXISTS most_time_overall;
CREATE VIEW most_time_overall AS
SELECT
    from_number_hash,
    MAX(from_number_display) as from_number_display,
    COUNT(*) as total_calls,
    SUM(duration_seconds) as total_duration_seconds,
    ROUND(SUM(duration_seconds) / 60.0, 2) as total_duration_minutes,
    ROUND(SUM(duration_seconds) / 3600.0, 2) as total_duration_hours,
    ROUND(AVG(duration_seconds), 2) as avg_duration_seconds,
    MAX(city) as city,
    MAX(state) as state,
    MAX(country) as country
FROM calls
WHERE status = 'completed' AND duration_seconds IS NOT NULL
GROUP BY from_number_hash
ORDER BY total_duration_seconds DESC;

-- View for geographic statistics
DROP VIEW IF EXISTS geographic_stats;
CREATE VIEW geographic_stats AS
SELECT
    country,
    state,
    city,
    COUNT(*) as total_calls,
    SUM(duration_seconds) as total_duration_seconds,
    ROUND(AVG(duration_seconds), 2) as avg_duration_seconds,
    COUNT(DISTINCT from_number_hash) as unique_callers
FROM calls
WHERE status = 'completed'
GROUP BY country, state, city
ORDER BY total_calls DESC;