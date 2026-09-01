import type { Metadata, Viewport } from "next";
import { Syne, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { DesignSyncProvider } from "@/components/providers/DesignSyncProvider";
import Script from "next/script";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaos-kami-3d.hengkisetiawan461.workers.dev";
const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const cfAnalyticsToken = process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "kaos kami — Heavyweight 3D Apparel Experience | Makassar DTF Sablon",
  description:
    "Engineered oversized streetwear. 240 & 280 GSM combed cotton knitwear, inspected and customized in real-time 3D.",
  keywords: [
    "kaos kami",
    "streetwear",
    "heavyweight cotton",
    "240 GSM",
    "280 GSM",
    "3D apparel",
    "oversized t-shirt",
    "Makassar streetwear",
    "sablon DTF Makassar",
    "3D configurator",
  ],
  authors: [{ name: "Kaos Kami Studio" }],
  openGraph: {
    title: "kaos kami — Heavyweight 3D Apparel Experience | Makassar DTF Sablon",
    description: "Heavyweight Indonesian streetwear, engineered not printed.",
    url: siteUrl,
    siteName: "kaos kami",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "kaos kami — Heavyweight 3D Apparel Experience | Makassar DTF Sablon",
    description: "Heavyweight Indonesian streetwear, engineered not printed.",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#121214",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${syne.variable} ${mono.variable} ${jakarta.variable} dark`}
    >
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

        <QueryProvider>
          <DesignSyncProvider>
            <SmoothScrollProvider>{children}</SmoothScrollProvider>
          </DesignSyncProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
