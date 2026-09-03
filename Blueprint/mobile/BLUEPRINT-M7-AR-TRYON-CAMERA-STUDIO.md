# BLUEPRINT M7 — AR VIRTUAL TRY-ON LITE & NATIVE CAMERA STUDIO
Target agent: Claude 4.5 / GPT-5 / Cursor Composer / Antigravity
Depends on: M1, M2, M3, BLUEPRINT-02 (Mockup Studio Engine)
Version: 3.0 — Sep 2026 (Enterprise Deep Specification)
Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 0. EXECUTIVE SUMMARY & FILOSOFI AR LITE

Fitur Augmented Reality (AR) di e-commerce pakaian internasional (seperti Wanna.Fashion dan FitMockup) sering kali gagal di pasar Indonesia karena membutuhkan library neural body-tracking yang sangat berat (100MB+) dan membuat HP kelas menengah cepat panas (*thermal throttling*).

Kaos Kami mengadopsi pendekatan **AR Virtual Try-On Lite**:
1. **Zero-Lag Camera Passthrough:** Menggunakan native camera feed beresolusi 720p 60 FPS langsung di belakang kanvas 3D transparan.
2. **2.5D Body Anchor & Siluet Guide:** Menampilkan panduan siluet tubuh transparan di layar kamera. Pengguna menyelaraskan bahu mereka dengan panduan, dan model kaos 3D terproyeksikan secara proporsional.
3. **Real-time Lighting Estimation:** Menganalisis tingkat kecerahan rata-rata dari feed kamera video (`requestAnimationFrame`) untuk menyesuaikan intensitas lampu DirectionalLight Three.js agar baju terlihat menyatu alami dengan ruangan pengguna.
4. **1-Tap Social Snapshot:** Pengguna dapat mengambil foto selfie dengan baju 3D hasil desain mereka dan langsung membagikannya ke WhatsApp Status atau Instagram Story.

---

## 1. REAL-TIME LIGHTING ESTIMATION ENGINE

Menganalisis kecerahan piksel kamera setiap 30 frame untuk mengubah intensitas `ambientLight` dan `directionalLight` Three.js secara otomatis:

File: `src/lib/3d/lightingEstimation.ts`
```typescript
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
      // Formula Luminance ITU-R BT.709
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    const avg = totalLuminance / (16 * 16); // Nilai 0 s/d 255
    // Normalisasi ke multiplier intensitas lampu Three.js (0.6 s/d 2.0)
    return Math.max(0.6, Math.min(2.0, (avg / 128) * 1.2));
  } catch {
    return 1.2;
  }
}
```

---

## 2. AR PREVIEW STAGE COMPONENT UTUH

