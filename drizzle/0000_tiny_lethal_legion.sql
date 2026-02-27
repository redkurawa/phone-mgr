-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations

-- Create enum types
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
CREATE TABLE IF NOT EXISTS "phone_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"current_status" status DEFAULT 'KOSONG' NOT NULL,
	"current_client" text,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "phone_numbers_number_unique" UNIQUE("number")
);

-- Create usage_history table
CREATE TABLE IF NOT EXISTS "usage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_id" uuid NOT NULL,
	"event_type" event_type NOT NULL,
	"client_name" text,
	"event_date" timestamp with time zone DEFAULT NOW() NOT NULL,
	"notes" text
);

-- Create foreign key
DO $$ BEGIN
 ALTER TABLE "usage_history" ADD CONSTRAINT "usage_history_phone_id_fkey" FOREIGN KEY ("phone_id") REFERENCES "public"."phone_numbers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_phone_numbers_status" ON "phone_numbers" ("current_status");
CREATE INDEX IF NOT EXISTS "idx_phone_numbers_client" ON "phone_numbers" ("current_client");
CREATE INDEX IF NOT EXISTS "idx_usage_history_phone_id" ON "usage_history" ("phone_id");
CREATE INDEX IF NOT EXISTS "idx_usage_history_event_type" ON "usage_history" ("event_type");
