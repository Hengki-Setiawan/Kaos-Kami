/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
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
    // CWV Sep 2026: optimasi AKTIF (unoptimized:false) agar hero/katalog
    // dapat srcset AVIF/WebP + sizes responsif. R2 pub URL
    // (https://pub-*.r2.dev) diizinkan via remotePatterns wildcard.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
    ],
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://app.duitku.com https://app-sandbox.duitku.com https://challenges.cloudflare.com https://www.gstatic.com https://www.googletagmanager.com https://static.cloudflareinsights.com",
      "worker-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'",
      "child-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' blob: data: https://passport.duitku.com https://sandbox.duitku.com https://app.duitku.com https://app-sandbox.duitku.com https://challenges.cloudflare.com https://kaoskami.biz.id https://pub-5746f36a46904edc8425ecd72517865c.r2.dev https://www.gstatic.com https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com https://www.googletagmanager.com https://cloudflareinsights.com",
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
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "(?<subdomain>.*)\\.workers\\.dev",
          },
        ],
        destination: "https://kaoskami.biz.id/:path*",
        permanent: true,
      },
    ];
  },
  // Paksa SEMUA impor "@libsql/client" (termasuk dari dalam drizzle-orm)
  // ke build /web (fetch-only). Tanpa ini, kondisi "node"/CJS me-resolve
  // ke build native → require("@libsql/linux-x64-musl") → 500 di workerd.
  webpack: (config, { dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@libsql/client$": "@libsql/client/web",
    };
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/System Volume Information/**",
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/Asset 3D/**",
          "**/backups/**",
          "**/.gemini/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
