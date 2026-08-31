/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output:"export" dihapus — API Routes (checkout/webhook/auth) butuh SSR. Untuk Cloudflare Pages gunakan @opennextjs/cloudflare, bukan static export.
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