File: `src/components/3d/ARPreviewStage.tsx`
```tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { NativeBridge } from '@/bridge/NativeBridge';
import { computeAverageLuminance } from '@/lib/3d/lightingEstimation';
import { Camera as CameraIcon, FlipHorizontal, X, Share2 } from 'lucide-react';

interface ARPreviewStageProps {
  children: React.ReactNode;
  onClose: () => void;
  apparelName?: string;
}

export function ARPreviewStage({
  children,
  onClose,
  apparelName = 'Kaos Heavyweight Streetwear',
}: ARPreviewStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvas3DRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [ambientIntensity, setAmbientIntensity] = useState(1.2);
  const [isCapturing, setIsCapturing] = useState(false);

  // Inisialisasi Feed Kamera Native
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animFrameId: number;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        // Loop estimasi pencahayaan
        const checkLight = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            const lum = computeAverageLuminance(videoRef.current);
            setAmbientIntensity(lum);
          }
          animFrameId = requestAnimationFrame(checkLight);
        };
        animFrameId = requestAnimationFrame(checkLight);
      } catch (err) {
        console.warn('[AR Camera]: Gagal membuka kamera, menutup mode AR', err);
        onClose();
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      cancelAnimationFrame(animFrameId);
    };
  }, [facingMode, onClose]);

  const toggleCameraFacing = () => {
    NativeBridge.hapticTap('medium');
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  /**
   * Menggabungkan video feed background dan model 3D menjadi satu gambar foto komposit 1080x1920
   */
  const captureSnapshot = async () => {
    if (isCapturing || !videoRef.current) return;
    setIsCapturing(true);
    NativeBridge.hapticNotification('success');

    try {
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = 1080;
      compositeCanvas.height = 1920;
      const ctx = compositeCanvas.getContext('2d');

      if (ctx) {
        // 1. Gambar Feed Video Kamera
        ctx.save();
        if (facingMode === 'user') {
          // Flip horizontal untuk kamera selfie
          ctx.translate(compositeCanvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0, compositeCanvas.width, compositeCanvas.height);
        ctx.restore();

        // 2. Gambar Kanvas 3D di atasnya
        const threeCanvas = document.querySelector('.ar-3d-canvas canvas') as HTMLCanvasElement | null;
        if (threeCanvas) {
          ctx.drawImage(threeCanvas, 0, 0, compositeCanvas.width, compositeCanvas.height);
        }

        // 3. Watermark Mikro Kaos Kami
        ctx.font = 'bold 28px Syne, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.fillText('KAOS KAMI MAKASSAR — 3D TRY-ON', 40, 1860);

        const dataUrl = compositeCanvas.toDataURL('image/jpeg', 0.92);

        // 4. Buka Native Share Dialog ke WhatsApp / Instagram
        await NativeBridge.share(
          'Mockup Kaos Kami',
          `Lihat desain ${apparelName} saya di Kaos Kami Makassar!`,
          dataUrl
        );
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
      {/* 1. Feed Kamera Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover ${
          facingMode === 'user' ? '-scale-x-100' : ''
        }`}
      />

      {/* 2. Siluet Panduan Bahu (2.5D Body Anchor) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-72 h-80 border-2 border-dashed border-white/30 rounded-3xl opacity-60 flex flex-col items-center justify-between p-4">
          <span className="text-[11px] text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
            Garis Kerah & Bahu
          </span>
          <span className="text-[10px] text-zinc-300 bg-black/40 px-2 py-0.5 rounded-full">
            Sejajarkan tubuh Anda di dalam garis
          </span>
        </div>
      </div>

      {/* 3. Transparent 3D Canvas */}
      <div className="absolute inset-0 z-10 ar-3d-canvas">
        <Canvas
          ref={canvas3DRef}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          camera={{ position: [0, 0, 2.3], fov: 45 }}
        >
          <ambientLight intensity={ambientIntensity} />
          <directionalLight position={[2, 5, 2]} intensity={ambientIntensity * 1.2} />
          {children}
        </Canvas>
      </div>

      {/* 4. Top Header Controls */}
      <div className="relative z-20 pt-[var(--safe-top)] px-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
        <button
          onClick={toggleCameraFacing}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center active:scale-95"
        >
          <FlipHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* 5. Bottom Shutter Snapshot Action */}
      <div className="mt-auto relative z-20 pb-[calc(var(--safe-bottom)+1.5rem)] px-6 flex items-center justify-center">
        <button
          onClick={captureSnapshot}
          disabled={isCapturing}
          className="w-20 h-20 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-90 transition-transform shadow-2xl"
        >
          <div className="w-16 h-16 rounded-full bg-[#FF6B35] flex items-center justify-center text-white">
            <CameraIcon className="w-7 h-7" />
          </div>
        </button>
      </div>
    </div>
  );
}
```

---

## 3. MATRIKS EDGE CASE AR VIRTUAL TRY-ON

| Skenario Error | Dampak | Penanganan Otomatis | Pengalaman Pengguna (UX) |
| :--- | :--- | :--- | :--- |
| **Kamar Pengguna Sangat Gelap** | Baju 3D terlihat terlalu redup | Algoritma `computeAverageLuminance` mengunci batas minimum pada nilai `0.6` | Baju tetap terlihat jelas dan bertekstur |
| **Aplikasi Diminimize Saat Kamera Aktif** | Kamera terkunci di background | Hook cleanup otomatis mematikan seluruh video tracks | Baterai HP hemat, kamera tidak tertahan |
| **Kamera Depan Menghasilkan Gambar Terbalik** | Logo sablon tampak terbaca mundur (*mirroring*) | CSS `-scale-x-100` pada video dan pembalikan koordinat komposit kanvas | Logo sablon terbaca dengan orientasi normal |

---

## 4. ACCEPTANCE CRITERIA
- [ ] Kamera HP terbuka instan (< 500 ms) tanpa distorsi rasio aspek.
- [ ] Model 3D terproyeksikan secara transparan di atas tubuh pengguna.
- [ ] Estimasi pencahayaan otomatis menyesuaikan lampu Three.js saat ruangan terang/gelap.
- [ ] Tombol shutter menghasilkan foto komposit 1080x1920 dan membuka sheet berbagi native ke WhatsApp Status.
