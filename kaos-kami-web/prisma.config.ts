import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Folder prisma/migrations DIBERSIHKAN 23 Okt 2026 (keputusan owner #8=A):
    // 0001_init tersimpan UTF-16LE + isinya stale/drift. Baseline UTF-8 yang
    // mencerminkan DB aktual ada di prisma/baseline-schema.sql.
    // CATATAN: prisma migrate/db push TIDAK bisa konek ke libsql:// (P1013) —
    // prosedur tulis skema prod ada di RUNBOOK §5. Path dipertahankan agar
    // `prisma db seed` tetap jalan.
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
