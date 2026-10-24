#!/usr/bin/env node
/**
 * Kaos Kami — load-test harness (READ-ONLY, production-safe by default).
 *
 * Tujuan: smoke test beban ringan untuk localhost/staging TANPA dependency baru
 * (Node 22 ESM + fetch bawaan). BUKAN benchmark produksi.
 *
 * KESELAMATAN (default fail-closed):
 *   - Hanya GET. Tidak ada POST/PUT/PATCH/DELETE, tidak ada body, tidak ada
 *     cookie/Authorization/OTP/checkout/payment. `credentials: "omit"`.
 *   - Base URL non-loopback DITOLAK kecuali `--allow-remote` diberikan
 *     (disertai peringatan besar).
 *   - Redirect TIDAK diikuti (`redirect: "manual"`) supaya 3xx terlihat jujur.
 *   - Sampel error disanitasi: email/telepon/token/secret/session/cookie
 *     diredaksi sebelum dicetak (maks 200 karakter).
 *   - 429 dihitung sebagai "limited", bukan crash. Rate limiter aplikasi
 *     (mis. /api/health 10/menit/IP) akan muncul sebagai 429 — itu SINYAL,
 *     bukan kegagalan harness.
 *
 * Pakai:
 *   node scripts/load-test.mjs
 *   node scripts/load-test.mjs --base-url http://127.0.0.1:3001 --concurrency 3 --duration-sec 5
 *   node scripts/load-test.mjs --path /api/health --path /api/catalog/variants --json ./tmp/load.json
 *
 * Opsi:
 *   --base-url <url>        default http://localhost:3001
 *   --path <path>           repeatable; default /api/health /api/lookbook /api/cron/backup-status
 *   --concurrency <n>       default 5 (1..200) — total worker, dibagi round-robin ke semua path
 *   --duration-sec <n>      default 10 (1..3600)
 *   --timeout-ms <n>        default 10000 (200..300000)
 *   --json <file>           tulis ringkasan JSON (tanpa header sensitif)
 *   --allow-remote          izinkan base URL non-loopback (dipakai hanya untuk staging)
 *   --help                  tampilkan bantuan
 *
 * Exit code: 0 = tidak ada error non-429; 1 = ada error/timeout/network;
 *            2 = argumen tidak valid atau target ditolak; 130 = SIGINT.
 */

const DEFAULTS = {
  baseUrl: "http://localhost:3001",
  paths: ["/api/health", "/api/lookbook", "/api/cron/backup-status"],
  concurrency: 5,
  durationSec: 10,
  timeoutMs: 10_000,
  maxSamplesPerPath: 5,
};

const USAGE = `Kaos Kami load-test (READ-ONLY, GET only)

  node scripts/load-test.mjs [opsi]

Opsi:
  --base-url <url>     default ${DEFAULTS.baseUrl} (harus localhost/127.0.0.1 kecuali --allow-remote)
  --path <path>        repeatable; default ${DEFAULTS.paths.join(" ")}
  --concurrency <n>    default ${DEFAULTS.concurrency} (1..200)
  --duration-sec <n>   default ${DEFAULTS.durationSec} (1..3600)
  --timeout-ms <n>     default ${DEFAULTS.timeoutMs} (200..300000)
  --json <file>        tulis ringkasan JSON ke file
  --allow-remote       izinkan target non-loopback (STAGING saja, bukan produksi)
  --help               tampilkan bantuan ini

Exit code: 0 = bersih (429 tidak dihitung error), 1 = ada error/timeout/network,
           2 = argumen tidak valid / target ditolak, 130 = dihentikan SIGINT.
`;

// ---------------------------------------------------------------- arg parsing

