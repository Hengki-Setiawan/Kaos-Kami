/**
 * Instant <10ms Canvas Chroma-Key algorithm to remove solid backgrounds (white or black JPGs)
 * Works client-side with 0KB extra bundle.
 */

export function removeSolidBackground(
  imageSource: string | HTMLImageElement,
  targetColor: "white" | "black" = "white",
  tolerance: number = 32
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          reject(new Error("Canvas 2D context not available"));
          return;
        }

        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const threshold = targetColor === "white" ? 255 - tolerance : tolerance;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;

          const isMatch =
            targetColor === "white"
              ? r >= threshold && g >= threshold && b >= threshold
              : r <= threshold && g <= threshold && b <= threshold;

          if (isMatch) {
            data[i + 3] = 0; // Set Alpha transparency to 0
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };

    if (typeof imageSource === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => processImage(img);
      img.onerror = (e) => reject(new Error("Failed to load image for background removal"));
      img.src = imageSource;
    } else {
      processImage(imageSource);
    }
  });
}
