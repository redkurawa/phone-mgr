require('dotenv').config();

const { neon } = require('@neondatabase/serverless');

/**
 * Script untuk cek history nomor telepon tertentu
 * Usage: node check-phone-history.js "02150842750"
 */

async function checkPhoneHistory() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    return;
  }

  const phoneNumber = process.argv[2];

  if (!phoneNumber) {
    console.log('Usage: node check-phone-history.js "PHONE_NUMBER"');
    console.log('Contoh: node check-phone-history.js "02150842750"');
    return;
  }

  const sql = neon(connectionString);

  try {
    console.log('========================================');
    console.log('Cek History untuk Nomor:', phoneNumber);
    console.log('========================================\n');

    // Cari phone number
    const phones = await sql`
      SELECT * FROM phone_numbers WHERE number = ${phoneNumber}
    `;

    if (phones.length === 0) {
      console.log('❌ Nomor tidak ditemukan di database');
      return;
    }

    const phone = phones[0];
    console.log('📱 Info Nomor:');
    console.log('   ID:', phone.id);
    console.log('   Nomor:', phone.number);
    console.log('   Status:', phone.current_status);
    console.log('   Client:', phone.current_client || '-');
    console.log('   Updated:', phone.updated_at);
    console.log();

    // Cari semua history untuk nomor ini
    const histories = await sql`
      SELECT uh.*, pn.number
      FROM usage_history uh
      JOIN phone_numbers pn ON uh.phone_id = pn.id
      WHERE pn.number = ${phoneNumber}
      ORDER BY uh.event_date DESC
    `;

    if (histories.length === 0) {
      console.log('📋 Tidak ada history untuk nomor ini');
      return;
    }

    console.log(`📋 History (${histories.length} records):`);
    console.log('----------------------------------------');
    histories.forEach((h, i) => {
      console.log(`${i + 1}. Event: ${h.event_type}`);
      console.log('   Client Name:', h.client_name || '-');
      console.log(
        '   Event Date:',
        new Date(h.event_date).toLocaleDateString()
      );
      console.log('   Notes:', h.notes || '-');
      console.log('----------------------------------------');
    });

    // Cek client names yang unik
    const uniqueClients = [
      ...new Set(histories.map((h) => h.client_name).filter(Boolean)),
    ];
    console.log('\n👥 Client names di history:');
    uniqueClients.forEach((c) => console.log('   - "' + c + '"'));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPhoneHistory();
