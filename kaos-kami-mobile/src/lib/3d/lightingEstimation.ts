export function computeAverageLuminance(videoElement: HTMLVideoElement): number {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 1.0;

    ctx.drawImage(videoElement, 0, 0, 16, 16);
    const imgData = ctx.getImageData(0, 0, 16, 16);
    const data = imgData.data;

    let totalLuminance = 0;
    for (let i = 0; i < data.length; i += 4) {
      // ITU-R BT.709 Luminance formula
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    const avg = totalLuminance / (16 * 16); // Range: 0 to 255
    // Normalize to Three.js light intensity multiplier (0.6 to 2.0)
    return Math.max(0.6, Math.min(2.0, (avg / 128) * 1.2));
  } catch {
    return 1.2;
  }
}
