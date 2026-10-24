"use client";

import React, { useEffect, useRef } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";

export const STUDIO_TOUR_OPEN_EVENT = "kaoskami:open-tour";

export const StudioTour: React.FC = () => {
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    const handleOpen = () => {
      // Pastikan drawer terbuka dan tab sablon aktif agar elemen target terlihat jelas
      const store = useConfiguratorStore.getState();
      if (store.isDrawerCollapsed) {
        store.setIsDrawerCollapsed(false);
      }
      const tabDecalsBtn = document.getElementById("studio-tab-decals");
      tabDecalsBtn?.click();

      // Hancurkan instance lama jika ada
      if (driverRef.current) {
        try {
          driverRef.current.destroy();
        } catch {}
      }

      // Inisialisasi Driver.js Modern Interactive Studio Tour
      const driverObj = driver({
        animate: true,
        smoothScroll: true,
        showProgress: true,
        allowClose: true,
        overlayColor: "rgba(5, 8, 16, 0.82)",
        progressText: "Langkah {{current}} dari {{total}}",
        nextBtnText: "Lanjut →",
        prevBtnText: "Kembali",
        doneBtnText: "Mengerti",
        popoverClass: "driver-modern-studio-theme",
        steps: [
          {
            element: "#studio-side-dock",
            popover: {
              title: "Orientasi Sudut & Putar 3D",
              description:
                "Pilih sudut pandang Dada, Punggung, atau Lengan untuk rotasi kamera instan. Anda juga dapat memutar pakaian 360 derajat secara bebas dengan menyeret mouse atau sentuhan jari.",
              side: "top",
              align: "center",
            },
          },
          {
            element: "#studio-tab-decals",
            popover: {
              title: "Tab Sablon DTF",
              description:
                "Di tab Sablon, tekan Tambah Gambar untuk mengunggah artwork karya Anda, atau buat teks tipografi. Sistem secara otomatis memindai resolusi dan menghapus latar gambar.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#studio-canvas-stage",
            popover: {
              title: "Kotak Kontrol Gizmo 3D",
              description:
                "Klik sablon pada pakaian untuk mengaktifkan kotak kontrol. Seret untuk menggeser posisi, putar sudut, dan ubah ukuran dengan panduan dimensi nyata (cm) serta indikator batas aman jahitan.",
              side: "left",
              align: "center",
            },
          },
          {
            element: "#studio-btn-labkain",
            popover: {
              title: "Bahan & Karakter Kain",
              description:
                "Buka menu Bahan Kain untuk melihat kelenturan sablon terhadap tarikan kain, simulasi hembusan angin dinamis, serta pratinjau efek tinta khusus (Glow-in-the-dark & 3M Reflective).",
              side: "bottom",
              align: "end",
            },
          },
          {
            element: "#studio-btn-ekspor",
            popover: {
              title: "Ekspor Mockup & Media",
              description:
                "Unduh foto resolusi tinggi 2K tanpa watermark untuk materi promosi media sosial, kartu presentasi katalog, atau video putar 360 derajat sebelum masuk tahap cetak.",
              side: "bottom",
              align: "end",
            },
          },
          {
            element: "#studio-btn-pesan",
            popover: {
              title: "Pemesanan Produksi",
              description:
                "Setelah desain final, klik Pesan Sekarang untuk mengirim berkas pesanan ke workshop produksi kami di Makassar. Anda dapat membuka panduan ini kembali kapan saja via ikon tanda tanya (?) di menu atas.",
              side: "top",
              align: "end",
            },
          },
        ],
        onHighlightStarted: (element) => {
          if (!element) return;
        },
        onDestroyed: () => {
          driverRef.current = null;
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
    };

    window.addEventListener(STUDIO_TOUR_OPEN_EVENT, handleOpen);
    return () => {
      window.removeEventListener(STUDIO_TOUR_OPEN_EVENT, handleOpen);
      if (driverRef.current) {
        try {
          driverRef.current.destroy();
        } catch {}
      }
    };
  }, []);

  return (
    <style jsx global>{`
      /* Modern Minimalist Popover Theme (Apple / Linear Grade) */
      .driver-modern-studio-theme.driver-popover {
        background: rgba(15, 23, 42, 0.96) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 16px !important;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
        color: #f8fafc !important;
        padding: 18px 20px !important;
        max-width: 320px !important;
        font-family: var(--font-sans, system-ui, sans-serif) !important;
      }

      .driver-modern-studio-theme .driver-popover-title {
        font-size: 14.5px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        letter-spacing: -0.01em !important;
        margin-bottom: 6px !important;
        display: flex !important;
        align-items: center !important;
      }

      .driver-modern-studio-theme .driver-popover-description {
        font-size: 12.5px !important;
        line-height: 1.55 !important;
        color: #cbd5e1 !important;
        font-family: var(--font-sans, system-ui, sans-serif) !important;
        margin-bottom: 12px !important;
      }

      .driver-modern-studio-theme .driver-popover-close-btn {
        color: #94a3b8 !important;
        top: 14px !important;
        right: 14px !important;
        font-size: 16px !important;
        transition: color 0.15s ease !important;
      }

      .driver-modern-studio-theme .driver-popover-close-btn:hover {
        color: #ffffff !important;
      }

      .driver-modern-studio-theme .driver-popover-footer {
        margin-top: 12px !important;
        padding-top: 12px !important;
        border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }

      .driver-modern-studio-theme .driver-popover-progress-text {
        font-size: 11px !important;
        font-family: ui-monospace, monospace !important;
        font-weight: 600 !important;
        color: #94a3b8 !important;
      }

      .driver-modern-studio-theme .driver-popover-footer-btn {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        padding: 6px 14px !important;
        border-radius: 9px !important;
        transition: all 0.15s ease !important;
        cursor: pointer !important;
        font-family: var(--font-sans, system-ui, sans-serif) !important;
      }

      .driver-modern-studio-theme .driver-popover-next-btn {
        background: #2563eb !important;
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
      }

      .driver-modern-studio-theme .driver-popover-next-btn:hover {
        background: #1d4ed8 !important;
        transform: translateY(-1px) !important;
      }

      .driver-modern-studio-theme .driver-popover-prev-btn {
        background: rgba(255, 255, 255, 0.06) !important;
        color: #cbd5e1 !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
      }

      .driver-modern-studio-theme .driver-popover-prev-btn:hover {
        background: rgba(255, 255, 255, 0.12) !important;
        color: #ffffff !important;
      }

      .driver-modern-studio-theme .driver-popover-arrow {
        border-color: rgba(15, 23, 42, 0.96) !important;
      }

      /* Clean Spotlight Focus Ring */
      .driver-active-element {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25) !important;
        border-radius: 10px !important;
      }
    `}</style>
  );
};

/** Dipakai tombol "?" header studio untuk membuka ulang panduan interaktif. */
export function openStudioTour() {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(STUDIO_TOUR_OPEN_EVENT));
    }
  } catch {}
}
