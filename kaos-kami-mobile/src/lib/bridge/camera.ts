import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function pickOrCaptureDecalImage(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 92,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      width: 2048,
      height: 2048,
      correctOrientation: true,
    });

    return photo.dataUrl || null;
  } catch (err) {
    console.debug('[Camera] User cancelled selection:', err);
    return null;
  }
}
