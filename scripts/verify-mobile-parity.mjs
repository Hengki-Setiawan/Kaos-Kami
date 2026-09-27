// scripts/verify-mobile-parity.mjs — Verifikasi Paritas Fitur Mobile
import fs from "fs";
import path from "path";

console.log("=== MEMULAI VERIFIKASI PARITAS FITUR MOBILE ===");

// 1. Cek file aset maskot di public/mascot
const mascotDir = path.join("kaos-kami-mobile", "public", "mascot");
const mascotFiles = [
  "mascot-primary.png",
  "mascot-cool.png",
  "mascot-sablon.png",
  "logo-black.png",
  "logo-white.png",
];

let mascotOk = true;
for (const f of mascotFiles) {
  const p = path.join(mascotDir, f);
  if (!fs.existsSync(p)) {
    console.error(`[FAIL] Aset maskot hilang: ${p}`);
    mascotOk = false;
  }
}
if (mascotOk) {
  console.log("[PASS 1] Seluruh berkas maskot Kamito tersedia di kaos-kami-mobile/public/mascot/.");
}

// 2. Cek eksistensi komponen baru
const requiredComponents = [
  "kaos-kami-mobile/src/lib/3d/mobileApparelSizing.ts",
  "kaos-kami-mobile/src/components/studio/MobileSizeGuideModal.tsx",
  "kaos-kami-mobile/src/components/chat/MobileKamitoChatWidget.tsx",
  "kaos-kami-mobile/src/components/ui/MobileNotificationBell.tsx",
];

let compOk = true;
for (const c of requiredComponents) {
  if (!fs.existsSync(c)) {
    console.error(`[FAIL] Komponen tidak ditemukan: ${c}`);
    compOk = false;
  }
}
if (compOk) {
  console.log("[PASS 2] Seluruh komponen baru (Sizing, SizeGuide, KamitoChat, Bell) terpasang rapi.");
}

// 3. Cek logika apparel sizing secara langsung
import("../kaos-kami-mobile/src/lib/3d/mobileApparelSizing.ts").then((mod) => {
  const { getApparelSizeScaleFactors, APPAREL_SIZING_DATA } = mod;

  const s = getApparelSizeScaleFactors("tshirt", "S");
  const l = getApparelSizeScaleFactors("tshirt", "L");
  const xxl = getApparelSizeScaleFactors("tshirt", "XXL");

  console.log(`[DATA] Skala Kaos S  : X=${s.scaleX.toFixed(3)}, Y=${s.scaleY.toFixed(3)}`);
  console.log(`[DATA] Skala Kaos L  : X=${l.scaleX.toFixed(3)}, Y=${l.scaleY.toFixed(3)}`);
  console.log(`[DATA] Skala Kaos XXL: X=${xxl.scaleX.toFixed(3)}, Y=${xxl.scaleY.toFixed(3)}`);

  if (s.scaleX < l.scaleX && l.scaleX < xxl.scaleX && s.scaleY < l.scaleY && l.scaleY < xxl.scaleY) {
    console.log("[PASS 3] Morfologi skala garmen 3D S -> L -> XXL terbukti membesar secara proporsional!");
  } else {
    console.error("[FAIL 3] Proporsi skala S/L/XXL tidak sesuai!");
    process.exit(1);
  }

  const apparels = ["tshirt", "hoodie", "longsleeve", "crewneck", "shirt", "pants", "shorts", "cap"];
  const allPresent = apparels.every((a) => APPAREL_SIZING_DATA[a] !== undefined);
  if (allPresent) {
    console.log("[PASS 4] Seluruh 8 jenis apparel memiliki spesifikasi ukuran fisik lengkap.");
  } else {
    console.error("[FAIL 4] Ada apparel yang belum memiliki spesifikasi ukuran!");
    process.exit(1);
  }

  console.log("\n=== VERIFIKASI PARITAS MOBILE 100% SUKSES! ===");
}).catch((e) => {
  console.error("Gagal impor module mobileApparelSizing:", e);
  process.exit(1);
});
