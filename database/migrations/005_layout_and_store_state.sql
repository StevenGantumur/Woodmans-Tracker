-- REAL STORE LAYOUT
-- Replaces the abstract 8x3 grid with the actual lot: 21 return corrals where
-- shoppers leave carts, and 2 supply corrals at the storefront where they take
-- them. Coordinates are in feet (see shared/layout.json) so route distances
-- come back in a unit that means something to a worker.

ALTER TABLE corrals ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'return';
ALTER TABLE corrals ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Supply corrals are urgent when EMPTY, return corrals when FULL, so the two
-- cannot share a single threshold.
ALTER TABLE corrals ADD CONSTRAINT corrals_type_check
    CHECK (type IN ('return', 'supply'));

-- STORE STATE
-- Single-row table holding counts that belong to the store rather than to any
-- one corral. The CHECK on id keeps it to exactly one row.
CREATE TABLE IF NOT EXISTS store_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    carts_in_building INTEGER NOT NULL DEFAULT 0,
    fleet_size INTEGER NOT NULL DEFAULT 600,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT store_state_single_row CHECK (id = 1)
);

INSERT INTO store_state (id, carts_in_building) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Coordinates and types are applied by scripts/syncLayout.js from
-- shared/layout.json, which the frontend map also reads, so the picture and
-- the optimizer can never disagree about where a corral is.
