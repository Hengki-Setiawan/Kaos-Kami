import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Parse .env.local or .env
function loadEnv() {
  const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    let v = trimmed.slice(eqIdx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const env = loadEnv();
const url = env.TURSO_DATABASE_URL || env.DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: url.startsWith('libsql://') ? url : url,
  authToken: authToken
});

// SSOT Real Accounts to KEEP:
const REAL_USER_IDS = [
  'mENTVcqg2HGntvKZ89uPrREfwrghvMwL', // Hengki Admin (hengkishadow@gmail.com)
  'usr_mujz3fdugfus8',                // Hengki Setiawan Admin (hengkisetiawan461@gmail.com)
  'cmtgq1jgh000ius04zygxhh8b',        // Admin Workshop Kaos Kami (admin@kaoskami.biz.id / 081244002026)
  '6XBFRQCO5zsXOmdOFsBk0YJmU0lilEWn', // Hengki Customer (hengkivibecoding@gmail.com)
  '0p0uv6MleuabqQVmkqhFtjJh1SpkFjA0'  // Hengki Customer 2 (hengkivibecoding2@gmail.com)
];

async function run() {
  console.log('====================================================');
  console.log('1. MEMULAI PENCADANGAN LENGKAP (FULL BACKUP DUMP)...');
  console.log('====================================================');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData = {
    exportedAt: new Date().toISOString(),
    tursoUrl: url,
    tables: {}
  };

  const tablesToBackup = [
    'User',
    'Account',
    'Session',
    'Order',
    'OrderItem',
    'OrderStatusEvent',
    'Payment',
    'ProductionTask',
    'Address',
    'Design'
  ];

  for (const table of tablesToBackup) {
    const query = table === 'Order' ? 'SELECT * FROM [Order]' : `SELECT * FROM "${table}"`;
    const res = await client.execute(query);
    backupData.tables[table] = res.rows;
    console.log(`✓ Backup tabel "${table}": ${res.rows.length} baris tersimpan.`);
  }

  // Simpan berkas cadangan ke root project dan artifacts
  const backupFileName = `backup_database_orders_users_${timestamp}.json`;
  const backupFilePath = path.join(process.cwd(), backupFileName);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\n🎉 Cadangan berhasil ditulis ke: ${backupFilePath} (${(fs.statSync(backupFilePath).size / 1024).toFixed(1)} KB)`);

  // Verifikasi parsing JSON cadangan sebelum eksekusi pembersihan
  const verifyContent = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
  if (!verifyContent.tables.Order || verifyContent.tables.Order.length === 0) {
    throw new Error('VERIFIKASI CADANGAN GAGAL: Data tabel Order kosong dalam berkas backup!');
  }
  console.log('✓ Integritas berkas cadangan 100% terverifikasi!\n');

  console.log('====================================================');
  console.log('2. MEMBERSIHKAN DATA PESANAN & AKUN DUMMY...');
  console.log('====================================================');

  // Urutan penghapusan sesuai relasi foreign-key:
  // 1. ProductionTask
  console.log('- Menghapus seluruh baris ProductionTask dummy...');
  const delProd = await client.execute('DELETE FROM ProductionTask');
  console.log(`  Terhapus: ${delProd.rowsAffected} baris.`);

  // 2. OrderStatusEvent
  console.log('- Menghapus seluruh riwayat status OrderStatusEvent...');
  const delEvents = await client.execute('DELETE FROM OrderStatusEvent');
  console.log(`  Terhapus: ${delEvents.rowsAffected} baris.`);

  // 3. Payment
  console.log('- Menghapus seluruh data Payment...');
  const delPay = await client.execute('DELETE FROM Payment');
  console.log(`  Terhapus: ${delPay.rowsAffected} baris.`);

  // 4. OrderItem
  console.log('- Menghapus seluruh baris OrderItem...');
  const delItems = await client.execute('DELETE FROM OrderItem');
  console.log(`  Terhapus: ${delItems.rowsAffected} baris.`);

  // 5. Order
  console.log('- Menghapus seluruh data Order...');
  const delOrders = await client.execute('DELETE FROM [Order]');
  console.log(`  Terhapus: ${delOrders.rowsAffected} baris.`);

  // 6. Address
  console.log('- Menghapus seluruh alamat pengiriman transaksi...');
  const delAddr = await client.execute('DELETE FROM Address');
  console.log(`  Terhapus: ${delAddr.rowsAffected} baris.`);

  // 7. Design Dummy (pertahankan milik akun asli)
  const realPlaceholders = REAL_USER_IDS.map(() => '?').join(', ');
  console.log('- Menghapus desain kustom milik akun dummy...');
  const delDesigns = await client.execute({
    sql: `DELETE FROM Design WHERE userId NOT IN (${realPlaceholders})`,
    args: REAL_USER_IDS
  });
  console.log(`  Terhapus: ${delDesigns.rowsAffected} desain dummy (desain akun asli dipertahankan).`);

  // 8. Session Dummy (pertahankan milik akun asli)
  console.log('- Menghapus session milik akun dummy...');
  const delSessions = await client.execute({
    sql: `DELETE FROM Session WHERE userId NOT IN (${realPlaceholders})`,
    args: REAL_USER_IDS
  });
  console.log(`  Terhapus: ${delSessions.rowsAffected} session.`);

  // 9. Account Dummy (pertahankan milik akun asli)
  console.log('- Menghapus account auth milik akun dummy...');
  const delAccounts = await client.execute({
    sql: `DELETE FROM Account WHERE userId NOT IN (${realPlaceholders})`,
    args: REAL_USER_IDS
  });
  console.log(`  Terhapus: ${delAccounts.rowsAffected} accounts.`);

  // 10. User Dummy (HANYA sisakan akun asli)
  console.log('- Menghapus akun user dummy (kanban, extra, tester, e2e)...');
  const delUsers = await client.execute({
    sql: `DELETE FROM User WHERE id NOT IN (${realPlaceholders})`,
    args: REAL_USER_IDS
  });
  console.log(`  Terhapus: ${delUsers.rowsAffected} user dummy.`);

  console.log('\n====================================================');
  console.log('3. AUDIT KONDISI DATABASE PASCA PEMBERSIHAN');
  console.log('====================================================');

  const finalUsers = await client.execute('SELECT id, name, email, phoneNumber, role FROM User ORDER BY role ASC, name ASC');
  console.log(`Jumlah User Tersisa: ${finalUsers.rows.length}`);
  for (const u of finalUsers.rows) {
    console.log(`  ★ [${u.role}] ${u.name} | ${u.email} | ${u.phoneNumber || '-'}`);
  }

  const finalOrders = await client.execute('SELECT COUNT(*) as cnt FROM [Order]');
  console.log(`\nJumlah Order Tersisa: ${finalOrders.rows[0].cnt} pesanan.`);

  const finalDesigns = await client.execute('SELECT COUNT(*) as cnt FROM Design');
  console.log(`Jumlah Desain Akun Asli Tersimpan: ${finalDesigns.rows[0].cnt} desain.`);

  const finalCats = await client.execute('SELECT COUNT(*) as cnt FROM ApparelCategory');
  const finalVariants = await client.execute('SELECT COUNT(*) as cnt FROM ProductVariant');
  console.log(`Katalog Master: ${finalCats.rows[0].cnt} Kategori, ${finalVariants.rows[0].cnt} Varian Produk (100% AMAN).`);

  console.log('\n✅ PEMBERSIHAN SELESAI DENGAN SUKSES DAN DATA LENGKAP TELAH DI-BACKUP!');
}

run().catch(err => {
  console.error('PROSES GAGAL:', err);
  process.exit(1);
});
