import { createClient } from "@libsql/client/web";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log("=== Testing Phone Verification State in Database ===");
  
  // 1. Check user before
  const user1 = await c.execute({
    sql: "SELECT id, email, phoneNumber, phoneVerified FROM User WHERE email = ?",
    args: ["hengkivibecoding@gmail.com"]
  });
  console.log("Initial state:", user1.rows[0]);

  // 2. Mark phone verified
  await c.execute({
    sql: "UPDATE User SET phoneVerified = 1 WHERE email = ?",
    args: ["hengkivibecoding@gmail.com"]
  });

  const user2 = await c.execute({
    sql: "SELECT id, email, phoneNumber, phoneVerified FROM User WHERE email = ?",
    args: ["hengkivibecoding@gmail.com"]
  });
  console.log("After phone verification:", user2.rows[0]);
  if (user2.rows[0].phoneVerified === 1) {
    console.log("SUCCESS: phoneVerified is correctly set to 1 (true)!");
  } else {
    console.error("FAILURE: phoneVerified was not updated");
  }
}

main().catch(console.error);
