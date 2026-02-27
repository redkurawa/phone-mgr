require('dotenv').config();

const { neon } = require('@neondatabase/serverless');

/**
 * Script untuk update bulk history assignment
 * Usage: node update-history-bulk.js "CLIENT_NAME" "YYYY-MM-DD"
 * Contoh: node update-history-bulk.js "MCC" "2018-08-14"
 *         node update-history-bulk.js "MARUBENI" "2018-08-14"
 *
 * Atau update multiple clients sekaligus:
 * node update-history-bulk.js "MCC,MARUBENI" "2018-08-14"
 */

async function updateHistory() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    return;
  }

  // Get arguments
  const clientNames = process.argv[2];
  const dateStr = process.argv[3];

  if (!clientNames || !dateStr) {
    console.log(
      'Usage: node update-history-bulk.js "CLIENT_NAME" "YYYY-MM-DD"'
    );
    console.log('Contoh:');
    console.log('  node update-history-bulk.js "MCC" "2018-08-14"');
    console.log('  node update-history-bulk.js "MARUBENI" "2018-08-14"');
    console.log('  node update-history-bulk.js "MCC,MARUBENI" "2018-08-14"');
    return;
  }

  const sql = neon(connectionString);

  try {
    // Parse multiple clients (comma separated)
    const clients = clientNames.split(',').map((c) => c.trim());
    const targetDate = new Date(dateStr);

    console.log('========================================');
    console.log('Update History Bulk');
    console.log('========================================');
    console.log('Clients:', clients.join(', '));
    console.log('Target Date:', dateStr);
    console.log('========================================\n');

    for (const clientName of clients) {
      console.log(`\nProcessing client: ${clientName}`);

      // Find all history records for this client
      const histories = await sql`
        SELECT uh.id, uh.event_date, uh.client_name, pn.number
        FROM usage_history uh
        JOIN phone_numbers pn ON uh.phone_id = pn.id
        WHERE uh.client_name ILIKE ${clientName}
        ORDER BY uh.event_date DESC
      `;

      if (histories.length === 0) {
        console.log(`  ⚠️  No history found for "${clientName}"`);
        continue;
      }

      console.log(`  Found ${histories.length} history records`);

      // Show current data
      console.log('  Current data:');
      histories.forEach((h) => {
        console.log(
          `    - ${h.number}: ${new Date(h.event_date).toLocaleDateString()} (${h.client_name})`
        );
      });

      // Update all history records for this client
      const result = await sql`
        UPDATE usage_history
        SET event_date = ${targetDate}
        WHERE client_name ILIKE ${clientName}
        RETURNING id
      `;

      console.log(`  ✅ Updated ${result.length} records to ${dateStr}`);
    }

    console.log('\n========================================');
    console.log('Update completed!');
    console.log('========================================');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateHistory();
