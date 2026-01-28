-- CORRAL SNAPSHOTS TABLE
-- This table will store historical data of cart counts over time (every 15 minutes)
-- ML model trains with historical data and so we need a snapshot of each timeframe

CREATE TABLE IF NOT EXISTS corral_snapshots (
    -- Unique ID for every snapshot
    id SERIAL PRIMARY KEY,
    
    -- States which corral with text up to 50 characters
    corral_id VARCHAR(50) NOT NULL,

    -- Count of carts in corral at current moment
    cart_count INTEGER NOT NULL,

    -- When??
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Day of week
    day_of_week INTEGER,

    -- Hour of the day
    hour INTEGER,

    -- Holiday? (insane ik so ambiguous)
    is_holiday BOOLEAN DEFAULT FALSE,

    -- Even the weather bruh (also same 50 characters max)
    weather_condition VARCHAR(50),

    -- When was this snapshot created?
    created_at TIMESTAMP DEFAULT NOW()
);