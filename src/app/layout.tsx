import type { Metadata, Viewport } from "next";
import { Syne, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaoskami.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "kaos kami — Heavyweight 3D Apparel Experience",
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
    "Jakarta streetwear",
    "3D configurator",
  ],
  authors: [{ name: "Kaos Kami Studio" }],
  openGraph: {
    title: "kaos kami — Heavyweight 3D Apparel Experience",
    description: "Heavyweight Indonesian streetwear, engineered not printed.",
    url: siteUrl,
    siteName: "kaos kami",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "kaos kami — Heavyweight 3D Apparel Experience",
    description: "Heavyweight Indonesian streetwear, engineered not printed.",
  },
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
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
