"use client";

import React, { useEffect, useRef, useState } from "react";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useShallow } from "zustand/shallow";
import {
  MAKASSAR_DELIVERY_OPTIONS,
  MAKASSAR_SUBDISTRICTS,
  PRODUCTION_TURNAROUND_OPTIONS,
  type DeliveryMethod,
} from "@/lib/shipping/deliveryOptions";
import { calculate6VariablePrice, materialFinishToPricing } from "@/lib/pricingEngine";
import { APPAREL_CATALOG, PRODUCT_COLORS, type ApparelType } from "@/lib/constants";
import {
  X,
  ShoppingBag,
  MapPin,
  Truck,
  Clock,
  CreditCard,
  Phone,
  User,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import { useCartStore } from "@/store/useCartStore";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { fetchJson } from "@/lib/fetchJson";
import { fetchServerPriceMap, formatIdr } from "@/lib/cartPriceRefresh";
import { getMasterDataUrl, isHttpsMasterUrl } from "@/lib/imageEditPipeline";
// Normalisasi phone ID (08…/62…) SEBELUM submit/OTP agar lolos regex
// backend (spasi/strip/(…)/+ tengah bikin 400 walau nomor benar).
import { normalizePhoneId } from "@/lib/phone";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutMode?: "custom-3d" | "cart";
}