function parseArgs(argv) {
  const opts = {
    baseUrl: DEFAULTS.baseUrl,
    paths: [],
    concurrency: DEFAULTS.concurrency,
    durationSec: DEFAULTS.durationSec,
    timeoutMs: DEFAULTS.timeoutMs,
    json: null,
    allowRemote: false,
    help: false,
  };

  const needValue = (name, value) => {
    if (value === undefined || value.startsWith("--")) {
      fail(`Opsi --${name} butuh nilai.`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    // Hanya flag (`--x=y`) yang dipecah; nilai seperti `/api/x?y=1` dibiarkan utuh.
    const [flag, inlineValue] =
      raw.startsWith("--") && raw.includes("=") ? raw.split(/=(.*)/s) : [raw, undefined];
    const next = () => needValue(flag.replace(/^--/, ""), inlineValue ?? argv[++i]);

    switch (flag) {
      case "--base-url":
        opts.baseUrl = next();
        break;
      case "--path":
        opts.paths.push(next());
        break;
      case "--concurrency":
        opts.concurrency = toInt(flag, next());
        break;
      case "--duration-sec":
        opts.durationSec = toInt(flag, next());
        break;
      case "--timeout-ms":
        opts.timeoutMs = toInt(flag, next());
        break;
      case "--json":
        opts.json = next();
        break;
      case "--allow-remote":
        opts.allowRemote = true;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        fail(`Opsi tidak dikenal: ${raw}\n\n${USAGE}`);
    }
  }

  if (opts.paths.length === 0) opts.paths = [...DEFAULTS.paths];

  opts.concurrency = clampInt(opts.concurrency, 1, 200, "--concurrency");
  opts.durationSec = clampInt(opts.durationSec, 1, 3600, "--duration-sec");
  opts.timeoutMs = clampInt(opts.timeoutMs, 200, 300_000, "--timeout-ms");

  return opts;
}

function toInt(flag, value) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) fail(`${flag} harus bilangan bulat (dapat: ${value}).`);
  return n;
}

function clampInt(n, min, max, label) {
  if (n < min || n > max) fail(`${label} harus ${min}..${max} (dapat: ${n}).`);
  return n;
}

function fail(message) {
  console.error(`[load-test] ${message}`);
  process.exit(2);
}

// ------------------------------------------------------------------- target

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0:0:0:0:0:0:0:1"]);

