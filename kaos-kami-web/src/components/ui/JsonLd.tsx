"use client";

import React from "react";
import { PRODUCT_DETAILS } from "@/lib/constants";

// JSON-LD terpusat (audit H1 — sebelumnya diduplikat di dua cabang return).
export function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: PRODUCT_DETAILS.productTitle,
    description: "Heavyweight 240 & 280 GSM Cotton Combed Oversized Streetwear Apparel 3D Sandbox.",
    brand: {
      "@type": "Brand",
      name: PRODUCT_DETAILS.brand,
    },
    sku: PRODUCT_DETAILS.sku,
    offers: {
      "@type": "Offer",
      url: "https://kaoskami.com",
      priceCurrency: PRODUCT_DETAILS.currency,
      price: PRODUCT_DETAILS.priceIdr,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Error boundary: CanvasStage crash = fallback, bukan layar hitam (audit H1).
export class CanvasErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[Canvas] crash, tampilkan fallback:", err);
  }
  render() {
    return this.state.crashed ? this.props.fallback : this.props.children;
  }
}
