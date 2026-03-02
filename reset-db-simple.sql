DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS phone_events CASCADE;
DROP TABLE IF EXISTS phone_inventory CASCADE;

DROP TABLE IF EXISTS usage_history CASCADE;
DROP TABLE IF EXISTS phone_numbers CASCADE;

DROP TYPE IF EXISTS phone_event_type CASCADE;
DROP TYPE IF EXISTS phone_status CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS status CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE phone_status AS ENUM ('KOSONG', 'PAKAI');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE phone_event_type AS ENUM (
    'ACTIVATION',
    'ASSIGNED',
    'DEASSIGNED',
    'REASSIGNED',
    'EDITED',
    'DELETED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE phone_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  block_key TEXT NOT NULL,
  status phone_status NOT NULL DEFAULT 'KOSONG',
  current_client_name TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE phone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phone_inventory(id) ON DELETE CASCADE,
  event_type phone_event_type NOT NULL,
  client_name TEXT,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id UUID,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_user_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phone_inventory_block ON phone_inventory(block_key);
CREATE INDEX idx_phone_inventory_status ON phone_inventory(status);
CREATE INDEX idx_phone_inventory_number ON phone_inventory(phone_number);
CREATE INDEX idx_phone_inventory_client ON phone_inventory(current_client_name);
CREATE INDEX idx_phone_events_phone ON phone_events(phone_id, event_at DESC);
CREATE INDEX idx_phone_events_type ON phone_events(event_type);
CREATE INDEX idx_phone_events_client ON phone_events(client_name);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
