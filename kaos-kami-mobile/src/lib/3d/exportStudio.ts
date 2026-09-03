import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';

function isNative(): boolean {
  try {
    return typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function findStudioCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector('#kk-studio canvas');
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.font = `700 ${Math.max(14, Math.round(w * 0.028))}px Syne, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  const text = 'KAOS KAMI MAKASSAR';
  const x = w - ctx.measureText(text).width - 24;
  const y = h - 24;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

async function persistAndShare(base64: string, fileName: string, mime: string): Promise<string> {
  if (isNative()) {
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
 * M3 §6 — Ekspor foto HD 1080p dari kanvas studio.
 * Free tier: watermark mikro digambar di hasil (sesuai M8 §4).
 */
export async function captureHDImage(isProUser = false): Promise<string> {
  const src = findStudioCanvas();
  if (!src) throw new Error('Kanvas 3D tidak ditemukan');
  const TARGET_W = 1080;
  const scale = TARGET_W / src.width;
  const out = document.createElement('canvas');
  out.width = TARGET_W;
  out.height = Math.round(src.height * scale);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak didukung');
  ctx.drawImage(src, 0, 0, out.width, out.height);
  if (!isProUser) drawWatermark(ctx, out.width, out.height);
  const base64 = out.toDataURL('image/png').split(',')[1] ?? '';
  return persistAndShare(base64, `kaoskami-hd-${Date.now()}.png`, 'image/png');
}

/**
 * M3 §6 — Rekam turntable 360° (putaran penuh ±4 detik, WebM) untuk TikTok/IG.
 */
export async function recordTurntable360(
  isProUser = false,
  onProgress?: (msg: string) => void
): Promise<string> {
  const src = findStudioCanvas();
  if (!src) throw new Error('Kanvas 3D tidak ditemukan');
  const stream = (src as HTMLCanvasElement).captureStream?.(30);
  if (!stream) throw new Error('Perekaman tidak didukung di perangkat ini');
  const store = useMobileStudioStore.getState();
  const prev = store.activeAnimation;
  store.setActiveAnimation('spin');
  onProgress?.('Merekam putaran 360°…');

  try {
    const mime = 'video/webm;codecs=vp9';
    const rec = new MediaRecorder(stream, {
      mimeType: (window as any).MediaRecorder?.isTypeSupported?.(mime) ? mime : undefined,
      videoBitsPerSecond: isProUser ? 8_000_000 : 2_500_000,
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

    const blob = new Blob(chunks, { type: 'video/webm' });
    const buf = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    onProgress?.('Menyimpan video…');
    return persistAndShare(base64, `kaoskami-360-${Date.now()}.webm`, 'video/webm');
  } finally {
    store.setActiveAnimation(prev);
  }
}
