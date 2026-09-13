/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  assetPrefix: './',
  // Next 15: optimizePackageImports sudah stabil (top-level). esmExternals tetap experimental.
  optimizePackageImports: ['lucide-react', 'clsx', 'tailwind-merge', 'framer-motion'],
  experimental: {
    esmExternals: 'loose',
  },
  env: {
    // PLATFORM statis (bukan secret). URL API JANGAN hardcode di sini —
    // baca dari .env.local agar .env.example bermakna (audit).
    NEXT_PUBLIC_PLATFORM: 'mobile',
  },
};

export default nextConfig;
