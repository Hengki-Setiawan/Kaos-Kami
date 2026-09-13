/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @libsql/client ada di daftar external bawaan Next (server-external-packages.json).
  // transpilePackages MEMAKSA bundle + membuat alias webpack di bawah berlaku,
  // sehingga impor root "@libsql/client" (dari dalam drizzle-orm) me-resolve
  // ke build /web fetch-only — bukan build node (require native → 500 workerd).
  transpilePackages: ["@libsql/client"],
  // Terbukti via build warning Next 15.5: kunci ini HANYA dikenali di bawah
  // `experimental` (komentar lama yang klaim "stabil" keliru).
  experimental: {
    optimizePackageImports: ["lucide-react", "clsx", "tailwind-merge", "framer-motion"],
  },
  images: {
    unoptimized: true,
    // formats MATI selama unoptimized:true (Next tak memproses/mengonversi
    // gambar sama sekali — nilai ini diabaikan, dipertahankan agar niat
    // optimasi avif/webp terdokumentasi saat unoptimized dicabut).
    formats: ["image/avif", "image/webp"],
  },
  // Next 15: serverComponentsExternalPackages -> serverExternalPackages.
  serverExternalPackages: [],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async headers() {
    // P1 (13 Sep 2026): CSP minimal — self + Duitku (popup-js prod/sandbox) +
    // Turnstile (script/frame challenges.cloudflare.com). 'unsafe-inline'
    // SENGAJA dipertahankan: Next App Router menyuntik inline script/style;
    // tanpa nonce (butuh middleware) melepasnya = halaman blank. Pengetatan
    // ke nonce-hash = tindak lanjut terpisah (butuh uji build).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://app.duitku.com https://app-sandbox.duitku.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://passport.duitku.com https://sandbox.duitku.com https://challenges.cloudflare.com",
      "frame-src 'self' https://app.duitku.com https://app-sandbox.duitku.com https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
    // Matcher per-ekstensi (audit: `/:all*(...)` bukan sintaks param Next
    // yang valid → header immutable tak pernah teraplikasi).
    const immutableExt = ["glb", "gltf", "png", "jpg", "jpeg", "webp", "avif", "woff2", "mp4"];
    return [
      ...immutableExt.map((ext) => ({
        source: `/:path*.${ext}`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      })),
      {
        // Global Security Headers (Enterprise Standard)
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // geolocation=(self): tombol GPS checkout/web butuh izin lokasi.
            // camera+microphone tetap mati (upload pakai file input).
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            // P1: paksa HTTPS 2 tahun + subdomain. Header ini hanya bermakna
            // di origin HTTPS prod (kaoskami.biz.id); diabaikan di http lokal.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            // P1: isolasi konteks browsing; allow-popups = OAuth Google &
            // popup Duitku tetap bisa kembali ke opener. BUKAN `same-origin`
            // penuh (itu memutus popup payment/OAuth).
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  // Paksa SEMUA impor "@libsql/client" (termasuk dari dalam drizzle-orm)
  // ke build /web (fetch-only). Tanpa ini, kondisi "node"/CJS me-resolve
  // ke build native → require("@libsql/linux-x64-musl") → 500 di workerd.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@libsql/client$": "@libsql/client/web",
    };
    return config;
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
