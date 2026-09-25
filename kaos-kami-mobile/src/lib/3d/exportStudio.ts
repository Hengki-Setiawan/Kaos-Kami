import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type * as THREE from 'three';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { enableScreenKeepAwake, disableScreenKeepAwake } from '@/lib/bridge/keepAwake';

/**
 * Bus snapshot on-demand — pasangan `preserveDrawingBuffer: false` di
 * CanvasStageMobile / ARPreviewStage. Kanvas didaftar saat onCreated; sebelum
 * drawImage/capture WAJIB render satu frame sinkron di task yang sama,
 * kalau tidak buffer sudah dibersihkan compositor → hasil blank/hitam.
 */
type SnapshotEntry = { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera };
let studioSnapshot: SnapshotEntry | null = null;
let arSnapshot: SnapshotEntry | null = null;

export function registerStudioSnapshot(entry: SnapshotEntry | null): void {
  studioSnapshot = entry;
}

export function registerARSnapshot(entry: SnapshotEntry | null): void {
  arSnapshot = entry;
}

function renderNow(entry: SnapshotEntry | null): void {
  if (!entry) return;
  try {
    entry.gl.render(entry.scene, entry.camera);
  } catch {}
}

/** Render ulang studio sinkron — panggil tepat sebelum membaca piksel kanvas. */
export function renderStudioNow(): void {
  renderNow(studioSnapshot);
}

/** Render ulang overlay AR sinkron — panggil tepat sebelum membaca piksel kanvas. */
export function renderARNow(): void {
  renderNow(arSnapshot);
}

