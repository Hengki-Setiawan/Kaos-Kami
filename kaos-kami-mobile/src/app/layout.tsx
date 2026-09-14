import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kaos Kami Mobile',
  description: '3D Interactive Apparel E-Commerce & DTF Sablon Platform Makassar',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // A11y: izinkan pinch-zoom s/d 5x (WCAG) — JANGAN kunci maximumScale=1.
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0E0E10',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark bg-canvas">
      {/* P0-3: safe-area top HANYA di NativeHeader (pt-safe); body tanpa
          pt-safe agar tak double. pb-safe milik TabBar/BottomSheet. */}
      <body className="min-h-dvh bg-canvas text-text-primary antialiased flex flex-col transition-colors">
        {children}
      </body>
    </html>
  );
}
