const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');

const connectionString = process.env.DATABASE_URL;
console.log('DATABASE_URL:', connectionString);

if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

try {
  const sql = neon(connectionString);
  const db = drizzle(sql);
  
  console.log('Database connection created successfully');
  
  // Test query - use raw SQL since we can't use Drizzle methods easily in JS
  const result = db.execute('SELECT 1 as test').catch(err => {
    console.error('Test query failed:', err);
  });
  
  console.log('Database connection test completed');
} catch (error) {
  console.error('Database connection test failed:', error);
}