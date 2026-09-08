import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function pickOrCaptureDecalImage(): Promise<string | null> {
  try {
    // 1600px/q85: cukup untuk decal 30cm @ ~135DPI, hemat RAM HP kentang
    // (2048px dataUrl base64 ≈ 5MB+ per salinan di memori).
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      width: 1600,
      height: 1600,
      correctOrientation: true,
    });

    return photo.dataUrl || null;
  } catch (err) {
    console.debug('[Camera] User cancelled selection:', err);
    return null;
  }
}
