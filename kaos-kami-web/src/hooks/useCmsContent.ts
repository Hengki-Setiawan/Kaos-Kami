"use client";

import { useEffect, useState } from "react";
import type { HomeContent } from "@/lib/cms";
import { DEFAULT_HERO } from "@/lib/cms";

let memoryCache: HomeContent | null = null;

export function useCmsContent(): HomeContent {
  const [content, setContent] = useState<HomeContent>(() => memoryCache || DEFAULT_HERO);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/cms", { cache: "no-store" });
        const d = (await res.json().catch(() => null)) as Partial<HomeContent> | null;
        if (alive && res.ok && d) {
          const merged: HomeContent = {
            heroTitle: d.heroTitle || DEFAULT_HERO.heroTitle,
            heroSubtitle: d.heroSubtitle || DEFAULT_HERO.heroSubtitle,
            specsTitle: d.specsTitle || DEFAULT_HERO.specsTitle,
            specsSubtitle: d.specsSubtitle || DEFAULT_HERO.specsSubtitle,
            backGraphicTitle: d.backGraphicTitle || DEFAULT_HERO.backGraphicTitle,
            backGraphicSubtitle: d.backGraphicSubtitle || DEFAULT_HERO.backGraphicSubtitle,
            showcaseBadge: d.showcaseBadge || DEFAULT_HERO.showcaseBadge,
            showcaseTitle: d.showcaseTitle || DEFAULT_HERO.showcaseTitle,
            showcaseSubtitle: d.showcaseSubtitle || DEFAULT_HERO.showcaseSubtitle,
            aboutBadge: d.aboutBadge || DEFAULT_HERO.aboutBadge,
            aboutTitle: d.aboutTitle || DEFAULT_HERO.aboutTitle,
            aboutStory: d.aboutStory || DEFAULT_HERO.aboutStory,
            instagramUrl: d.instagramUrl || DEFAULT_HERO.instagramUrl,
            tiktokUrl: d.tiktokUrl || DEFAULT_HERO.tiktokUrl,
            facebookUrl: d.facebookUrl || DEFAULT_HERO.facebookUrl,
            whatsappNumber: d.whatsappNumber || DEFAULT_HERO.whatsappNumber,
            workshopAddress: d.workshopAddress || DEFAULT_HERO.workshopAddress,
            workshopHours: d.workshopHours || DEFAULT_HERO.workshopHours,
            workshopMapsUrl: d.workshopMapsUrl || DEFAULT_HERO.workshopMapsUrl,
            updatedAt: d.updatedAt || "",
          };
          memoryCache = merged;
          setContent(merged);
        }
      } catch { }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return content;
}
