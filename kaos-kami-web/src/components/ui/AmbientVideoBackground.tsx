"use client";

import React, { useEffect, useState } from "react";

interface AmbientVideoBackgroundProps {
  srcMp4?: string;
  poster: string;
  className?: string;
}

export const AmbientVideoBackground: React.FC<AmbientVideoBackgroundProps> = ({
  srcMp4,
  poster,
  className,
}) => {
  const [videoOk, setVideoOk] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setVideoOk(Boolean(srcMp4) && !reduced);
  }, [srcMp4]);

  if (!videoOk) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={poster} alt="" className={className} />;
  }

  return (
    <video
      className={className}
      src={srcMp4}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      onError={() => setVideoOk(false)}
    />
  );
};
