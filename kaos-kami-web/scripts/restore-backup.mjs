#!/usr/bin/env node
/**
 * Restore drill untuk backup Kaos Kami.
 *
 * Mendukung DUA format:
 *   1. Split (format baru): folder berisi `schema.sql`, `<tabel>.part-NNN.sql`,
 *      dan `manifest.json`.
 *   2. Single dump (format lama): satu file `backups/kaos-kami-YYYY....sql`.
 *
 * Pakai:
 *   node scripts/restore-backup.mjs --dir ./tmp/backup-202610241200 --out ./tmp/restore.db
 *   node scripts/restore-backup.mjs --file ./tmp/kaos-kami-202610240703.sql --out ./tmp/restore.db
 *
 * Script MENOLAK menimpa file output yang sudah ada kecuali `--force`.
 *
 * PENTING: dump lama berisi `BEGIN TRANSACTION;` + tabel alfabetis. Dengan
 * foreign_keys=ON, INSERT ke child table (Account/Address/...) gagal
 * `no such table: main.User` karena parent-nya belum dibuat. Karena itu FK
 * WAJIB dimatikan SEBELUM dump dijalankan, lalu dinyalakan lagi dan
 * divalidasi dengan `PRAGMA foreign_key_check`.
 */
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const dirArg = arg("dir");
const fileArg = arg("file");
const out = path.resolve(arg("out"));
const force = process.argv.includes("--force");

if ((!dirArg && !fileArg) || !arg("out") || (dirArg && fileArg)) {
  console.error(
    "Usage: node scripts/restore-backup.mjs --dir <backup-folder> --out <target.db> [--force]\n" +
      "   atau: node scripts/restore-backup.mjs --file <single-dump.sql> --out <target.db> [--force]"
  );
  process.exit(2);
}

const target = path.resolve(fileArg || dirArg);
if (!fs.existsSync(target)) {
  console.error(`Backup tidak ada: ${target}`);
  process.exit(2);
}
if (fs.existsSync(out) && !force) {
  console.error(`Target sudah ada: ${out}\nPakai --force hanya bila yakin ingin menimpanya.`);
  process.exit(2);
}
if (fs.existsSync(out) && force) fs.rmSync(out);

const readText = (p) => fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");

let mode = "single";
let backupDir = null;
let singleSqlPath = null;
let manifest = null;

const stat = fs.statSync(target);
if (stat.isFile()) {
  if (!target.toLowerCase().endsWith(".sql")) {
    console.error(`File backup harus .sql: ${target}`);
    process.exit(2);
  }
  singleSqlPath = target;
} else if (stat.isDirectory()) {
  backupDir = target;
  const manifestPath = path.join(target, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    mode = "split";
    manifest = JSON.parse(readText(manifestPath));
    if (!manifest?.ok || manifest.format !== "kaos-kami-sql-parts-v1") {
      console.error("Manifest bukan backup split yang valid.");
      process.exit(2);
    }
  } else {
    // Folder tanpa manifest TAPI berisi schema.sql = backup split terpotong,
    // jangan diam-diam dianggap single dump.
    if (fs.existsSync(path.join(target, "schema.sql"))) {
      console.error(`manifest.json tidak ada di ${target}. Backup split tidak lengkap.`);
      process.exit(2);
    }
    const sqlFiles = fs
      .readdirSync(target)
      .filter((f) => f.toLowerCase().endsWith(".sql"));
    if (sqlFiles.length !== 1) {
      console.error(
        `manifest.json tidak ada dan file .sql di folder harus tepat 1 (ditemukan ${sqlFiles.length}).`
      );
      process.exit(2);
    }
    singleSqlPath = path.join(target, sqlFiles[0]);
  }
} else {
  console.error(`Bukan file/folder backup: ${target}`);
  process.exit(2);
}

