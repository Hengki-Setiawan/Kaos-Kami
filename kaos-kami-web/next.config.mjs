/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @libsql/client ada di daftar external bawaan Next (server-external-packages.json).
  // transpilePackages MEMAKSA bundle + membuat alias webpack di bawah berlaku,
  // sehingga impor root "@libsql/client" (dari dalam drizzle-orm) me-resolve
  // ke build /web fetch-only — bukan build node (require native → 500 workerd).
  transpilePackages: ["@libsql/client"],
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "clsx", "tailwind-merge", "framer-motion"],
    // Prisma Client TIDAK dipakai di runtime Workers (lihat src/lib/db.ts + RUNBOOK §6).
    // drizzle-orm + @libsql/client SENGAJA di-bundle (TIDAK external): dengan alias
    // webpack "@libsql/client$" → "@libsql/client/web" di bawah, semua impor
    // (termasuk dari dalam drizzle-orm) me-resolve ke build fetch-only.
    // External justru rusak: require() runtime jatuh ke build node/CJS →
    // require("@libsql/linux-x64-musl") → 500 di workerd.
    serverComponentsExternalPackages: [],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async headers() {
    return [
      {
        // 3D Models, Textures, Videos & Lookbook Assets: 1-Year Immutable Edge CDN Caching
        source: "/:all*(glb|gltf|png|jpg|jpeg|webp|avif|woff2|mp4)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
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
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
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
