-- Phone Number Management Database Schema
-- For Neon (PostgreSQL)

-- Create enums
DO $$ BEGIN
    CREATE TYPE status AS ENUM ('KOSONG', 'PAKAI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('ACTIVATION', 'ASSIGNED', 'DEASSIGNED', 'REASSIGNED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create phone_numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number TEXT NOT NULL UNIQUE,
    current_status status NOT NULL DEFAULT 'KOSONG',
    current_client TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create usage_history table
CREATE TABLE IF NOT EXISTS usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_id UUID NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    event_type event_type NOT NULL,
    client_name TEXT,
    event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON phone_numbers(current_status);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_client ON phone_numbers(current_client);
CREATE INDEX IF NOT EXISTS idx_usage_history_phone_id ON usage_history(phone_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_event_type ON usage_history(event_type);
