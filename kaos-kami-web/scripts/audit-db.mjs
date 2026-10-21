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

console.log('Connecting to Turso DB:', url ? url.slice(0, 25) + '...' : 'UNDEFINED');

const client = createClient({
  url: url.startsWith('libsql://') ? url : url,
  authToken: authToken
});

async function run() {
  // 1. List all users
  console.log('\n--- SENSUS USERS ---');
  const usersRes = await client.execute('SELECT id, name, email, phoneNumber, role, createdAt FROM User ORDER BY createdAt DESC');
  console.log(`Found ${usersRes.rows.length} users:`);
  for (const u of usersRes.rows) {
    console.log(`- ID: ${u.id} | Name: "${u.name}" | Email: "${u.email}" | Phone: "${u.phoneNumber}" | Role: ${u.role}`);
  }

  // 2. Count orders
  console.log('\n--- SENSUS ORDERS ---');
  const ordersCountRes = await client.execute('SELECT COUNT(*) as cnt FROM "Order"');
  console.log(`Total Orders: ${ordersCountRes.rows[0].cnt}`);

  const ordersSample = await client.execute('SELECT id, orderNumber, userId, status, totalIdr, createdAt FROM "Order" ORDER BY createdAt DESC LIMIT 10');
  console.log('Latest 10 orders:');
  for (const o of ordersSample.rows) {
    console.log(`- Order: ${o.orderNumber} | UserID: ${o.userId} | Status: ${o.status} | Total: ${o.totalIdr} | Date: ${o.createdAt}`);
  }

  // 3. Table row counts
  console.log('\n--- TABEL LAINNYA ---');
  const tables = ['OrderItem', 'OrderStatusEvent', 'Payment', 'ProductionTask', 'Address', 'Design', 'Session', 'Account', 'Notification', 'ChatMessage'];
  for (const t of tables) {
    try {
      const res = await client.execute(`SELECT COUNT(*) as cnt FROM "${t}"`);
      console.log(`- ${t}: ${res.rows[0].cnt} rows`);
    } catch (e) {
      console.log(`- ${t}: Error (${e.message})`);
    }
  }
}

run().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
