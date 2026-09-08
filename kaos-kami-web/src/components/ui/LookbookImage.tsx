"use client";

import React, { useState } from "react";
import { generatePlaceholderImage } from "@/lib/placeholderImage";
import { isSafeImageUrl } from "@/lib/safeUrl";

interface LookbookImageProps {
  src: string;
  caption: string;
  seed: number;
  className?: string;
}

export const LookbookImage: React.FC<LookbookImageProps> = ({
  src,
  caption,
  seed,
  className,
}) => {
  const safe = isSafeImageUrl(src);
  const [resolvedSrc, setResolvedSrc] = useState(safe ? src : generatePlaceholderImage(caption, seed));
  const [usedFallback, setUsedFallback] = useState(!safe);

  const handleError = () => {
    if (usedFallback) return;
    setUsedFallback(true);
    setResolvedSrc(generatePlaceholderImage(caption, seed));
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      onError={handleError}
      alt={caption}
      width={600}
      height={800}
      className={className}
      loading="lazy"
    />
  );
};
