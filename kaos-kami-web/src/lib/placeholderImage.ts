"use client";

/**
 * Brand-consistent generated placeholder image data URL.
 * Used whenever a sourced image is missing or loading fails.
 * Self-heals seamlessly on the client with no broken image box.
 */
export function generatePlaceholderImage(caption: string, seed = 0): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const hueShift = (seed * 37) % 40;
  const grad = ctx.createLinearGradient(0, 0, 0, 1000);
  grad.addColorStop(0, `hsl(${220 + hueShift}, 10%, 16%)`);
  grad.addColorStop(1, `hsl(${220 + hueShift}, 12%, 8%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 1000);

  // Technical grid overlay
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  for (let y = 40; y < 1000; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(800, y);
    ctx.stroke();
  }
  for (let x = 40; x < 800; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1000);
    ctx.stroke();
  }

  // Crosshair graphic
  ctx.strokeStyle = "rgba(230, 81, 0, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(380, 440);
  ctx.lineTo(420, 440);
  ctx.moveTo(400, 420);
  ctx.lineTo(400, 460);
  ctx.stroke();

  // Typography
  ctx.fillStyle = "#E65100";
  ctx.font = "700 16px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(caption.toUpperCase(), 400, 510);

  ctx.fillStyle = "rgba(245, 243, 239, 0.5)";
  ctx.font = "400 12px 'Courier New', monospace";
  ctx.fillText("// EDITORIAL ARCHIVE / KAOS KAMI", 400, 540);

  return canvas.toDataURL("image/png");
}
