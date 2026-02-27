require('dotenv').config();

const { neon } = require('@neondatabase/serverless');

/**
 * Script untuk update phone_numbers.updated_at sesuai dengan tanggal assignment di history
 * Usage: node update-phone-dates.js "CLIENT_NAME" "YYYY-MM-DD"
 * Contoh: node update-phone-dates.js "MCC" "2018-08-14"
 */

async function updatePhoneDates() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    return;
  }

  const clientNames = process.argv[2];
  const dateStr = process.argv[3];

  if (!clientNames || !dateStr) {
    console.log('Usage: node update-phone-dates.js "CLIENT_NAME" "YYYY-MM-DD"');
    console.log('Contoh:');
    console.log('  node update-phone-dates.js "MCC" "2018-08-14"');
    console.log('  node update-phone-dates.js "MARUBENI" "2018-08-14"');
    console.log('  node update-phone-dates.js "MCC,MARUBENI" "2018-08-14"');
    return;
  }

  const sql = neon(connectionString);

  try {
    const clients = clientNames.split(',').map((c) => c.trim());
    const targetDate = new Date(dateStr);

    console.log('========================================');
    console.log('Update Phone Numbers updated_at');
    console.log('========================================');
    console.log('Clients:', clients.join(', '));
    console.log('Target Date:', dateStr);
    console.log('========================================\n');

    for (const clientName of clients) {
      console.log(`\nProcessing client: ${clientName}`);

      // Find all phones for this client
      const phones = await sql`
        SELECT id, number, current_client, updated_at
        FROM phone_numbers
        WHERE current_client ILIKE ${clientName}
      `;

      if (phones.length === 0) {
        console.log(`  ⚠️  No phones found for "${clientName}"`);
        continue;
      }

      console.log(`  Found ${phones.length} phones`);

      // Show current data
      console.log('  Current data:');
      phones.forEach((p) => {
        console.log(
          `    - ${p.number}: ${new Date(p.updated_at).toLocaleDateString()}`
        );
      });

      // Update all phones for this client
      const result = await sql`
        UPDATE phone_numbers
        SET updated_at = ${targetDate}
        WHERE current_client ILIKE ${clientName}
        RETURNING id, number
      `;

      console.log(`  ✅ Updated ${result.length} phones to ${dateStr}`);
    }

    console.log('\n========================================');
    console.log('Update completed!');
    console.log('========================================');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updatePhoneDates();
