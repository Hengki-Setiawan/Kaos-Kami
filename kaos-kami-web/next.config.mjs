/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @libsql/client ada di daftar external bawaan Next (server-external-packages.json).
  // transpilePackages MEMAKSA bundle + membuat alias webpack di bawah berlaku,
  // sehingga impor root "@libsql/client" (dari dalam drizzle-orm) me-resolve
  // ke build /web fetch-only — bukan build node (require native → 500 workerd).
  transpilePackages: ["@libsql/client"],
  // Next 15: optimizePackageImports stabil (keluar dari experimental).
  optimizePackageImports: ["lucide-react", "clsx", "tailwind-merge", "framer-motion"],
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
  // Next 15: serverComponentsExternalPackages -> serverExternalPackages.
  serverExternalPackages: [],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async headers() {
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
