import { CapacitorHttp } from '@capacitor/core';
import { API_BASE_URL } from '@/lib/api/mobileApiClient';

export interface DraftDecal {
  id: string;
  url: string;
  name: string;
  targetSide: 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'hood';
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface DesignDraftInput {
  title: string;
  apparelSlug: string;
  colorHex: string;
  colorName: string;
  size: string;
  decals: DraftDecal[];
}

export interface DesignDraftResult {
  ok: boolean;
  /** URL decal hasil hosting R2 (urutan sama dengan input), bila sukses. */
  decalUrls?: string[];
  designId?: string;
  error?: string;
}

/**
 * Buat DRAFT desain via kontrak web `POST /api/designs` (guest boleh, decal
 * base64 → diunggah server ke R2, harga dihitung ulang server).
 * Respons: { success, design } — design.decals berisi URL R2 (kolom JSON).
 *
 * Timeout KHUSUS checkout (30 dtk): upload base64 + proses R2 server lebih
 * lama dari GET biasa (15 dtk). Gagal → pemanggil WAJIB fallback base64 lama
 * + peringatan (JANGAN gagalkan checkout karenanya).
 */
export async function createDesignDraft(
  input: DesignDraftInput,
  onProgress?: (stage: string) => void
): Promise<DesignDraftResult> {
  try {
    onProgress?.('Mengunggah decal ke server…');
    const response = await CapacitorHttp.post({
      url: `${API_BASE_URL}/api/designs`,
      headers: { 'Content-Type': 'application/json' },
      data: {
        title: input.title.slice(0, 60) || 'Custom Mobile',
        apparelSlug: input.apparelSlug,
        colorHex: input.colorHex,
        colorName: input.colorName.slice(0, 40) || 'Custom',
        size: input.size,
        sablonMethodSlug: 'dtf',
        decals: input.decals,
      },
      // Timeout khusus checkout (upload bisa 5–8MB sebelum kompres penuh).
      connectTimeout: 30000,
      readTimeout: 45000,
    });
    const body = response.data;
    if (response.status === 200 && body?.success && body?.design) {
      const design = body.design;
      let decals: any[] = [];
      try {
        decals = typeof design.decals === 'string' ? JSON.parse(design.decals) : design.decals || [];
      } catch {
        decals = [];
      }
      const urls = (Array.isArray(decals) ? decals : [])
        .map((d: any) => (typeof d?.url === 'string' ? d.url : null))
        .filter(Boolean);
      return { ok: true, decalUrls: urls, designId: design.id };
    }
    return { ok: false, error: body?.error || `Draft desain gagal (${response.status})` };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Jaringan bermasalah saat upload decal' };
  }
}
