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
    const sqlContent = await fs.readFile('./reset-db.sql', 'utf8');
    console.log('Executing reset script...');

    const statements = [];
    let current = '';
    let inDollarQuote = false;

    for (let i = 0; i < sqlContent.length; i += 1) {
      const char = sqlContent[i];
      const nextChar = sqlContent[i + 1];

      if (!inDollarQuote && char === '$' && nextChar === '$') {
        inDollarQuote = true;
        current += '$$';
        i += 1;
      } else if (inDollarQuote && char === '$' && nextChar === '$') {
        inDollarQuote = false;
        current += '$$';
        i += 1;
      } else if (!inDollarQuote && char === ';') {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      statements.push(current.trim());
    }

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 60)}...`);
      await sql(statement);
    }

    console.log('Database reset completed.');

    const inventory = await sql('SELECT COUNT(*) AS count FROM phone_inventory');
    console.log('phone_inventory count:', inventory[0].count);

    const events = await sql('SELECT COUNT(*) AS count FROM phone_events');
    console.log('phone_events count:', events[0].count);

    const users = await sql('SELECT COUNT(*) AS count FROM app_users');
    console.log('app_users count:', users[0].count);
  } catch (error) {
    console.error('Error during reset:', error);
  }
}

runReset();
