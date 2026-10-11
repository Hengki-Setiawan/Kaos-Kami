import { getR2PublicUrl } from "./r2";

export interface HomeContent {
  // Fase 1: Hero Utama (3D Story)
  heroTitle: string;
  heroSubtitle: string;

  // Fase 2: Spesifikasi Teknis Bahan
  specsTitle?: string;
  specsSubtitle?: string;

  // Fase 3: Grafis Punggung
  backGraphicTitle?: string;
  backGraphicSubtitle?: string;

  // Showcase Etalase Produk
  showcaseBadge?: string;
  showcaseTitle?: string;
  showcaseSubtitle?: string;

  // Profil Workshop (About Us)
  aboutBadge?: string;
  aboutTitle?: string;
  aboutStory?: string;

  // Media Sosial Resmi
  instagramUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  whatsappNumber?: string;

  // Profil Fisik & Lokasi Workshop
  workshopAddress?: string;
  workshopHours?: string;
  workshopMapsUrl?: string;

  updatedAt: string;
}

export type HeroContent = HomeContent;

export const DEFAULT_HERO: HomeContent = {
  heroTitle: "BIKIN KAOS IMPIANMU\nDENGAN MOCKUP 3D",
  heroSubtitle: "Platform sablon DTF kustom satuan & kaos polos katun combed berkualitas di Makassar. Simulasikan desainmu 360° secara akurat.",
  specsTitle: "KATUN COMBED NYAMAN & STANDAR DISTRO",
  specsSubtitle: "100% serat alami sejuk, lembut & menyerap keringat. Sablon DTF 300 DPI tahan cuci 50x.",
  backGraphicTitle: "LIHAT HASILNYA\nSEBELUM DICETAK",
  backGraphicSubtitle: "Inspeksi depan & punggung 360°. Skala sentimeter nyata terkalibrasi 1:1 tanpa salah cetak.",
  showcaseBadge: "READY STOCK // MAKASSAR HYPERLOCAL",
  showcaseTitle: "ETALASE PRODUK",
  showcaseSubtitle: "Streetwear kurasi Kaos Kami dengan bahan katun combed adem & sablon DTF presisi.",
  aboutBadge: "BRAND APPAREL & SABLON DTF MAKASSAR · EST. 2024",
  aboutTitle: "Kaos Komunitas Berkualitas,\nDibuat Mandiri dengan Standar Distro",
  aboutStory: "Kaos Kami adalah brand apparel independen Kota Makassar yang berfokus pada kaos komunitas, pop culture, dan sablon digital DTF presisi tinggi sejak 2024. Setiap potong pakaian dikerjakan dengan ketelitian penuh di workshop kami di Tallo, Makassar.",
  instagramUrl: "https://www.instagram.com/kaoskami.makassar",
  tiktokUrl: "https://www.tiktok.com/@kaoskami",
  facebookUrl: "https://www.facebook.com/groups/kaoskami",
  whatsappNumber: "0895803463032",
  workshopAddress: "Jl. Galangan Kapal, Lrg. Permandian 1, Kaluku Bodoa, Kec. Tallo, Kota Makassar, Sulawesi Selatan 90211",
  workshopHours: "Senin – Sabtu · 09:00 – 21:00 WITA",
  workshopMapsUrl: "https://maps.google.com/?q=-5.106018,119.432396",
  updatedAt: "",
};

let cache: { at: number; data: HomeContent } | null = null;

export async function getHeroContent(): Promise<HomeContent> {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.data;
  try {
    const url = getR2PublicUrl("cms/hero.json");
    if (!url.startsWith("http")) return DEFAULT_HERO;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return DEFAULT_HERO;
    const data = (await res.json()) as Partial<HomeContent>;
    const out: HomeContent = {
      heroTitle: data.heroTitle?.slice(0, 100) || DEFAULT_HERO.heroTitle,
      heroSubtitle: data.heroSubtitle?.slice(0, 300) || DEFAULT_HERO.heroSubtitle,
      specsTitle: data.specsTitle?.slice(0, 100) || DEFAULT_HERO.specsTitle,
      specsSubtitle: data.specsSubtitle?.slice(0, 300) || DEFAULT_HERO.specsSubtitle,
      backGraphicTitle: data.backGraphicTitle?.slice(0, 100) || DEFAULT_HERO.backGraphicTitle,
      backGraphicSubtitle: data.backGraphicSubtitle?.slice(0, 300) || DEFAULT_HERO.backGraphicSubtitle,
      showcaseBadge: data.showcaseBadge?.slice(0, 80) || DEFAULT_HERO.showcaseBadge,
      showcaseTitle: data.showcaseTitle?.slice(0, 100) || DEFAULT_HERO.showcaseTitle,
      showcaseSubtitle: data.showcaseSubtitle?.slice(0, 300) || DEFAULT_HERO.showcaseSubtitle,
      aboutBadge: data.aboutBadge?.slice(0, 80) || DEFAULT_HERO.aboutBadge,
      aboutTitle: data.aboutTitle?.slice(0, 120) || DEFAULT_HERO.aboutTitle,
      aboutStory: data.aboutStory?.slice(0, 800) || DEFAULT_HERO.aboutStory,
      instagramUrl: data.instagramUrl?.slice(0, 200) || DEFAULT_HERO.instagramUrl,
      tiktokUrl: data.tiktokUrl?.slice(0, 200) || DEFAULT_HERO.tiktokUrl,
      facebookUrl: data.facebookUrl?.slice(0, 200) || DEFAULT_HERO.facebookUrl,
      whatsappNumber: data.whatsappNumber?.slice(0, 50) || DEFAULT_HERO.whatsappNumber,
      workshopAddress: data.workshopAddress?.slice(0, 300) || DEFAULT_HERO.workshopAddress,
      workshopHours: data.workshopHours?.slice(0, 100) || DEFAULT_HERO.workshopHours,
      workshopMapsUrl: data.workshopMapsUrl?.slice(0, 300) || DEFAULT_HERO.workshopMapsUrl,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    };
    cache = { at: Date.now(), data: out };
    return out;
  } catch {
    return DEFAULT_HERO;
  }
}

export function invalidateHeroCache(data: HomeContent) {
  cache = { at: Date.now(), data };
}
