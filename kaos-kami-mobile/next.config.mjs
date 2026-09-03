/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  assetPrefix: './',
  experimental: {
    esmExternals: 'loose',
    optimizePackageImports: ['lucide-react', 'clsx', 'tailwind-merge', 'framer-motion'],
  },
  env: {
    NEXT_PUBLIC_PLATFORM: 'mobile',
    NEXT_PUBLIC_API_URL: 'https://kaos-kami-3d.hengkisetiawan461.workers.dev',
  },
};

export default nextConfig;
