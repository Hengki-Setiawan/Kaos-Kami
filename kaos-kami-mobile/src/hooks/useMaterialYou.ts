"use client";

import { useState, useEffect } from 'react';

export interface MaterialYouPalette {
  primary: string;
  accent: string;
  surface: string;
}

export function useMaterialYou(): MaterialYouPalette {
  const [palette, setPalette] = useState<MaterialYouPalette>({
    primary: '#FF6B35',
    accent: '#FFA06D',
    surface: '#18181B',
  });

  useEffect(() => {
    // Check if running on Android with CSS system accent color support
    if (typeof window !== 'undefined' && window.CSS && CSS.supports('color', 'AccentColor')) {
      try {
        const dummy = document.createElement('div');
        dummy.style.color = 'AccentColor';
        document.body.appendChild(dummy);
        const computed = getComputedStyle(dummy).color;
        document.body.removeChild(dummy);

        if (computed && computed !== 'rgba(0, 0, 0, 0)') {
          // Optional subtle blend
          console.debug('[MaterialYou] System accent color detected:', computed);
        }
      } catch {
        // Safe fallback to default streetwear palette
      }
    }
  }, []);

  return palette;
}