const client = createClient({ url: `file:${out.replace(/\\/g, "/")}` });
try {
  // WAJIB sebelum schema/dump: tabel di-backup urut alfabet, bukan urutan
  // dependensi. FK dinyalakan lagi setelah semua baris masuk.
  await client.execute("PRAGMA foreign_keys=OFF");

  let restoredRows = 0;
  let tableCount = 0;

  if (mode === "split") {
    const schemaPath = path.join(backupDir, path.basename(manifest.schemaKey || "schema.sql"));
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql tidak ada: ${schemaPath}`);
    }
    await client.executeMultiple(readText(schemaPath));
    // schema.sql dari cron/backup berakhir dengan `PRAGMA foreign_keys=ON;`.
    // Matikan LAGI sebelum parts — kalau tidak, INSERT child table ditolak.
    await client.execute("PRAGMA foreign_keys=OFF");
    for (const table of manifest.tables || []) {
      for (const part of table.parts || []) {
        const partPath = path.join(backupDir, path.basename(part));
        if (!fs.existsSync(partPath)) {
          throw new Error(`Part hilang: ${partPath}`);
        }
        await client.executeMultiple(readText(partPath));
      }
    }
    tableCount = (manifest.tables || []).length;
  } else {
    const sql = readText(singleSqlPath);
    if (!sql.trim()) throw new Error(`Dump kosong: ${singleSqlPath}`);
    // Dump lama selalu dibungkus BEGIN/COMMIT. Tanpa COMMIT di akhir, file
    // kemungkinan terpotong (upload/memory Worker habis) — jangan restore.
    if (!/\bBEGIN TRANSACTION\s*;/i.test(sql) || !/\bCOMMIT\s*;\s*$/i.test(sql)) {
      throw new Error(`Dump single tidak lengkap (BEGIN/COMMIT tidak utuh): ${singleSqlPath}`);
    }
    await client.executeMultiple(sql);
  }

  await client.execute("PRAGMA foreign_keys=ON");

  // Integritas fisik + referensial: backup yang "jumlah baris cocok" tapi
  // rusak/orphan tetap TIDAK layak dipakai restore produksi.
  const integrity = await client.execute("PRAGMA integrity_check");
  const integrityValue = String(integrity.rows?.[0]?.integrity_check ?? "");
  if (integrityValue.toLowerCase() !== "ok") {
    console.error(`integrity_check gagal: ${integrityValue || "(kosong)"}`);
    process.exit(1);
  }
  const fkCheck = await client.execute("PRAGMA foreign_key_check");
  if ((fkCheck.rows?.length || 0) > 0) {
    console.error(`foreign_key_check menemukan ${fkCheck.rows.length} baris orphan.`);
    for (const row of fkCheck.rows.slice(0, 10)) console.error("  -", row);
    process.exit(1);
  }

  if (mode === "split") {
    const mismatches = [];
    for (const table of manifest.tables || []) {
      const safe = String(table.name).replace(/"/g, '""');
      const res = await client.execute(`SELECT COUNT(*) AS c FROM "${safe}"`);
      const actual = Number(res.rows?.[0]?.c ?? 0);
      restoredRows += actual;
      if (actual !== Number(table.rows ?? 0)) {
        mismatches.push({ table: table.name, expected: table.rows, actual });
      }
    }
    if (mismatches.length > 0) {
      console.error("Restore selesai TAPI jumlah baris tidak cocok:");
      for (const m of mismatches) console.error(`  - ${m.table}: manifest=${m.expected}, aktual=${m.actual}`);
      process.exit(1);
    }
  } else {
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    tableCount = tables.rows.length;
    for (const row of tables.rows) {
      const safe = String(row.name).replace(/"/g, '""');
      const res = await client.execute(`SELECT COUNT(*) AS c FROM "${safe}"`);
      restoredRows += Number(res.rows?.[0]?.c ?? 0);
    }
  }

  console.log(`OK restore (${mode}): ${tableCount} tabel, ${restoredRows} baris → ${out}`);
} catch (e) {
  console.error("ERR restore:", e?.message || e);
  process.exitCode = 1;
} finally {
  client.close();
}
