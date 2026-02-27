require('dotenv').config();

const { neon } = require('@neondatabase/serverless');
const fs = require('fs').promises;

async function runReset() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    return;
  }

  console.log('Connecting to database...');
  const sql = neon(connectionString);

  try {
    // Baca file SQL
    const sqlContent = await fs.readFile('./reset-db.sql', 'utf8');
    console.log('Executing reset script...');

    // Split statements respecting dollar-quoted strings ($$...$$)
    const statements = [];
    let current = '';
    let inDollarQuote = false;

    for (let i = 0; i < sqlContent.length; i++) {
      const char = sqlContent[i];
      const nextChar = sqlContent[i + 1];

      if (!inDollarQuote && char === '$' && nextChar === '$') {
        inDollarQuote = true;
        current += '$$';
        i++; // skip next $
      } else if (inDollarQuote && char === '$' && nextChar === '$') {
        inDollarQuote = false;
        current += '$$';
        i++; // skip next $
      } else if (!inDollarQuote && char === ';') {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    // Add final statement if exists
    if (current.trim()) {
      statements.push(current.trim());
    }

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        console.log(`Executing: ${stmt.substring(0, 50)}...`);
        await sql(stmt);
      }
    }

    console.log('✅ Database reset completed!');

    // Verifikasi
    const result = await sql('SELECT COUNT(*) as count FROM phone_numbers');
    console.log('phone_numbers count:', result[0].count);

    const result2 = await sql('SELECT COUNT(*) as count FROM usage_history');
    console.log('usage_history count:', result2[0].count);

    const result3 = await sql('SELECT COUNT(*) as count FROM users');
    console.log('users count:', result3[0].count);
  } catch (error) {
    console.error('❌ Error during reset:', error);
  } finally {
    // Tidak perlu close karena neon serverless
  }
}

runReset();
