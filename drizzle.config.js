/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: './lib/db.ts',
  out: './drizzle',
  dialect: 'postgresql',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || '',
  },
}