// P0-2: Idempotency-Key UNIK per klik BAYAR (zero-dep — JANGAN tambah dep
// client hanya untuk ini). Format UUID lolos regex server
// /^[A-Za-z0-9\-_.:]{8,128}$/ (checkout route baca header "idempotency-key").
function newIdempotencyKey(): string {
  try {
    const u = globalThis?.crypto?.randomUUID?.();
    if (typeof u === "string" && u.length >= 8) return u;
  } catch {
    // abaikan — pakai fallback di bawah
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  checkoutMode = "custom-3d",
}) => {
  const {
    activeApparel,
    selectedColor,
    activeColorName,
    selectedSize,
    decals,
    materialFinish,
  } = useConfiguratorStore(
    useShallow((s) => ({
      activeApparel: s.activeApparel,
      selectedColor: s.selectedColor,
      activeColorName: s.activeColorName,
      selectedSize: s.selectedSize,
      decals: s.decals,
      materialFinish: s.materialFinish,
    }))
  );

  const { items: cartItems, getTotalPrice: getCartTotalPrice, clearCart } = useCartStore(
    useShallow((s) => ({
      items: s.items,
      getTotalPrice: s.getTotalPrice,
      clearCart: s.clearCart,
    }))
  );

  const isCartCheckout = checkoutMode === "cart" && cartItems.length > 0;

  const [quantity, setQuantity] = useState(1);
  const [useCustomSizeBreakdown, setUseCustomSizeBreakdown] = useState(false);
  // KEPUTUSAN XXXL (HIGH-6, fail-closed ke XXL): kunci XXXL SENGAJA tak ada
  // di rincian ini. Bukti tak ada varian DB: seed (prisma/seed.ts) hanya
  // L/M/XL, APPAREL_CATALOG.sizes + SIZES (lib/constants.ts) maks XXL.
  // JANGAN tambah tanpa varian DB + pola size chart. Surcharge XXXL di
  // pricingEngine tetap (SSOT harga, jangan ubah).
  const [sizeDistribution, setSizeDistribution] = useState<Record<string, number>>({
    S: 0,
    M: 0,
    L: 1,
    XL: 0,
    XXL: 0,
  });

  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("PICKUP");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [district, setDistrict] = useState(MAKASSAR_SUBDISTRICTS[0] || "Tallo");
  const [fullAddress, setFullAddress] = useState("");
  const [courierNotes, setCourierNotes] = useState("");
  const [turnaroundTier, setTurnaroundTier] = useState<"REGULER" | "EXPRESS_24H">("REGULER");
  // Kode kupon (opsional) — validasi + potongan 100% dihitung server.
  const [couponCode, setCouponCode] = useState("");
  // Ekspedisi luar kota: autocomplete kota→kode pos + daftar kurir server.
  // Harga tampil = estimasi; FINAL di-resolve server saat checkout.
  interface QuoteOption {
    key: string;
    courier: string;
    service: string;
    cost: number;
    etd: string;
    source: "live" | "zone";
    zoneId?: string;
    courierCode?: string;
    serviceCode?: string;
  }
  const [destQuery, setDestQuery] = useState("");
  const [locSuggest, setLocSuggest] = useState<{ postalCode: string; label: string }[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [selectedPostal, setSelectedPostal] = useState("");
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [quoteSource, setQuoteSource] = useState<"live" | "zone" | "">("");
  const [selectedQuoteKey, setSelectedQuoteKey] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Harga cart bisa basi (localStorage lama): refresh dari katalog segar saat
  // modal dibuka + ulang tepat sebelum POST; selisih tampil eksplisit.
  const [cartPriceNotice, setCartPriceNotice] = useState<{ oldTotal: number; newTotal: number; diff: number } | null>(null);
  const [cartPriceChecking, setCartPriceChecking] = useState(false);
  // Token anti-bot Turnstile (opsional — wajib hanya bila server mengonfigurasi secret).
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = !!process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

  // A11y dialog (tiru AuthModal/BottomSheet): ESC-to-close, fokus awal ke
  // tombol tutup, focus-trap Tab sederhana di dalam panel modal.
  // Hook SEBELUM early-return `if (!isOpen)` agar urutan hook stabil.
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Refresh harga cart dari katalog segar sekali per pembukaan modal.
  useEffect(() => {
    if (!isOpen || !isCartCheckout) {
      setCartPriceNotice(null);
      return;
    }
    let alive = true;
    setCartPriceChecking(true);
    (async () => {
      try {
        const before = useCartStore.getState().items.reduce((a, it: any) => a + (it.priceIdr || 0) * (it.quantity || 0), 0);
        const map = await fetchServerPriceMap(10000);
        if (!alive || Object.keys(map).length === 0) return;
        const { diffIdr } = useCartStore.getState().syncPrices(map);
        if (!alive) return;
        const after = useCartStore.getState().items.reduce((a, it: any) => a + (it.priceIdr || 0) * (it.quantity || 0), 0);
        setCartPriceNotice(diffIdr !== 0 ? { oldTotal: before, newTotal: after, diff: diffIdr } : null);
      } finally {
        if (alive) setCartPriceChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isCartCheckout]);

  // WA OTP saat bayar (hemat Fonnte: cuma 1x per checkout, bukan per daftar)
  // Normalisasi dulu (strip spasi/strip/+) agar nomor benar tak ditolak 400.
  const handleSendOtp = async () => {
    const norm = normalizePhoneId(phoneNumber);
    if (norm) setPhoneNumber(norm);
    if (!norm || norm.replace(/[^0-9]/g, "").length < 9) {
      setOtpMsg("Isi WA dulu (contoh: 081234567890)");
      return;
    }
    setIsSendingOtp(true);
    setOtpMsg(null);
    try {
      const data = await fetchJson<{ success?: boolean; mock?: boolean; code?: string }>("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: norm }),
      });
      setOtpSent(true);
      // Kode mock HANYA tampil di dev lokal; server prod tidak pernah mengirim code.
      const showMock = data.mock && data.code && process.env.NODE_ENV !== "production";
      setOtpMsg(showMock ? `Kode mock: ${data.code} (Fonnte mock)` : "Kode OTP terkirim ke WA");
    } catch (e: any) {
      setOtpMsg(e?.message || "Gagal kirim OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };
  // P0-3: JANGAN panggil /api/auth/verify-otp di sini — endpoint itu MENGHAPUS
  // kode satu-pakai (verify-otp route menghapus `otp:<clean>`), sehingga POST
  // /api/checkout sesudahnya pasti 401 "kadaluarsa". Satu-satunya pengonsumsi
  // kode adalah gerbang OTP checkout itu sendiri. Tombol ini hanya cek format
  // lokal; verifikasi sebenarnya terjadi di server saat klik BAYAR.
  const handleVerifyOtp = () => {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setOtpMsg("Isi kode 6 digit dari WA dulu");
      return;
    }
    setIsPhoneVerified(true);
    setOtpMsg("Kode 6 digit siap — klik BAYAR, server yang verifikasi");
  };

  // Update total quantity when size distribution changes
  const handleSizeCountChange = (sizeKey: string, delta: number) => {
    const nextVal = Math.max(0, (sizeDistribution[sizeKey] || 0) + delta);
    const nextDist = { ...sizeDistribution, [sizeKey]: nextVal };
    setSizeDistribution(nextDist);
    const sum = Object.values(nextDist).reduce((a, b) => a + b, 0);
    setQuantity(Math.max(1, sum));
  };

  // Dynamic 6-Variable Pricing (K-F): pigmen dari PRODUCT_COLORS + kain
  // dari materialFinish store — SELARAS drawer & server (dulu pigmen Rp0 di struk).
  const matchedCheckoutColor = PRODUCT_COLORS.find(
    (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
  );
  const checkoutMaterial = materialFinishToPricing(materialFinish);
  const pricing = calculate6VariablePrice({
    apparelSlug: activeApparel,
    fabricThicknessSlug: checkoutMaterial.fabricThicknessSlug,
    size: selectedSize,
    colorHex: selectedColor,
    isSpecialPigment: !!matchedCheckoutColor?.isSpecialPigment,
    decals,
    quantity,
  });

  const selectedDelivery = MAKASSAR_DELIVERY_OPTIONS.find((d) => d.method === deliveryMethod);
  // Berat estimasi-mo: ±250g per pcs (konsisten dengan server).
  const totalQty = isCartCheckout
    ? cartItems.reduce((a, c: any) => a + (c.quantity || 0), 0)
    : quantity;
  const selectedQuote = quotes.find((q) => q.key === selectedQuoteKey) || null;
  const shippingCost =
    deliveryMethod === "EXPEDITION_MANUAL" && selectedQuote
      ? selectedQuote.cost
      : selectedDelivery?.costIdr || 0;

  // Autocomplete kota → kode pos (proxy server, key aman).
  const handleDestSearch = async (q: string) => {
    setDestQuery(q);
    setSelectedPostal("");
    setQuotes([]);
    setSelectedQuoteKey("");
    if (q.trim().length < 3) {
      setLocSuggest([]);
      return;
    }
    setLocLoading(true);
    try {
      const j = await fetchJson<{ locations?: { postalCode: string; label: string }[] }>(
        `/api/shipping/locations?q=${encodeURIComponent(q.trim())}`,
        undefined,
        10000
      );
      // 503 tanpa key = saran mati, user ketik manual (quote tetap jalan via zona).
      if (Array.isArray(j.locations)) setLocSuggest(j.locations.slice(0, 6));
      else setLocSuggest([]);
    } catch {
      setLocSuggest([]);
    } finally {
      setLocLoading(false);
    }
  };

  // Ambil daftar kurir (live bila key ada, else tabel zona).
  const handleCheckOngkir = async () => {
    setQuoteMsg(null);
    if (!selectedPostal && destQuery.trim().length < 2) {
      setQuoteMsg("Pilih kota dari saran atau ketik manual min. 2 huruf.");
      return;
    }
    setQuoteLoading(true);
    try {
      const params = new URLSearchParams({
        city: destQuery.trim(),
        weightGrams: String(Math.max(250, totalQty * 250)),
      });
      if (selectedPostal) params.set("postalCode", selectedPostal);
      const j = await fetchJson<any>(`/api/shipping/quote?${params.toString()}`, undefined, 20000);
      if (j.source === "live" && Array.isArray(j.rates)) {
        setQuoteSource("live");
        const opts: QuoteOption[] = j.rates.map((x: any, i: number) => ({
          key: `live:${x.courierCode}:${x.serviceCode}`,
          courier: x.courierName,
          service: x.serviceName,
          cost: x.costIdr,
          etd: x.etdText,
          source: "live" as const,
          courierCode: x.courierCode,
          serviceCode: x.serviceCode,
        }));
        setQuotes(opts);
        setSelectedQuoteKey(opts[0]?.key || "");
        if (!opts.length) setQuoteMsg("Tarif tidak ditemukan untuk kode pos ini.");
      } else if (Array.isArray(j.zones)) {
        setQuoteSource("zone");
        const opts: QuoteOption[] = j.zones.map((z: any) => ({
          key: `zone:${z.id}`,
          courier: z.courier,
          service: `${z.service} — ${z.city}`,
          cost: z.costIdr,
          etd: z.etdLabel,
          source: "zone" as const,
          zoneId: z.id,
        }));
        setQuotes(opts);
        setSelectedQuoteKey(opts[0]?.key || "");
        if (!opts.length) setQuoteMsg("Tarif tidak ditemukan.");
      } else {
        setQuoteMsg("Respons ongkir tak dikenal. Coba lagi.");
      }
    } catch (e: any) {
      setQuoteMsg(e?.message || "Gagal cek ongkir. Coba lagi.");
    } finally {
      setQuoteLoading(false);
    }
  };

  // GPS via proxy server (bukan direct Nominatim dari browser).
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsMsg("GPS tidak didukung browser ini.");
      return;
    }
    setGpsLoading(true);
    setGpsMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const j = await fetchJson<{ result?: { displayName?: string; district?: string; city?: string } }>(
            `/api/geocode/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            undefined,
            12000
          );
          const g = j?.result;
          if (g?.displayName) setFullAddress(g.displayName);
          if (g?.district && MAKASSAR_SUBDISTRICTS.includes(g.district)) setDistrict(g.district);
          if (g?.city && deliveryMethod === "EXPEDITION_MANUAL") handleDestSearch(g.city);
          setGpsMsg(g ? `Lokasi: ${[g.district, g.city].filter(Boolean).join(", ") || "terisi"}` : "Gagal baca lokasi. Isi manual.");
        } catch (e: any) {
          setGpsMsg(e?.message || "Gagal baca lokasi. Isi manual.");
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setGpsMsg("Izin lokasi ditolak. Isi manual.");
      },
      { timeout: 15000, maximumAge: 60000 }
    );
  };

  const selectedTurnaround = PRODUCTION_TURNAROUND_OPTIONS.find((t) => t.tier === turnaroundTier);
  const turnaroundSurcharge = selectedTurnaround?.surchargeIdr || 0;

  const effectiveSubtotal = isCartCheckout ? getCartTotalPrice() : pricing.totalPriceIdr;
  const grandTotal = effectiveSubtotal + shippingCost + turnaroundSurcharge;

  if (!isOpen) return null;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Normalisasi SEBELUM validasi/submit: "0812-3456 7890" / "+62 812…"
    // umum dari keyboard HP lolos regex ID backend setelah dibersihkan.
    const normPhone = normalizePhoneId(phoneNumber);
    if (normPhone) setPhoneNumber(normPhone);

    if (!recipientName.trim()) {
      setErrorMessage("Nama penerima wajib diisi.");
      return;
    }
    if (!normPhone || normPhone.replace(/[^0-9]/g, "").length < 9) {
      setErrorMessage("Nomor WhatsApp tidak valid (contoh: 081234567890).");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage("Format email tidak valid.");
      return;
    }
    if (deliveryMethod !== "PICKUP" && !fullAddress.trim()) {
      setErrorMessage("Alamat lengkap pengiriman wajib diisi.");
      return;
    }
    if (deliveryMethod === "EXPEDITION_MANUAL" && !selectedQuote) {
      setErrorMessage("Cek ongkir & pilih kurir dulu untuk ekspedisi luar kota.");
      return;
    }

    // Fase 13: cegah pesan item yang belum dijual (cap/pants/shorts) di
    // client — server tetap menolak 400 (fail-closed bila client lama dilewati).
    {
      const slugs: string[] = isCartCheckout
        ? (cartItems as any[]).map((it) => String(it?.apparelSlug ?? ""))
        : [String(activeApparel)];
      const blocked = slugs.find((s) => !APPAREL_CATALOG[s as ApparelType]?.orderable);
      if (blocked) {
        const opt = APPAREL_CATALOG[blocked as ApparelType];
        const reason = !opt
          ? `Apparel "${blocked}" tidak dikenal.`
          : !opt.mockupEnabled
            ? `${opt.name} belum tersedia — mockup 3D maupun pemesanan SEGERA hadir.`
            : `${opt.name} belum bisa dipesan — mockup 3D-nya bisa dicoba di studio, tapi pemesanan SEGERA dibuka.`;
        setErrorMessage(reason);
        return;
      }
    }

    // P0-3: server WAJIBKAN otpCode 6-digit (401 bila tanpa/salah/kadaluarsa,
    // 403 bila OTP milik nomor lain). Validasi di sini agar tak POST sia-sia —
    // ditaruh SETELAH semua cek murah lain (nama/alamat/ongkir/katalog).
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setErrorMessage("Kode OTP 6 digit wajib — klik KIRIM OTP, cek WA, lalu isi kodenya sebelum bayar.");
      return;
    }

    try {
      setIsLoading(true);

      // Anti harga basi (cart): refresh harga dari katalog segar TEPAT sebelum
      // POST. Bila berubah, sinkronkan store + tampilkan selisih eksplisit dan
      // BATALKAN submit ini — user klik BAYAR sekali lagi dengan total segar.
      // (Payload cart tak membawa harga; server otoritatif, tapi user wajib
      // tahu total berubah sebelum bayar.)
      if (isCartCheckout) {
        try {
          const before = useCartStore.getState().items.reduce((a, it: any) => a + (it.priceIdr || 0) * (it.quantity || 0), 0);
          const map = await fetchServerPriceMap(10000);
          if (Object.keys(map).length > 0) {
            const { diffIdr } = useCartStore.getState().syncPrices(map);
            if (diffIdr !== 0) {
              const after = useCartStore.getState().items.reduce((a, it: any) => a + (it.priceIdr || 0) * (it.quantity || 0), 0);
              setCartPriceNotice({ oldTotal: before, newTotal: after, diff: diffIdr });
              setErrorMessage(
                `Harga katalog baru saja berubah (selisih ${formatIdr(diffIdr)}). Total kini Rp ${after.toLocaleString("id-ID")}. Periksa lalu klik BAYAR sekali lagi untuk lanjut.`
              );
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Refresh gagal = lanjut dengan harga lokal (server validasi ulang).
        }
      }

      // K2: master produksi WAJIB https R2 (bukan base64). Upload pending
      // base64 dulu (login: /api/upload/r2 kind=master; guest: gagal 401 →
      // undefined, server fallback ke preview via archiveDecalsToR2 +
      // confirmOrder byDecal→bySide→preview). Best-effort, tak gagalkan checkout.
      // Dipakai di CheckoutModal (drawer desktop + BottomSheet mobile SAMA —
      // keduanya membuka modal ini) + mobile APK via /api/mobile/orders/checkout
      // (menerima masterAssetUrl yang sama; APK lama tanpa field tetap lolos).
      let masterForPayload: Record<string, string> | undefined;
      if (!isCartCheckout) {
        try {
          const pipe = await import("@/lib/imageEditPipeline");
          await pipe.ensureDecalMastersUploaded().catch(() => ({}));
          const m = pipe.buildCheckoutMasterMap(activeApparel);
          if (m && Object.keys(m).length > 0) {
            masterForPayload = m;
            console.info(`[checkout] master map: ${Object.keys(m).length} entri https terlampir.`);
          } else {
            console.info(
              "[checkout] tanpa master https (drawer tanpa ekspor / guest) — server arsipkan decals + fallback preview, checkout tetap lanjut."
            );
          }
        } catch (err: any) {
          console.warn("[checkout] buildCheckoutMasterMap gagal, lanjut tanpa master:", err?.message);
          masterForPayload = undefined;
        }
      } else {
        // GAP cart (teamwear via keranjang): item custom versi lama tak bawa
        // master per-item. Best-effort: upload pending base64 dulu (paritas
        // jalur custom-3d di atas — tanpa ini map cart selalu kosong walau
        // login), lalu tempel map decal:https yang sama ke item custom tanpa
        // master sendiri; bila map kosong, server tetap arsipkan decals
        // base64 ke R2 (checkout tak pernah gagal karena ini).
        // Sumber map: buildCheckoutMasterMap() → collectDecalMasters()
        // (registry masterMem + LS `decal:<id>`), hanya https yang ikut.
        try {
          const pipe = await import("@/lib/imageEditPipeline");
          await pipe.ensureDecalMastersUploaded().catch(() => ({}));
          const m = pipe.buildCheckoutMasterMap();
          if (m && Object.keys(m).length > 0) {
            masterForPayload = m;
            console.info(`[checkout] master map cart: ${Object.keys(m).length} entri https (fallback item custom).`);
          } else {
            console.info("[checkout] cart tanpa master https — server arsipkan decals + fallback preview.");
          }
        } catch (err: any) {
          console.warn("[checkout] master map cart gagal, lanjut tanpa master:", err?.message);
          masterForPayload = undefined;
        }
      }

      const itemsPayload = isCartCheckout
        ? cartItems.map((item) => ({
            apparelSlug: (item.apparelSlug as any) || "tshirt",
            productVariantId: item.productVariantId,
            colorHex: item.colorHex || "#121214",
            colorName: item.colorName || "Obsidian Black",
            size: item.size || "L",
            quantity: item.quantity,
            // M4.1 teamwear: teruskan decal personal + finish kain (item katalog
            // tak punya field ini → []/undefined = perilaku lama; tanpa
            // productVariantId server menghitung harga custom otoritatif).
            // printPx ikut di dalam decals (schema izinkan opsional) agar
            // aspek server tak fallback 1.0 untuk artwork non-kotak.
            decals: Array.isArray((item as any).decals) ? (item as any).decals : [],
            materialFinishSlug: (item as any).materialFinishSlug,
            fabricThicknessSlug: (item as any).fabricThicknessSlug,
            title: item.name,
            // Cart custom (tanpa varian) + ada map https → tempel fallback yang
            // sama; item katalog (ada varian) tak perlu master.
            ...(!item.productVariantId && masterForPayload ? { masterAssetUrl: masterForPayload } : {}),
          }))
        : useCustomSizeBreakdown
        ? // Rincian ukuran = item terpisah per size agar surcharge size tepat.
          // K-F: kain/finish ikut per item agar server hitung surcharge-nya.
          Object.entries(sizeDistribution)
            .filter(([_, qty]) => qty > 0)
            .map(([s, q]) => ({
              apparelSlug: activeApparel,
              fabricThicknessSlug: checkoutMaterial.fabricThicknessSlug,
              materialFinishSlug: materialFinish,
              colorHex: selectedColor,
              colorName: activeColorName,
              size: s,
              quantity: q,
              decals,
              title: `Custom ${activeApparel.toUpperCase()} Sablon DTF`,
              ...(masterForPayload ? { masterAssetUrl: masterForPayload } : {}),
            }))
        : [
            {
              apparelSlug: activeApparel,
              fabricThicknessSlug: checkoutMaterial.fabricThicknessSlug,
              materialFinishSlug: materialFinish,
              colorHex: selectedColor,
              colorName: activeColorName,
              size: selectedSize,
              quantity,
              decals,
              title: `Custom ${activeApparel.toUpperCase()} Sablon DTF`,
              ...(masterForPayload ? { masterAssetUrl: masterForPayload } : {}),
            },
          ];

      const payload = {
        recipientName,
        phoneNumber: normPhone,
        email: email || undefined,
        // P0-3: bukti kepemilikan WA — server 401 tanpa ini. Dikirim apa adanya
        // (6 digit); server yang cocokkan hash + expiry + owner-match.
        otpCode: otpCode.trim(),
        deliveryMethod,
        turnaroundTier,
        district: deliveryMethod === "EXPEDITION_MANUAL" ? destQuery.trim() || undefined : deliveryMethod !== "PICKUP" ? district : undefined,
        destinationCity: deliveryMethod === "EXPEDITION_MANUAL" ? destQuery.trim() || undefined : undefined,
        destinationPostalCode: deliveryMethod === "EXPEDITION_MANUAL" && selectedPostal ? selectedPostal : undefined,
        expeditionZoneId: selectedQuote?.source === "zone" ? selectedQuote.zoneId : undefined,
        expeditionCourier: selectedQuote?.source === "live" ? selectedQuote.courierCode : undefined,
        expeditionService: selectedQuote?.source === "live" ? selectedQuote.serviceCode : undefined,
        fullAddress: deliveryMethod === "PICKUP" ? "Workshop Kaos Kami Makassar (Self Pick-up)" : fullAddress,
        courierNotes,
        items: itemsPayload,
        turnstileToken: turnstileToken || undefined,
        couponCode: couponCode.trim() || undefined,
      };

      const data = await fetchJson<{
        orderId: string;
        reference?: string;
        paymentUrl?: string;
        invoiceUrl?: string;
        orderNumber?: string;
      }>("/api/checkout", {
        method: "POST",
        // P0-2: Idempotency-Key UNIK per klik BAYAR — double-click / retry
        // timeout dengan key SAMA dibalas server 409 + order lama (tanpa dobel).
        headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey() },
        body: JSON.stringify(payload),
      }, 30000);

      // Cart DIKOSONGKAN hanya setelah bayar terkonfirmasi (bukan pasca-POST
      // /api/checkout): order sudah ada di server saat Duitku pop/redirect.
      // Clear lebih awal menghapus cart sebelum user membayar sehingga
      // tutup-pop / pending / error tak bisa retry. pending/error/close
      // SENGAJA mempertahankan cart agar user bisa coba bayar lagi.
      const clearCartOnConfirmed = () => {
        if (isCartCheckout) clearCart();
      };

      // Trigger Duitku Pop Modal or redirect to paymentUrl
      const duitkuPay = () => {
        if (typeof window !== "undefined" && (window as any).checkout && data.reference) {
          try {
            (window as any).checkout.process(data.reference, {
              defaultLanguage: "id",
              successEvent: function () {
                clearCartOnConfirmed();
                window.location.href = `/orders/${data.orderId}?status=success`;
              },
              pendingEvent: function () {
                window.location.href = `/orders/${data.orderId}?status=pending`;
              },
              errorEvent: function () {
                window.location.href = `/orders/${data.orderId}?status=error`;
              },
              closeEvent: function () {
                window.location.href = data.invoiceUrl || `/orders/${data.orderId}`;
              },
            });
            return;
          } catch (e) {
            console.warn("Duitku pop error, fallback to URL:", e);
          }
        }

        // Fallback: Direct redirect to Duitku paymentUrl or Invoice.
        // Redirect keluar = sesi bayar dimulai (order sudah di server) →
        // cart dikosongkan di sini; invoice mock tetap kosongkan agar tak dobel.
        clearCartOnConfirmed();
        if (data.paymentUrl && !data.paymentUrl.includes("mock")) {
          window.location.href = data.paymentUrl;
        } else {
          window.location.href = data.invoiceUrl || `/orders/${data.orderId}`;
        }
      };

      duitkuPay();
    } catch (err: any) {
      // Error JUJUR (P0-3): tampilkan pesan server apa adanya — 401 (OTP
      // wajib/salah/kadaluarsa), 403 (OTP milik nomor lain / anti-bot gagal),
      // 503 (Duitku/Turnstile belum dikonfigurasi), 409 (replay key sama).
      // Untuk 409 sertakan orderNumber + invoiceUrl bila server mengirimnya
      // agar owner bisa lanjut bayar manual, bukan dead-end.
      const serverMsg = err?.message || "Terjadi kesalahan koneksi.";
      const d = err?.data as { orderNumber?: string; orderId?: string; invoiceUrl?: string } | undefined;
      const suffix =
        err?.status === 409 && d && (d.orderNumber || d.orderId || d.invoiceUrl)
          ? `${d.orderNumber || d.orderId ? ` Order: ${d.orderNumber || d.orderId}.` : ""}${d.invoiceUrl ? ` Buka invoice: ${d.invoiceUrl}` : ""}`
          : "";
      setErrorMessage(`${serverMsg}${suffix}`);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout pesanan sablon DTF"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-2xl bg-[#141416] border border-white/10 rounded-2xl shadow-2xl text-text-primary my-auto overflow-hidden"
      >
        {/* Top Orange Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-accent via-amber-500 to-brand-accent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent">
              <ShoppingBag size={17} />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white">
                CHECKOUT PESANAN SABLON DTF
              </h2>
              <p className="font-mono text-[11px] text-text-muted">
                UMKM Kaos Kami — Kota Makassar Hyperlocal Fulfillment
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all"
            aria-label="Tutup checkout"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCheckoutSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-sans flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Order Summary Card */}
          <div className="p-4 rounded-xl bg-surface/70 border border-white/5 space-y-3 font-mono text-xs">
            {/* M3.6 — Peringatan master belum tersimpan = SOFT-GATE SENGAJA FAIL-SAFE
                (peringatan "maafkan", BUKAN gate pemblokir — perilaku tak boleh diubah):
                - Checkout 100% TETAP LANJUT walau warning tampil (tak ada throw /
                  disabled / return-early di sini). Guest + server-hosting adalah
                  jalur resmi yang mengandalkan lolosnya checkout ini: master base64
                  di-hosting-kan server (POST /api/designs draft + arsip checkout
                  archiveDecalsToR2 + confirmOrder byDecal→bySide→preview).
                  JANGAN "memperketat" jadi hard-gate — itu mematikan checkout guest.
                - Kualitas final = master penuh, bukan preview: user wajib tahu bedanya,
                  tapi solusinya = tombol SIMPAN MASTER di Pola 2D (login), bukan blokir.
                - Return di bawah: div warning role="status" (render null bila semua
                  master sudah https) — dokumentasi ini sengaja duplikat di return
                  agar pembaca JSX tak salah mengira warning = error pemblokir. */}
            {!isCartCheckout && (() => {
              try {
                const masters = decals.map((d: any) => {
                  try {
                    const u = getMasterDataUrl(d.id, d.url);
                    return { id: d.id, name: d.name, https: isHttpsMasterUrl(u) };
                  } catch {
                    return { id: d.id, name: d.name, https: false };
                  }
                });
                const unsaved = masters.filter((m) => !m.https);
                if (unsaved.length === 0) return null;
                // M3.6 (return): warning-maafkan SENGAJA fail-safe — render info
                // saja, checkout tetap jalan (submit tak tersentuh blok ini).
                return (
                  <div role="status" className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold leading-snug">
                    ⚠️ Master belum tersimpan ({unsaved.length} decal masih lokal{unsaved[0] ? `: ${String(unsaved[0].name).slice(0, 24)}` : ""}). Checkout tetap lanjut — file master penuh akan di-hosting-kan server otomatis (guest bisa, tanpa login). Untuk arsip R2 permanen, login lalu SIMPAN MASTER di Pola 2D.
                  </div>
                );
              } catch {
                return null;
              }
            })()}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="font-bold text-white uppercase">
                {isCartCheckout ? `KERANJANG BELANJA (${cartItems.length} ITEM)` : `${activeApparel} (SABLON DTF)`}
              </span>
              <span className="text-brand-accent font-bold">
                Rp {effectiveSubtotal.toLocaleString("id-ID")}
              </span>
            </div>

            {isCartCheckout ? (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {cartPriceChecking && (
                  <p className="text-[11px] text-text-muted" role="status">
                    Mengecek harga terbaru katalog…
                  </p>
                )}
                {cartPriceNotice && cartPriceNotice.diff !== 0 && (
                  <div
                    role="status"
                    className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold leading-snug"
                  >
                    Harga katalog berubah: Rp {cartPriceNotice.oldTotal.toLocaleString("id-ID")} → Rp{" "}
                    {cartPriceNotice.newTotal.toLocaleString("id-ID")} (selisih {formatIdr(cartPriceNotice.diff)}).
                  </div>
                )}
                {cartItems.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="flex justify-between items-center text-[11px] border-b border-white/5 pb-1.5">
                    <div className="flex items-center space-x-2 truncate max-w-[240px]">
                      <span className="text-brand-accent font-bold">x{item.quantity}</span>
                      <span className="text-white truncate">{item.name}</span>
                      <span className="text-text-muted">({item.size})</span>
                    </div>
                    <span className="text-white font-bold shrink-0">
                      Rp {(item.priceIdr * item.quantity).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-text-muted">
                <div>
                  <span className="block opacity-75">WARNA:</span>
                  <span className="text-white font-bold">{activeColorName}</span>
                </div>
                <div>
                  <span className="block opacity-75">UKURAN:</span>
                  <span className="text-white font-bold">{selectedSize}</span>
                </div>
                <div>
                  <span className="block opacity-75">SABLON:</span>
                  <span className="text-white font-bold">{decals.length} Layer DTF</span>
                </div>
                <div>
                  <span className="block opacity-75">FINISH:</span>
                  <span className="text-white font-bold">{materialFinish.toUpperCase()}</span>
                </div>
              </div>
            )}

            {/* Quantity Selector & Bulk Size Breakdown Matrix (Only for 3D single item) */}
            {!isCartCheckout && (
            <div className="pt-2 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-text-muted text-[11px]">TOTAL JUMLAH:</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={useCustomSizeBreakdown}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 rounded-lg bg-surface border border-white/10 text-white font-bold flex items-center justify-center hover:border-brand-accent disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-white text-sm">{quantity}</span>
                    <button
                      type="button"
                      disabled={useCustomSizeBreakdown}
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-surface border border-white/10 text-white font-bold flex items-center justify-center hover:border-brand-accent disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setUseCustomSizeBreakdown(!useCustomSizeBreakdown)}
                  className={`text-[10px] px-2 py-1 rounded border font-bold transition-all ${
                    useCustomSizeBreakdown
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                      : "bg-surface border-white/10 text-text-muted hover:text-white"
                  }`}
                >
                  {useCustomSizeBreakdown ? "✓ RINCIAN UKURAN AKTIF" : "⚡ BAGI UKURAN (S–XXL)"}
                </button>
              </div>

              {/* Size Breakdown Matrix Grid (For Event / Class / Community) */}
              {useCustomSizeBreakdown && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 animate-fadeIn">
                  <span className="block text-[10px] text-text-muted">
                    Tentukan jumlah kaos per ukuran untuk workshop sablon:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {["S", "M", "L", "XL", "XXL"].map((sz) => (
                      <div key={sz} className="p-2 rounded-lg bg-surface border border-white/5 text-center">
                        <span className="block text-[10px] font-bold text-text-muted">{sz}</span>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleSizeCountChange(sz, -1)}
                            className="w-5 h-5 rounded bg-black/50 text-white flex items-center justify-center text-xs font-bold hover:bg-brand-accent"
                          >
                            -
                          </button>
                          <span className="font-bold text-white text-xs w-4">
                            {sizeDistribution[sz] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSizeCountChange(sz, 1)}
                            className="w-5 h-5 rounded bg-black/50 text-white flex items-center justify-center text-xs font-bold hover:bg-brand-accent"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pricing.discountPercentage > 0 && (
                <div className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex justify-between items-center">
                  <span>Diskon Grosir Komunitas/Lusinan ({pricing.discountPercentage}%)</span>
                  <span>-Rp {pricing.discountAmountIdr.toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Section 2: Contact Information */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <User size={13} className="text-brand-accent" />
              <span>INFORMASI PEMESAN (GUEST / WHATSAPP)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Sultan Hasanuddin"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-base text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                  Nomor WhatsApp * {isPhoneVerified && <span className="text-emerald-400">✅ terverifikasi</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      // Nomor berubah = kode lama milik nomor lain (server 403
                      // owner-match) — buang agar tak terkirim basi.
                      setIsPhoneVerified(false);
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    placeholder="081234567890"
                    aria-label="Nomor WhatsApp untuk OTP"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-sm text-white font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !phoneNumber}
                    className="px-3 py-2.5 rounded-xl bg-surface border border-brand-accent/40 text-brand-accent text-xs font-mono font-bold hover:bg-brand-accent hover:text-canvas disabled:opacity-40"
                  >
                    {isSendingOtp ? "..." : otpSent ? "KIRIM ULANG" : "KIRIM OTP"}
                  </button>
                </div>
                {otpSent && !isPhoneVerified && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
                        setIsPhoneVerified(false);
                      }}
                      placeholder="6 digit OTP"
                      aria-label="Kode OTP 6 digit dari WhatsApp"
                      className="flex-1 px-3 py-2 rounded-xl bg-surface border border-white/10 text-base text-white font-mono focus:outline-none"
                      maxLength={6}
                    />
                    <button type="button" onClick={handleVerifyOtp} className="px-3 py-2 rounded-xl bg-brand-accent text-canvas text-xs font-bold">
                      VERIFIKASI
                    </button>
                  </div>
                )}
                {otpMsg && <p className="text-[11px] font-mono mt-1 text-amber-400">{otpMsg}</p>}
                <p className="text-[10px] font-mono text-text-muted mt-1">Wajib — server menolak checkout tanpa kode OTP (401). Pastikan nomor aktif agar kode masuk.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Hyperlocal Makassar Delivery Method */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Truck size={13} className="text-brand-accent" />
              <span>METODE PENGIRIMAN (MAKASSAR HYPERLOCAL)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MAKASSAR_DELIVERY_OPTIONS.map((opt) => (
                <label
                  key={opt.method}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    deliveryMethod === opt.method
                      ? "bg-brand-accent/15 border-brand-accent shadow-[0_0_12px_rgba(230,81,0,0.2)]"
                      : "bg-surface/50 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        checked={deliveryMethod === opt.method}
                        onChange={() => {
                          setDeliveryMethod(opt.method);
                          setQuotes([]);
                          setSelectedQuoteKey("");
                          setQuoteMsg(null);
                        }}
                        className="accent-brand-accent"
                      />
                      <span className="font-mono text-xs font-bold text-white">{opt.name}</span>
                    </div>
                  </div>
                  <p className="font-sans text-[11px] text-text-muted mt-1 leading-snug">
                    {opt.description}
                  </p>
                </label>
              ))}
            </div>

            {/* Address fields (if not pickup) */}
            {deliveryMethod !== "PICKUP" && (
              <div className="pt-2 space-y-3 animate-fadeIn">
                {deliveryMethod === "EXPEDITION_MANUAL" ? (
                  <div className="p-3 rounded-xl bg-surface border border-brand-accent/40 space-y-2.5">
                    <label className="block font-mono text-[11px] text-text-muted uppercase">
                      Kota tujuan (luar Makassar) *
                    </label>
                    <input
                      type="text"
                      value={destQuery}
                      onChange={(e) => handleDestSearch(e.target.value)}
                      placeholder="cth: Gowa, Jakarta, Surabaya"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-brand-accent text-base text-white focus:outline-none"
                    />
                    {locLoading && <p className="font-mono text-[11px] text-text-muted">Mencari kota...</p>}
                    {locSuggest.length > 0 && (
                      <div className="space-y-1">
                        {locSuggest.map((l) => (
                          <button
                            key={`${l.postalCode}-${l.label}`}
                            type="button"
                            onClick={() => {
                              setDestQuery(l.label.split(",")[0] || l.label);
                              setSelectedPostal(l.postalCode);
                              setLocSuggest([]);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 hover:border-brand-accent font-mono text-[11px] text-white"
                          >
                            {l.label}{" "}
                            <span className="text-brand-accent font-bold">{l.postalCode}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleCheckOngkir}
                      disabled={quoteLoading}
                      className="w-full py-2 rounded-lg bg-brand-accent text-canvas font-mono text-[11px] font-bold disabled:opacity-50"
                    >
                      {quoteLoading ? "MENGECEK..." : "CEK ONGKIR (PILIH TERMURAH)"}
                    </button>
                    <button
                      type="button"
                      onClick={handleUseGps}
                      disabled={gpsLoading}
                      className="w-full py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-brand-accent disabled:opacity-50"
                    >
                      {gpsLoading ? "MEMBACA GPS..." : "📍 ISI KOTA DARI GPS HP"}
                    </button>
                    {gpsMsg && <p className="font-mono text-[10px] text-text-muted">{gpsMsg}</p>}
                    {quoteMsg && <p className="font-mono text-[11px] text-rose-300">{quoteMsg}</p>}
                    {quoteSource === "zone" && (
                      <p className="font-mono text-[10px] text-amber-400">
                        Tarif estimasi tabel (live belum aktif). Final dihitung server.
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {quotes.map((q) => (
                        <label
                          key={q.key}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                            selectedQuoteKey === q.key
                              ? "bg-brand-accent/15 border-brand-accent"
                              : "bg-black/40 border-white/10 hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="expeditionQuote"
                              checked={selectedQuoteKey === q.key}
                              onChange={() => setSelectedQuoteKey(q.key)}
                              className="accent-brand-accent"
                            />
                            <div>
                              <p className="font-mono text-xs font-bold text-white">
                                {q.courier} {q.service}
                              </p>
                              <p className="font-mono text-[10px] text-text-muted">Estimasi {q.etd}</p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            Rp {q.cost.toLocaleString("id-ID")}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                  Kecamatan di Kota Makassar *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-xs font-mono text-white focus:outline-none"
                >
                  {MAKASSAR_SUBDISTRICTS.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleUseGps}
                  disabled={gpsLoading}
                  className="mt-1.5 w-full py-1.5 rounded-lg bg-surface border border-white/10 text-[11px] font-mono text-brand-accent hover:bg-brand-accent/10 disabled:opacity-50"
                >
                  {gpsLoading ? "MEMBACA GPS..." : "📍 PAKAI LOKASI SAAT INI (GPS)"}
                </button>
                {gpsMsg && <p className="font-mono text-[10px] text-text-muted mt-1">{gpsMsg}</p>}
              </div>
                </div>
                )}

                  <div>
                    <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                      Catatan Patokan / Kurir (Opsional)
                    </label>
                    <input
                      type="text"
                      value={courierNotes}
                      onChange={(e) => setCourierNotes(e.target.value)}
                      placeholder="e.g. Dekat Pintu 1 Unhas / Pagar Putih"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-base text-white focus:outline-none font-sans"
                    />
                  </div>

                <div>
                  <label className="block font-mono text-[11px] text-text-muted uppercase mb-1">
                    Alamat Lengkap Pengiriman *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface border border-white/10 focus:border-brand-accent text-xs font-sans text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Production Turnaround SLA (Reguler vs Express 24 Jam) */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Clock size={13} className="text-brand-accent" />
              <span>WAKTU PRODUKSI WORKSHOP (SLA)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRODUCTION_TURNAROUND_OPTIONS.map((sla) => (
                <label
                  key={sla.tier}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    turnaroundTier === sla.tier
                      ? "bg-brand-accent/15 border-brand-accent"
                      : "bg-surface/50 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="turnaroundTier"
                      checked={turnaroundTier === sla.tier}
                      onChange={() => setTurnaroundTier(sla.tier)}
                      className="accent-brand-accent"
                    />
                    <div>
                      <span className="font-mono text-xs font-bold text-white block">{sla.label}</span>
                      <span className="font-sans text-[11px] text-text-muted">{sla.description}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 5: Total Calculation & Submit Button */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal Kaos & Sablon ({totalQty} pcs)</span>
              <span>Rp {effectiveSubtotal.toLocaleString("id-ID")}</span>
            </div>

            {shippingCost > 0 && (
              <div className="flex justify-between text-text-muted">
                <span>
                  Ongkos Kirim{deliveryMethod === "EXPEDITION_MANUAL" && selectedQuote ? ` (${selectedQuote.courier} ${selectedQuote.service})` : ""}
                </span>
                <span>Rp {shippingCost.toLocaleString("id-ID")}</span>
              </div>
            )}
            {deliveryMethod === "FREE_MAKASSAR" && (
              <div className="flex justify-between text-emerald-400">
                <span>Diantar tim kami — Gratis Makassar</span>
                <span>Rp 0</span>
              </div>
            )}

            {turnaroundSurcharge > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Layanan Express 24 Jam</span>
                <span>+Rp {turnaroundSurcharge.toLocaleString("id-ID")}</span>
              </div>
            )}

            {/* Kupon (opsional) — potongan dihitung & divalidasi server */}
            <div>
              <label htmlFor="coupon-code" className="block text-text-muted mb-1">
                Kode kupon (jika ada)
              </label>
              <input
                id="coupon-code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32))}
                placeholder="cth: HEMAT10"
                autoComplete="off"
                className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white uppercase placeholder:normal-case placeholder:text-text-muted"
              />
              <p className="text-text-muted text-[11px] mt-1">
                Potongan dihitung otomatis oleh server saat bayar.
              </p>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-white/10 text-sm sm:text-base font-bold text-white">
              <span>TOTAL PEMBAYARAN:</span>
              <span className="text-brand-accent text-lg sm:text-xl">
                Rp {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Anti-bot Turnstile (aktif hanya bila site key dikonfigurasi) */}
          {turnstileEnabled && (
            <TurnstileWidget
              onVerify={(t) => setTurnstileToken(t)}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
              size="flexible"
            />
          )}

          {/* Action Trigger */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-5 rounded-xl font-mono text-xs font-bold tracking-wider uppercase bg-brand-accent text-canvas shadow-[0_0_20px_rgba(230,81,0,0.4)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>MEMPROSES DUITKU...</span>
              </>
            ) : (
              <>
                <CreditCard size={15} />
                <span>BAYAR VIA QRIS</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
