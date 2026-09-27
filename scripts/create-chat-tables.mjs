import { createClient } from "@libsql/client/web";

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Creating ChatMessage and UserPresence tables in Turso...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ChatMessage (
      id TEXT PRIMARY KEY,
      senderId TEXT NOT NULL,
      senderName TEXT,
      senderRole TEXT NOT NULL DEFAULT 'CUSTOMER',
      receiverId TEXT,
      orderId TEXT,
      content TEXT NOT NULL,
      attachments TEXT,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_chat_sender ON ChatMessage(senderId);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_chat_receiver ON ChatMessage(receiverId);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_chat_created ON ChatMessage(createdAt);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_chat_order ON ChatMessage(orderId);`);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS UserPresence (
      userId TEXT PRIMARY KEY,
      userName TEXT,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      lastSeenAt TEXT NOT NULL,
      isOnline INTEGER NOT NULL DEFAULT 1,
      deviceInfo TEXT
    );
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_presence_role ON UserPresence(role);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_presence_lastSeen ON UserPresence(lastSeenAt);`);

  console.log("Tables ChatMessage and UserPresence created successfully!");

  const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  console.log("Updated tables list:", res.rows.map(r => r.name));
}

main().catch(console.error);
