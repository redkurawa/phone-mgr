-- Simple reset: drop and recreate tables only
DROP TABLE IF EXISTS usage_history CASCADE;
DROP TABLE IF EXISTS phone_numbers CASCADE;

-- Recreate tables (enums assumed to exist from schema.sql)
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number TEXT NOT NULL UNIQUE,
    current_status status NOT NULL DEFAULT 'KOSONG',
    current_client TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_id UUID NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    event_type event_type NOT NULL,
    client_name TEXT,
    event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    notes TEXT
);

-- Create indexes
CREATE INDEX idx_phone_numbers_status ON phone_numbers(current_status);
CREATE INDEX idx_phone_numbers_client ON phone_numbers(current_client);
CREATE INDEX idx_usage_history_phone_id ON usage_history(phone_id);
CREATE INDEX idx_usage_history_event_type ON usage_history(event_type);

-- Verify
SELECT 'phone_numbers' as table, COUNT(*) as count FROM phone_numbers UNION ALL
SELECT 'usage_history', COUNT(*) FROM usage_history;