-- Performance indexes for phone number queries
-- Run this SQL to add indexes for faster queries

-- Index on phone number for prefix searches
CREATE INDEX IF NOT EXISTS idx_phone_numbers_number 
ON phone_numbers (number);

-- Index on phone number status
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status 
ON phone_numbers (current_status);

-- Index on usage_history phone_id for joins
CREATE INDEX IF NOT EXISTS idx_usage_history_phone_id 
ON usage_history (phone_id);

-- Index on usage_history event_type for filtering
CREATE INDEX IF NOT EXISTS idx_usage_history_event_type 
ON usage_history (event_type);

-- Index on usage_history event_date for sorting
CREATE INDEX IF NOT EXISTS idx_usage_history_event_date 
ON usage_history (event_date);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_usage_history_phone_event 
ON usage_history (phone_id, event_type);
