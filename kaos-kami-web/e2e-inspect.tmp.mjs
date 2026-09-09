import fs from "node:fs";
import { createClient } from "@libsql/client";
const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const oid = "EfxbmBGl6oHrYxalbpU5N";
for (const t of ["ProductionTask", "OrderItem", "OrderStatusEvent", "Payment", "Order"]) {
  const key = t === "Order" ? '"id"' : '"orderId"';
  const r = await db.execute({ sql: `SELECT COUNT(*) AS n FROM "${t}" WHERE ${key} = ?`, args: [oid] });
  console.log(t, JSON.stringify(r.rows[0]));
}
const u = await db.execute({ sql: 'SELECT "id","phoneNumber" FROM "User" WHERE "phoneNumber" = ?', args: ["081200000001"] });
console.log("qa_users", JSON.stringify(u.rows));
for (const urow of u.rows) {
  const uid = urow.id;
  for (const t of ["Address", "Cart", "Design", "Session", "Account"]) {
    try {
      const col = t === "Address" || t === "Cart" || t === "Design" ? '"userId"' : '"userId"';
      const r = await db.execute({ sql: `SELECT "id" FROM "${t}" WHERE ${col} = ? LIMIT 5`, args: [uid] });
      if (r.rows.length) console.log(`${t} of user:`, JSON.stringify(r.rows));
    } catch (e) { console.log(t, "ERR", e.message.slice(0, 80)); }
  }
}
