const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function runMigration() {
    const sql = neon(process.env.DATABASE_URL);

    console.log('Creating users table...');

    // Create enums
    await sql`CREATE TYPE role AS ENUM ('admin', 'user')`;
    console.log('Created role enum');

    await sql`CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected')`;
    console.log('Created user_status enum');

    // Create users table
    await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      image VARCHAR(500),
      role role NOT NULL DEFAULT 'user',
      status user_status NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;
    console.log('Created users table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`;
    console.log('Created indexes');

    console.log('Migration completed successfully!');
}

runMigration().catch(console.error);
