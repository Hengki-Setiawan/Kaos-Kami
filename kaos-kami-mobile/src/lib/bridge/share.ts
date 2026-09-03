import { Share } from '@capacitor/share';

export async function shareCustomDesign(designId: string, apparelTitle: string = 'Kaos Custom 3D') {
  try {
    await Share.share({
      title: apparelTitle,
      text: `Lihat desain 3D Kaos Kami ini! Keren untuk sablon DTF:`,
      url: `https://kaos-kami-3d.hengkisetiawan461.workers.dev/render/${designId}`,
      dialogTitle: 'Bagikan Desain ke WhatsApp / Instagram',
    });
  } catch (err) {
    console.debug('[Share] User cancelled sharing:', err);
  }
}
