import { createClient } from "@libsql/client/web";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  const custSessionRes = await c.execute({
    sql: "SELECT s.token, u.email FROM Session s JOIN User u ON s.userId = u.id WHERE u.email = ? ORDER BY s.createdAt DESC LIMIT 1",
    args: ["hengkivibecoding@gmail.com"]
  });
  const token = custSessionRes.rows[0].token;
  console.log("Testing token:", token);

  const res = await fetch("http://localhost:3000/api/auth/get-session", {
    headers: {
      "Cookie": `better-auth.session_token=${token}`,
      "Authorization": `Bearer ${token}`
    }
  });

  console.log("get-session status:", res.status);
  const data = await res.json();
  console.log("get-session response:", data);
}

main().catch(console.error);
