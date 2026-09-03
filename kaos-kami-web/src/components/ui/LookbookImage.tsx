"use client";

import React, { useState } from "react";
import { generatePlaceholderImage } from "@/lib/placeholderImage";

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
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [usedFallback, setUsedFallback] = useState(false);

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
      className={className}
      loading="lazy"
    />
  );
};
