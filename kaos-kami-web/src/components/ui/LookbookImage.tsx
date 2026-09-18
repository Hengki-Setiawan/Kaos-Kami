"use client";

import React, { useState } from "react";
import Image from "next/image";
import { generatePlaceholderImage } from "@/lib/placeholderImage";
import { isSafeImageUrl } from "@/lib/safeUrl";

interface LookbookImageProps {
  src: string;
  caption: string;
  seed: number;
  className?: string;
  // CWV: true hanya untuk look pertama (above-the-fold) agar jadi LCP
  // candidate dengan fetch prioritas tinggi; sisanya lazy default.
  priority?: boolean;
}

export const LookbookImage: React.FC<LookbookImageProps> = ({
  src,
  caption,
  seed,
  className,
  priority = false,
}) => {
  const safe = isSafeImageUrl(src);
  const [resolvedSrc, setResolvedSrc] = useState(safe ? src : generatePlaceholderImage(caption, seed));
  const [usedFallback, setUsedFallback] = useState(!safe);

  const handleError = () => {
    if (usedFallback) return;
    setUsedFallback(true);
    setResolvedSrc(generatePlaceholderImage(caption, seed));
  };

  // data:/blob: (placeholder canvas) tak bisa dioptimasi server — sajikan as-is.
  const rawSrc = resolvedSrc.startsWith("data:") || resolvedSrc.startsWith("blob:");

  return (
    <Image
      src={resolvedSrc || "/lookbook/look-01.jpg"}
      onError={handleError}
      alt={caption}
      width={600}
      height={800}
      className={className}
      // width+height eksplisit = slot rasio 3:4 dicadangkan → anti-CLS.
      sizes="(max-width: 768px) 100vw, 33vw"
      priority={priority}
      loading={priority ? undefined : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      unoptimized={true}
    />
  );
};
