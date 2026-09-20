import { Share } from '@capacitor/share';

// Rantai fallback: Capacitor Share (native) → Web Share API
// (navigator.share, mobile browser) → clipboard (copy link) → diam.
// Return true bila lembar share tampil, false bila hanya copy-link/batal.
// Pemanggil lama yang mengabaikan return tetap aman (boolean diabaikan).
export async function shareCustomDesign(
  designId: string,
  apparelTitle: string = 'Kaos Custom 3D'
): Promise<boolean> {
  const url = `https://kaoskami.biz.id/studio?designId=${designId}`;
  const text = `Lihat desain 3D Kaos Kami ini! Keren untuk sablon DTF:`;

  try {
    await Share.share({
      title: apparelTitle,
      text,
      url,
      dialogTitle: 'Bagikan Desain ke WhatsApp / Instagram',
    });
    return true;
  } catch (capErr) {
    // Gagal/batal di native (atau jalan di web preview) → coba Web Share API.
    try {
      if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
        await (navigator as any).share({ title: apparelTitle, text, url });
        return true;
      }
    } catch {
      // Pengguna membatalkan lembar share web → anggap batal, jangan berisik.
      return false;
    }
    // Terakhir: salin link ke clipboard agar pengguna tetap bisa bagikan manual.
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text} ${url}`);
        return false;
      }
    } catch {
      // Clipboard diblokir (iframe non-secure) → diam saja.
    }
    console.debug('[Share] Share unavailable, link ready to copy:', url, capErr);
    return false;
  }
}

export async function shareText(
  title: string,
  text: string,
  dialogTitle: string = 'Bagikan'
): Promise<boolean> {
  try {
    await Share.share({
      title,
      text,
      dialogTitle,
    });
    return true;
  } catch (err) {
    try {
      if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
        await (navigator as any).share({ title, text });
        return true;
      }
    } catch {
      return false;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return false;
      }
    } catch {}
    return false;
  }
}

