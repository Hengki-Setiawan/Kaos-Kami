import type { Metadata, Viewport } from "next";
import { Syne, Plus_Jakarta_Sans } from "next/font/google";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { DesignSyncProvider } from "@/components/providers/DesignSyncProvider";
import { AppDownloadBanner } from "@/components/ui/AppDownloadBanner";
import { NotificationGpsPrompt } from "@/components/ui/NotificationGpsPrompt";
import Script from "next/script";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
  // CWV: font hero/LCP — preload woff2 eksplisit (next/font menyuntik
  // <link rel="preload" as="font"> untuk file ini).
  preload: true,
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
// CWV: JetBrains_Mono DICABUT (hemat 1 family ≈ 3 file woff2). Kelas
// `font-mono` kini map ke tumpukan monospace sistem di tailwind.config.ts.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaoskami.biz.id";
const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const cfAnalyticsToken = process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kaos Kami | Sablon Kaos & Streetwear Makassar",
    template: "%s | Kaos Kami",
  },
  description:
    "Jasa sablon DTF dan belanja kaos streetwear berkualitas di Kota Makassar. Pesan satuan tanpa minimal order atau beli kaos polos combed 24s/30s siap kirim.",
  keywords: [
    "kaos kami",
    "streetwear makassar",
    "kaos polos combed",
    "sablon dtf makassar",
    "custom kaos satuan",
    "bikin kaos makassar",
    "mockup 3d kaos",
  ],
  authors: [{ name: "Kaos Kami Studio" }],
  openGraph: {
    title: "Kaos Kami | Sablon Kaos & Streetwear Makassar",
    description: "Jasa sablon DTF satuan tanpa minimal order & kaos polos berkualitas di Kota Makassar.",
    url: siteUrl,
    siteName: "Kaos Kami",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kaos Kami | Sablon Kaos & Streetwear Makassar",
    description: "Jasa sablon DTF satuan tanpa minimal order & kaos polos berkualitas di Kota Makassar.",
  },
  icons: {
    icon: [
      { url: "/brand/favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  // Default = gallery; script theme-init di bawah menimpa ke #121214 utk dark.
  themeColor: "#F5F4F0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      data-theme="gallery"
      suppressHydrationWarning
      className={`${syne.variable} ${jakarta.variable}`}
    >
      <head>
        {/* P0 fondasi tema: blocking pre-paint — set data-theme + theme-color
            dari localStorage (default gallery) agar tak flash obsidian. */}
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("kaos-studio-theme");if(t!=="gallery"&&t!=="obsidian"&&t!=="concrete")t="gallery";var d=document.documentElement;d.setAttribute("data-theme",t);d.style.colorScheme=t==="gallery"?"light":"dark";var c=t==="gallery"?"#EFECE6":"#121214";var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute("content",c);}else{var n=document.createElement("meta");n.name="theme-color";n.content=c;document.head.appendChild(n);}}catch(e){document.documentElement.setAttribute("data-theme","gallery");}})();`,
          }}
        />
      </head>
      <body className="bg-canvas text-text-primary selection:bg-brand-accent selection:text-canvas min-h-screen">
        <Script
          src={
            process.env.DUITKU_ENV === "production"
              ? "https://app.duitku.com/lib/js/duitku.js"
              : "https://app-sandbox.duitku.com/lib/js/duitku.js"
          }
          strategy="afterInteractive"
        />
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.log('SW registration skipped:', err);
                });
              });
            }
          `}
        </Script>

        {/* Google Analytics 4 (Free Tier) */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

        {/* Cloudflare Web Analytics (100% Free & Privacy-First) */}
        {cfAnalyticsToken && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${cfAnalyticsToken}"}`}
            strategy="afterInteractive"
          />
        )}

        {/* Global ChunkLoadError Auto-Recovery */}
        <Script id="chunk-error-recovery" strategy="afterInteractive">
          {`
            window.addEventListener('error', function(e) {
              if (e && e.message && (e.message.indexOf('Loading chunk') !== -1 || e.message.indexOf('ChunkLoadError') !== -1)) {
                var k = 'chk_rel_' + (e.filename || 'app');
                if (!sessionStorage.getItem(k)) {
                  sessionStorage.setItem(k, '1');
                  window.location.reload();
                }
              }
            });
          `}
        </Script>

        <QueryProvider>
          <DesignSyncProvider>
            <SmoothScrollProvider>{children}</SmoothScrollProvider>
            <AppDownloadBanner />
            <NotificationGpsPrompt />
          </DesignSyncProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
