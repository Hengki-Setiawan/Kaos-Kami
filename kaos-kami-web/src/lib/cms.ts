import { getR2PublicUrl } from "./r2";

export interface HeroContent {
  heroTitle: string;
  heroSubtitle: string;
  updatedAt: string;
}

export const DEFAULT_HERO: HeroContent = {
  heroTitle: "HEAVYWEIGHT BOXY TEE",
  heroSubtitle: "Katun combed tebal berkarakter boxy tegap.",
  updatedAt: "",
};

/** Baca konten hero dari R2 (gagal → default). Di-cache 5 menit di memori. */
let cache: { at: number; data: HeroContent } | null = null;
export async function getHeroContent(): Promise<HeroContent> {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.data;
  try {
    const url = getR2PublicUrl("cms/hero.json");
    if (!url.startsWith("http")) return DEFAULT_HERO;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return DEFAULT_HERO;
    const data = (await res.json()) as Partial<HeroContent>;
    const out: HeroContent = {
      heroTitle: typeof data.heroTitle === "string" && data.heroTitle ? data.heroTitle.slice(0, 80) : DEFAULT_HERO.heroTitle,
      heroSubtitle: typeof data.heroSubtitle === "string" ? data.heroSubtitle.slice(0, 200) : DEFAULT_HERO.heroSubtitle,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    };
    cache = { at: Date.now(), data: out };
    return out;
  } catch {
    return DEFAULT_HERO;
  }
}

/** Invalidate cache lokal (dipanggil setelah simpan). */
export function invalidateHeroCache(data: HeroContent) {
  cache = { at: Date.now(), data };
}
