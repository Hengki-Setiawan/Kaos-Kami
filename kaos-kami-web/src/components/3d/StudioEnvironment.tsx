"use client";

import React, { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { LIGHTING_TINTS } from "@/lib/constants";

// M-QA: IBL prosedural TANPA UNDUHAN. QA browser headless membuktikan preset
// CDN drei (potsdamer_platz via raw.githubusercontent) gagal
// ERR_CONNECTION_RESET di jaringan terbatas → studio kehilangan IBL.
// KEPUTUSAN (11 Sep 2026): PERTAHANKAN IBL prosedural — (1) tak ada file HDR
// lokal <300KB di repo (public/*.hdr|*.exr = nol, diverifikasi), (2) preset
// CDN drei rapuh (bukti QA di atas). Jangan reintroduce <Environment preset>
// / unduh HDR tanpa file lokal kecil yang terverifikasi.
// Pengganti: kanvas equirect 512x256 digambar sekali (langit gelap +
// softbox terang atas/kiri/kanan + pantulan lantai hangat), lalu PMREM →
// scene.environment. Nol byte jaringan, jalan offline, deterministik,
// biaya sekali jalan (~10-30ms, jauh di bawah unduh HDR).
/** Pola eksklusif Sep 2026: tint mood SAJA (tanpa HDR/unduhan).
 * golden/sunset hangat, gallery netral terang. Lampu tak disentuh. */
function buildStudioEquirect(tint: string | null, isLight = false): HTMLCanvasElement {
  const W = 512;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Langit studio — gelap obsidian vs terang gallery (hanya warna, tanpa ubah three logic).
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (isLight) {
    sky.addColorStop(0, "#F5F4F0");
    sky.addColorStop(0.45, "#E9E7E1");
    sky.addColorStop(0.75, "#DDDAD2");
    sky.addColorStop(1, "#D0CCC2");
  } else {
    sky.addColorStop(0, "#3a3f4a");
    sky.addColorStop(0.45, "#141418");
    sky.addColorStop(0.75, "#0c0c0e");
    sky.addColorStop(1, "#060607");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Softbox = radial gradient putih (didukung semua browser, tanpa ctx.filter).
  const softbox = (x: number, y: number, r: number, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,252,245,${alpha})`);
    g.addColorStop(0.55, `rgba(240,238,230,${alpha * 0.45})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  softbox(W * 0.5, H * 0.16, 120, 1.0); // key atas (paling terang)
  softbox(W * 0.12, H * 0.42, 60, 0.55); // strip kiri
  softbox(W * 0.88, H * 0.42, 60, 0.55); // strip kanan
  softbox(W * 0.5, H * 0.3, 200, 0.18); // isi lembut tengah

  // Pantulan lantai hangat (bounce untuk kain bawah).
  const floor = ctx.createLinearGradient(0, H * 0.72, 0, H);
  floor.addColorStop(0, "rgba(42,33,24,0)");
  floor.addColorStop(1, "rgba(66,50,32,0.55)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, H * 0.72, W, H * 0.28);

  // Tint mood: overlay tipis agar suasana berubah tanpa HDR baru.
  if (tint) {
    ctx.save();
    ctx.globalAlpha = tint === "#ffffff" ? 0.1 : 0.14;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  return canvas;
}

/** Pasang IBL prosedural ke scene. Aman dipanggil di semua tier. */
export const StudioEnvironment: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  // Tint saja per mood — lampu StudioLighting tak disentuh (fallback aman).
  const lightingPreset = useConfiguratorStore((s) => s.lightingPreset);
  const studioTheme = useConfiguratorStore((s) => s.studioTheme);
  const isLight = studioTheme === "gallery";
  const tint = LIGHTING_TINTS[lightingPreset] ?? null;
  useEffect(() => {
    let disposed = false;
    let rt: THREE.WebGLRenderTarget | null = null;
    let tex: THREE.CanvasTexture | null = null;
    try {
      tex = new THREE.CanvasTexture(buildStudioEquirect(tint, isLight));
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      const pmrem = new THREE.PMREMGenerator(gl);
      pmrem.compileEquirectangularShader();
      rt = pmrem.fromEquirectangular(tex);
      if (!disposed && rt) {
        scene.environment = rt.texture;
        invalidate();
      }
      pmrem.dispose();
    } catch {
      // Gagal = lampu prosedural tetap jalan (tanpa IBL, tanpa blank).
    }
    return () => {
      disposed = true;
      try {
        if (scene.environment) scene.environment = null;
        rt?.dispose();
        tex?.dispose();
      } catch {
        /* abaikan */
      }
    };
  }, [gl, scene, invalidate, tint, isLight]);
  return null;
};
