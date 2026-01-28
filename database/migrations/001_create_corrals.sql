-- CORRALS CURRENT STATE TABLE
-- This table stores the CURRENT state of each corral (live data).
-- Gets updated in real-time as cart counts change.

CREATE TABLE IF NOT EXISTS corrals (
    -- Unique corral identifier
    id VARCHAR(50) PRIMARY KEY,
    
    -- X coordinate
    x_coord FLOAT NOT NULL,
    
    -- Y coordinate
    y_coord FLOAT NOT NULL,
    
    -- Current cart count
    cart_count INTEGER NOT NULL DEFAULT 0,
    
    -- When was this corral last updated
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Status: 'active', 'maintenance', 'closed'
    status VARCHAR(20) DEFAULT 'active',
    
    -- When was this corral added to system
    created_at TIMESTAMP DEFAULT NOW()
);

-- Row 1 y = 0
INSERT INTO corrals (id, x_coord, y_coord, cart_count) VALUES
('A', 0, 0, 0),
('B', 1, 0, 0),
('C', 2, 0, 0),
('D', 3, 0, 0),
('E', 4, 0, 0),
('F', 5, 0, 0),
('G', 6, 0, 0),
('H', 7, 0, 0);

-- Row 2 y = 1
INSERT INTO corrals (id, x_coord, y_coord, cart_count) VALUES
('I', 0, 1, 0),
('J', 1, 1, 0),
('K', 2, 1, 0),
('L', 3, 1, 0),
('M', 4, 1, 0),
('N', 5, 1, 0),
('O', 6, 1, 0),
('P', 7, 1, 0);

-- Row 3 y = 2
INSERT INTO corrals (id, x_coord, y_coord, cart_count) VALUES
('Q', 0, 2, 0),
('R', 1, 2, 0),
('S', 2, 2, 0),
('T', 3, 2, 0),
('U', 4, 2, 0),
('V', 5, 2, 0),
('W', 6, 2, 0),
('X', 7, 2, 0);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_corral_status ON corrals(status);