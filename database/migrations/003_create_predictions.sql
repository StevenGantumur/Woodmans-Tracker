-- CORRAL PREDICTIONS TABLE
-- This table stores predictions from the ML model.
-- Acts as a cache so we don't recalculate every time.

CREATE TABLE IF NOT EXISTS corral_predictions (
    -- Unique ID
    id SERIAL PRIMARY KEY,
    
    -- Which corral
    corral_id VARCHAR(50) NOT NULL,
    
    -- What hour is this prediction for (0-23)
    prediction_hour INTEGER NOT NULL,
    
    -- What day of week (0=Monday 6=Sunday)
    day_of_week INTEGER NOT NULL,
    
    -- How many carts predicted
    predicted_count FLOAT NOT NULL,
    
    -- How confident is model (0.0 to 1.0)
    confidence_score FLOAT,
    
    -- When was this prediction generated
    generated_at TIMESTAMP DEFAULT NOW(),
    
    -- Only one prediction per time constraint
    UNIQUE(corral_id, prediction_hour, day_of_week)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_predictions_lookup 
    ON corral_predictions(corral_id, day_of_week, prediction_hour);