function isLoopback(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (LOOPBACK_HOSTS.has(h)) return true;
  if (h.endsWith(".localhost")) return true;
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

function normalizeBaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail(`--base-url tidak valid: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    fail(`--base-url harus http/https (dapat: ${url.protocol})`);
  }
  if (url.search || url.hash) {
    fail("--base-url tidak boleh memuat query/hash; taruh query di --path.");
  }
  return url;
}

function normalizePath(raw) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    fail(`--path harus path relatif, bukan URL absolut: ${raw}`);
  }
  const p = raw.startsWith("/") ? raw : `/${raw}`;
  return p;
}

// ---------------------------------------------------------------- sanitizing

const REDACTIONS = [
  // Authorization header nilai / bearer token
  [/\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, "$1 [redacted]"],
  // pasangan key=value / "key":"value" yang sensitif
  [
    /\b(token|access_token|refresh_token|id_token|api[_-]?key|apikey|secret|password|passwd|otp|session|cookie|authorization|signature|sig)\b(\s*["']?\s*[:=]\s*["']?)([^"'&,\s}\]]+)/gi,
    "$1$2[redacted]",
  ],
  // email
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
  // telepon Indonesia (+62.../08...)
  [/(?:\+62|62|0)8\d{7,12}\b/g, "[phone]"],
  // blob panjang (hex/base64/JWT-ish)
  [/\b[A-Za-z0-9_-]{24,}\b/g, "[blob]"],
];

/** Buang cookie/token/PII dari teks sebelum dicetak (maks `limit` karakter). */
function sanitize(text, limit = 200) {
  let out = String(text ?? "").replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of REDACTIONS) out = out.replace(pattern, replacement);
  return out.length > limit ? `${out.slice(0, limit)}…` : out;
}

// -------------------------------------------------------------------- stats

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null;
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, rank));
  return sortedAsc[idx];
}

/** Latensi JSON dibulatkan 0,1 ms supaya file enak dibaca/dibandingkan. */
function round1(value) {
  return value === null || value === undefined ? null : Number(value.toFixed(1));
}

function newPathStats(path) {
  return {
    path,
    total: 0,
    ok: 0,
    limited: 0, // 429
    other: 0, // non-2xx selain 429
    network: 0,
    timeout: 0,
    aborted: 0,
    latencies: [],
    samples: [], // { kind, status, snippet }
    statuses: new Map(),
  };
}

function recordSample(stats, sample) {
  // Dedupe: 5x error yang identik cukup ditampilkan sekali dengan hitungan.
  const existing = stats.samples.find(
    (s) => s.kind === sample.kind && s.status === sample.status && s.snippet === sample.snippet
  );
  if (existing) {
    existing.count += 1;
    return;
  }
  if (stats.samples.length >= DEFAULTS.maxSamplesPerPath) return;
  stats.samples.push({ ...sample, count: 1 });
}

function addStatus(stats, status) {
  stats.statuses.set(status, (stats.statuses.get(status) ?? 0) + 1);
}

// ------------------------------------------------------------------- runner

const state = {
  stopScheduling: false,
  interrupted: false,
};

const globalCtrl = new AbortController();

function onSigint() {
  if (state.interrupted) {
    console.error("\n[load-test] SIGINT kedua — keluar paksa.");
    process.exit(130);
  }
  state.interrupted = true;
  state.stopScheduling = true;
  console.error("\n[load-test] SIGINT — membatalkan request yang berjalan, menyusun ringkasan…");
  globalCtrl.abort(new Error("SIGINT"));
}

async function hit(targetUrl, pathStats, timeoutMs) {
  const startedAt = performance.now();
  const ctrl = new AbortController();
  let timedOut = false;
  let aborted = false;

  const abortFromGlobal = () => {
    aborted = true;
    ctrl.abort(new Error("aborted"));
  };
  globalCtrl.signal.addEventListener("abort", abortFromGlobal, { once: true });

  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort(new Error("timeout"));
  }, timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      redirect: "manual", // 3xx harus terlihat, bukan diikuti diam-diam
      credentials: "omit", // tanpa cookie/sesi
      cache: "no-store",
      signal: ctrl.signal,
      headers: {
        accept: "application/json, text/plain, */*",
        "user-agent": "kaos-kami-load-test/1.0 (local-smoke)",
      },
    });

    // Konsumsi body: mengukur waktu respons penuh + membebaskan socket.
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      bodyText = "";
    }

    const latency = performance.now() - startedAt;
    pathStats.total += 1;
    pathStats.latencies.push(latency);
    addStatus(pathStats, res.status);

    if (res.status >= 200 && res.status < 300) {
      pathStats.ok += 1;
    } else if (res.status === 429) {
      pathStats.limited += 1; // rate limiter aplikasi: dihitung, bukan crash
      recordSample(pathStats, {
        kind: "rate-limited",
        status: res.status,
        snippet: sanitize(bodyText || "(body kosong)"),
      });
    } else {
      pathStats.other += 1;
      recordSample(pathStats, {
        kind: "http-error",
        status: res.status,
        snippet: sanitize(bodyText || "(body kosong)"),
      });
    }
  } catch (err) {
    const latency = performance.now() - startedAt;
    pathStats.total += 1;
    pathStats.latencies.push(latency);

    if (timedOut) {
      pathStats.timeout += 1;
      recordSample(pathStats, {
        kind: "timeout",
        status: null,
        snippet: sanitize(`tidak ada respons dalam ${timeoutMs}ms`),
      });
    } else if (aborted || globalCtrl.signal.aborted) {
      pathStats.aborted += 1; // dibatalkan SIGINT/drain — bukan error server
    } else {
      pathStats.network += 1;
      recordSample(pathStats, {
        kind: "network-error",
        status: null,
        snippet: sanitize(err?.cause?.code || err?.message || String(err)),
      });
    }
  } finally {
    clearTimeout(timer);
    globalCtrl.signal.removeEventListener("abort", abortFromGlobal);
  }
}

async function runLoadTest(opts, targets) {
  const perPath = targets.map((t) => newPathStats(t.path));
  const startedAt = Date.now();
  const endAt = startedAt + opts.durationSec * 1000;

  let cursor = 0;
  const worker = async () => {
    while (!state.stopScheduling && Date.now() < endAt) {
      const idx = cursor % perPath.length;
      cursor += 1;
      await hit(targets[idx].url, perPath[idx], opts.timeoutMs);
    }
  };

  const workers = Array.from({ length: opts.concurrency }, () => worker());
  await Promise.all(workers);

  const elapsedMs = Date.now() - startedAt;
  return { perPath, elapsedMs };
}

// -------------------------------------------------------------------- report

function fmtMs(value) {
  if (value === null || value === undefined) return "-";
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function pad(value, width, align = "left") {
  const s = String(value);
  if (s.length >= width) return s;
  const fill = " ".repeat(width - s.length);
  return align === "right" ? fill + s : s + fill;
}

function buildReport(opts, targets, perPath, elapsedMs) {
  const elapsedSec = Math.max(elapsedMs, 1) / 1000;
  const rows = perPath.map((s) => {
    const sorted = [...s.latencies].sort((a, b) => a - b);
    const rps = s.total / elapsedSec;
    return {
      path: s.path,
      total: s.total,
      ok: s.ok,
      limited: s.limited,
      other: s.other,
      network: s.network,
      timeout: s.timeout,
      aborted: s.aborted,
      rps: Number(rps.toFixed(2)),
      p50: round1(percentile(sorted, 50)),
      p95: round1(percentile(sorted, 95)),
      p99: round1(percentile(sorted, 99)),
      min: round1(sorted.length ? sorted[0] : null),
      max: round1(sorted.length ? sorted[sorted.length - 1] : null),
      statuses: Object.fromEntries([...s.statuses.entries()].sort((a, b) => a[0] - b[0])),
      samples: s.samples,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.total;
      acc.ok += r.ok;
      acc.limited += r.limited;
      acc.other += r.other;
      acc.network += r.network;
      acc.timeout += r.timeout;
      acc.aborted += r.aborted;
      return acc;
    },
    { total: 0, ok: 0, limited: 0, other: 0, network: 0, timeout: 0, aborted: 0 }
  );

  const allLatencies = perPath.flatMap((s) => s.latencies).sort((a, b) => a - b);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      baseUrl: opts.baseUrl,
      concurrency: opts.concurrency,
      durationSec: opts.durationSec,
      timeoutMs: opts.timeoutMs,
      elapsedMs,
      paths: targets.map((t) => t.path),
      interrupted: state.interrupted,
      remote: !isLoopback(new URL(opts.baseUrl).hostname),
      node: process.version,
      method: "GET",
    },
    totals: {
      ...totals,
      requestsPerSec: Number((totals.total / elapsedSec).toFixed(2)),
      p50: round1(percentile(allLatencies, 50)),
      p95: round1(percentile(allLatencies, 95)),
      p99: round1(percentile(allLatencies, 99)),
    },
    results: rows,
  };
}

function printReport(report) {
  const { meta, totals, results } = report;
  const line = "─".repeat(96);

  console.log("");
  console.log(line);
  console.log(`Kaos Kami load test — ${meta.generatedAt}`);
  console.log(
    `Target: ${meta.baseUrl}${meta.remote ? "  ⚠ NON-LOOPBACK (--allow-remote)" : ""}` +
      `  |  GET only  |  node ${meta.node}`
  );
  console.log(
    `Concurrency: ${meta.concurrency}  |  Duration: ${meta.durationSec}s (aktual ${(meta.elapsedMs / 1000).toFixed(2)}s)` +
      `  |  Timeout: ${meta.timeoutMs}ms  |  Paths: ${meta.paths.length}`
  );
  if (meta.interrupted) console.log("STATUS: dihentikan SIGINT — hasil di bawah = data parsial.");
  console.log(line);

  const headers = ["Path", "Req", "2xx", "429", "Err", "Net", "TOut", "Abort", "RPS", "p50", "p95", "p99"];
  const widths = [30, 5, 5, 5, 5, 5, 5, 6, 7, 8, 8, 8];
  console.log(headers.map((h, i) => pad(h, widths[i], i === 0 ? "left" : "right")).join(" "));

  for (const r of results) {
    const cells = [
      r.path,
      r.total,
      r.ok,
      r.limited,
      r.other,
      r.network,
      r.timeout,
      r.aborted,
      r.rps.toFixed(2),
      fmtMs(r.p50),
      fmtMs(r.p95),
      fmtMs(r.p99),
    ];
    console.log(cells.map((c, i) => pad(c, widths[i], i === 0 ? "left" : "right")).join(" "));
  }

  console.log(line);
  const totalCells = [
    "TOTAL",
    totals.total,
    totals.ok,
    totals.limited,
    totals.other,
    totals.network,
    totals.timeout,
    totals.aborted,
    totals.requestsPerSec.toFixed(2),
    fmtMs(totals.p50),
    fmtMs(totals.p95),
    fmtMs(totals.p99),
  ];
  console.log(totalCells.map((c, i) => pad(c, widths[i], i === 0 ? "left" : "right")).join(" "));
  console.log(line);
  console.log(
    "Catatan: 429 = rate limiter aplikasi (dihitung, bukan crash). " +
      "2xx = sukses. Err = HTTP non-2xx selain 429. Net = gagal koneksi. TOut = timeout. Abort = dibatalkan SIGINT."
  );
  console.log(
    "        Duration = jendela penjadwalan; request in-flight tetap diselesaikan, jadi elapsed bisa > duration (maks +timeout)."
  );

  const withSamples = results.filter((r) => r.samples.length > 0);
  if (withSamples.length > 0) {
    console.log("");
    console.log(`Sampel error (maks ${DEFAULTS.maxSamplesPerPath}/path, sudah disanitasi):`);
    for (const r of withSamples) {
      for (const s of r.samples) {
        const label = s.status === null || s.status === undefined ? s.kind : String(s.status);
        const times = s.count > 1 ? `  (×${s.count})` : "";
        console.log(`  ${r.path}  [${label}]  ${s.snippet}${times}`);
      }
    }
  }

  const noisy = totals.other + totals.network + totals.timeout;
  const prefix = meta.interrupted ? "HASIL (PARSIAL, SIGINT): " : "HASIL: ";
  console.log("");
  console.log(
    noisy === 0
      ? `${prefix}tidak ada error non-429.`
      : `${prefix}${noisy} error non-429 (${totals.other} HTTP, ${totals.network} network, ${totals.timeout} timeout).`
  );
}

// ---------------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }

  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const loopback = isLoopback(baseUrl.hostname);

  if (!loopback && !opts.allowRemote) {
    fail(
      `Menolak target non-loopback: ${baseUrl.origin}\n` +
        "Harness ini default-nya HANYA untuk localhost/127.0.0.1.\n" +
        "Untuk staging, jalankan ulang dengan --allow-remote (JANGAN ke produksi)."
    );
  }

  if (!loopback) {
    const banner = "!".repeat(72);
    console.warn("");
    console.warn(banner);
    console.warn("!! PERINGATAN: target NON-LOOPBACK (--allow-remote aktif)");
    console.warn(`!! Target: ${baseUrl.origin}`);
    console.warn("!! Pastikan ini STAGING, bukan produksi.");
    console.warn("!! Beban mengganggu pengguna nyata; rate limiter/CDN bisa memblokir IP Anda.");
    console.warn("!! Harness ini GET-only dan tidak mengirim cookie/kredensial apa pun.");
    console.warn(banner);
    console.warn("");
  }

  const paths = opts.paths.map(normalizePath);
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length !== paths.length) {
    console.warn(`[load-test] path duplikat digabung: ${paths.length} → ${uniquePaths.length}`);
  }

  const targets = uniquePaths.map((p) => ({
    path: p,
    url: `${baseUrl.origin}${p}`,
  }));

  console.log(
    `[load-test] GET ${targets.length} path @ ${baseUrl.origin} — concurrency ${opts.concurrency}, ` +
      `${opts.durationSec}s, timeout ${opts.timeoutMs}ms`
  );
  for (const t of targets) console.log(`  → ${t.path}`);

  process.on("SIGINT", onSigint);

  const { perPath, elapsedMs } = await runLoadTest(opts, targets);
  const report = buildReport(opts, targets, perPath, elapsedMs);
  printReport(report);

  if (opts.json) {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const outPath = resolve(process.cwd(), opts.json);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`[load-test] JSON ditulis: ${outPath}`);
  }

  if (state.interrupted) return 130;
  return report.totals.other + report.totals.network + report.totals.timeout > 0 ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error("[load-test] FATAL:", sanitize(err?.message || String(err), 300));
    process.exitCode = 1;
  });
