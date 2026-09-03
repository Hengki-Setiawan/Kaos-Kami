"use client";
import * as THREE from "three";

/**
 * Micro-weave normal map generated at runtime on an HTML5 canvas.
 * Removes all dependency on external fabric-normal.jpg files.
 */
export function createFabricNormalMap(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base tangent-space normal color [128, 128, 255]
  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  // Ultra-subtle, smooth 24s/28s combed cotton knit loops (sine-based, anti-aliased)
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      // Smooth diagonal twill weave (gentle gradient, no harsh step frequencies)
      const u = (x / 512) * Math.PI * 64;
      const v = (y / 512) * Math.PI * 64;
      const waveX = Math.sin(u) * Math.cos(v) * 12;
      const waveY = Math.cos(u) * Math.sin(v) * 12;

      data[idx] = Math.max(0, Math.min(255, Math.floor(128 + waveX)));     // R (X normal)
      data[idx + 1] = Math.max(0, Math.min(255, Math.floor(128 + waveY))); // G (Y normal)
      data[idx + 2] = 255;                                                  // B (Z normal)
      data[idx + 3] = 255;                                                  // Alpha
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Default high-impact wordmark decal generated at runtime.
 * Removes all dependency on external default-artwork.png files.
 */
export function createWordmarkDecal(
  label = "KAOS KAMI",
  subtitle = "HEAVYWEIGHT · 240GSM"
): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 512);

  // Minimalist box background
  ctx.fillStyle = "rgba(18, 18, 20, 0.4)";
  ctx.fillRect(40, 160, 432, 192);

  // Subtle border hairline
  ctx.strokeStyle = "rgba(230, 81, 0, 0.75)";
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 160, 432, 192);

  // Primary bold wordmark
  ctx.fillStyle = "#F5F3EF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 52px 'Arial Black', 'Helvetica Neue', sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText(label.toUpperCase(), 256, 235);

  // Signal Tangerine subline
  ctx.font = "700 15px 'Courier New', monospace";
  ctx.fillStyle = "#E65100";
  ctx.letterSpacing = "4px";
  ctx.fillText(subtitle.toUpperCase(), 256, 295);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