function isNative(): boolean {
  try {
    return typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function getPlatformId(): string {
  try {
    return (window as any)?.Capacitor?.getPlatform?.() ?? 'web';
  } catch {
    return 'web';
  }
}

/**
 * N2 — Target rekaman per-platform. iOS (Safari/WebKit) TAK mendukung
 * WebM/VP9 → pakai MP4 (H.264) agar hasil bisa diputar & dibagikan dari
 * iPhone; Android/web tetap WebM VP9 (ukuran kecil, kualitas sama).
 * isTypeSupported di-guard: bila keduanya tak didukung, MediaRecorder
 * memakai default browser (extension mengikuti pilihan platform).
 */
function pickRecordingTarget(): { mime?: string; fileType: string; extension: string } {
  const isIOS = getPlatformId() === 'ios';
  const supported = (m: string): boolean => {
    try {
      return (window as any)?.MediaRecorder?.isTypeSupported?.(m) === true;
    } catch {
      return false;
    }
  };
  if (isIOS) {
    const mp4 = 'video/mp4';
    return {
      mime: supported(mp4) ? mp4 : undefined,
      fileType: 'video/mp4',
      extension: 'mp4',
    };
  }
  const webm = 'video/webm;codecs=vp9';
  return {
    mime: supported(webm) ? webm : undefined,
    fileType: 'video/webm',
    extension: 'webm',
  };
}

function findStudioCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector('#kk-studio canvas');
}

async function persistAndShare(base64: string, fileName: string, mime: string): Promise<string> {
  if (isNative()) {
    // N5 janitor: tiap kali menyimpan mockup baru, bersihkan file HD basi
    // (>7 hari) agar folder Cache tak membengkak di HP low-storage.
    // Fire-and-forget — kegagalan janitor JANGAN menggagalkan share.
    void pruneStaleHdCache().catch(() => {});
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({ title: 'Kaos Kami Mockup', url: saved.uri, dialogTitle: 'Bagikan mockup' });
    return saved.uri;
  }
  const a = document.createElement('a');
  a.href = `data:${mime};base64,${base64}`;
  a.download = fileName;
  a.click();
  return fileName;
}

/**
 * N5 — Janitor cache: hapus `kaoskami-hd-<epochMs>.png` yang berumur >7 hari
 * di Directory.Cache (native saja; web = no-op). Timestamp dibaca dari nama
 * file; file yang namanya tak terpola dilewati (JANGAN hapus buta).
 *
 * @param maxAgeMs umur maksimum file dipertahankan (default 7 hari).
 * @returns jumlah file yang dihapus.
 */
export async function pruneStaleHdCache(
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<number> {
  if (!isNative()) return 0;
  try {
    const listing = await Filesystem.readdir({ path: '', directory: Directory.Cache });
    const now = Date.now();
    let removed = 0;
    const files = (listing as { files?: { name: string }[] }).files ?? [];
    for (const f of files) {
      const name = typeof f === 'string' ? f : f?.name;
      if (typeof name !== 'string' || !name.startsWith('kaoskami-hd-')) continue;
      const m = name.match(/^kaoskami-hd-(\d+)\.png$/);
      if (!m) continue;
      const born = Number(m[1]);
      if (!Number.isFinite(born) || now - born <= maxAgeMs) continue;
      try {
        await Filesystem.deleteFile({ path: name, directory: Directory.Cache });
        removed++;
      } catch {}
    }
    return removed;
  } catch {
    return 0;
  }
}

/**
 * M3 §6 — Ekspor foto HD 1080p dari kanvas studio.
 * C4 (owner, Sep 2026): paywall Pro dicabut total — ekspor selalu kualitas
 * penuh tanpa watermark, tanpa unlock, tanpa jatah kredit.
 */
export async function captureHDImage(): Promise<string> {
  const src = findStudioCanvas();
  if (!src) throw new Error('Kanvas 3D tidak ditemukan');
  // On-demand: buffer tak dipertahankan (hemat VRAM) → render segar dulu
  // di task yang sama agar drawImage tidak blank.
  renderStudioNow();
  const TARGET_W = 1080;
  const scale = TARGET_W / src.width;
  const out = document.createElement('canvas');
  out.width = TARGET_W;
  out.height = Math.round(src.height * scale);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak didukung');
  ctx.drawImage(src, 0, 0, out.width, out.height);
  const base64 = out.toDataURL('image/png').split(',')[1] ?? '';
  return persistAndShare(base64, `kaoskami-hd-${Date.now()}.png`, 'image/png');
}

/**
 * M3 §6 — Rekam turntable 360° (putaran penuh ±4 detik) untuk TikTok/IG.
 * Format per-platform (N2): iOS → MP4 (H.264), Android/web → WebM (VP9).
 * C4: selalu bitrate penuh 8 Mbps (tanpa tier Pro/free).
 * PERF: tier-low → 4 Mbps via opts (hemat encoder + ukuran file ~½, masih
 * tajam di layar HP). KeepAwake selama merekam agar layar tak sleep.
 */
export async function recordTurntable360(
  onProgress?: (msg: string) => void,
  opts?: { videoBitsPerSecond?: number }
): Promise<string> {
  const src = findStudioCanvas();
  if (!src) throw new Error('Kanvas 3D tidak ditemukan');
  const stream = (src as HTMLCanvasElement).captureStream?.(30);
  if (!stream) throw new Error('Perekaman tidak didukung di perangkat ini');
  const store = useMobileStudioStore.getState();
  const prev = store.activeAnimation;
  store.setActiveAnimation('spin');
  onProgress?.('Merekam putaran 360°…');
  void enableScreenKeepAwake();

  try {
    const target = pickRecordingTarget();
    const rec = new MediaRecorder(stream, {
      ...(target.mime ? { mimeType: target.mime } : {}),
      videoBitsPerSecond: opts?.videoBitsPerSecond ?? 8_000_000,
    });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const done = new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
    });
    rec.start(250);
    await new Promise((r) => setTimeout(r, 4200));
    rec.stop();
    await done;

    const blob = new Blob(chunks, { type: target.fileType });
    // FileReader native (audit: loop btoa manual O(n²) + boros memori untuk 4 detik video).
    const base64: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const url = String(fr.result || '');
        resolve(url.includes(',') ? url.split(',')[1]! : url);
      };
      fr.onerror = () => reject(new Error('Gagal baca video'));
      fr.readAsDataURL(blob);
    });
    onProgress?.('Menyimpan video…');
    return persistAndShare(base64, `kaoskami-360-${Date.now()}.${target.extension}`, target.fileType);
  } finally {
    store.setActiveAnimation(prev);
    void disableScreenKeepAwake();
  }
}
