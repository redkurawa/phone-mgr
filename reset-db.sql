-- Reset database: drop tables and recreate
DROP TABLE IF EXISTS usage_history CASCADE;
DROP TABLE IF EXISTS phone_numbers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Recreate enums (if needed)
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

DO $$ BEGIN
    CREATE TYPE role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Recreate tables
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

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image VARCHAR(500),
    role role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_phone_numbers_status ON phone_numbers(current_status);
CREATE INDEX idx_phone_numbers_client ON phone_numbers(current_client);
CREATE INDEX idx_usage_history_phone_id ON usage_history(phone_id);
CREATE INDEX idx_usage_history_event_type ON usage_history(event_type);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Verify
SELECT COUNT(*) FROM phone_numbers;
SELECT COUNT(*) FROM usage_history;
SELECT COUNT(*) FROM users;