import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
console.log('DATABASE_URL:', connectionString);

if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function testConnection() {
  try {
    const sqlFn = neon(connectionString as string);
    const db = drizzle(sqlFn);

    console.log('Database connection created successfully');

    // Test query
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('Test query result:', result);

    console.log('Database connection test successful!');
  } catch (error) {
    console.error('Database connection test failed:', error);
  }
}

testConnection();
