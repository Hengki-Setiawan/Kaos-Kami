import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client/http";

export default {
  async fetch(req, env) {
    try {
      const url = env.TURSO_DATABASE_URL;
      const authToken = env.TURSO_AUTH_TOKEN;
      const client = createClient({ url, authToken });
      const adapter = new PrismaLibSQL(client);
      const prisma = new PrismaClient({ adapter });
      const n = await prisma.apparelCategory.count();
      return Response.json({ ok: true, count: n });
    } catch (e) {
      return Response.json(
        { ok: false, message: e?.message, stack: String(e?.stack || "").slice(0, 2000) },
        { status: 500 }
      );
    }
  },
};
