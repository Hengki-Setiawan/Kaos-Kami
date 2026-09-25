"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, MapPin, QrCode, Truck, ChevronRight, CheckCircle2 } from 'lucide-react';
import { BottomSheet, HapticButton, Badge } from '@/components/ui';
import { useMobileCartStore } from '@/store/useMobileCartStore';
import { MOBILE_APPAREL_META } from '@/store/useMobileStudioStore';
import { useShallow } from 'zustand/shallow';
import { MAKASSAR_DELIVERY_OPTIONS, MAKASSAR_SUBDISTRICTS, WORKSHOP_LOCATION, PRODUCTION_TURNAROUND_OPTIONS, TurnaroundTier, DeliveryOption } from '@/lib/shipping/deliveryOptionsMobile';
import { mobileApiClient, quoteShipping, reverseGeocode, searchLocations, ShipLocation } from '@/lib/api/mobileApiClient';
import { getCurrentCoords } from '@/lib/bridge/geolocation';
import { openDuitkuPaymentModal } from '@/lib/payments/duitkuMobile';
import { haptic } from '@/lib/bridge/haptics';
import { setStoredUserId } from '@/lib/offline/persistentKeys';
import { compressDecalForUpload } from '@/lib/enhancers/imageOptimizerMobile';
import { createDesignDraft } from '@/lib/api/designDraft';

export interface CheckoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // paymentUrl = link Duitku asli; invoiceUrl = halaman invoice (fallback).
  // JANGAN campur (audit: invoice dibuka sebagai "lanjut bayar").
  onOrderSuccess: (orderId: string, urls: { paymentUrl?: string; invoiceUrl?: string }) => void;
  onNotify?: (msg: string) => void;
}

const DELIVERY_TO_SERVER: Record<string, 'PICKUP' | 'FREE_MAKASSAR' | 'EXPEDITION_MANUAL'> = {
  WORKSHOP_PICKUP: 'PICKUP',
  FREE_MAKASSAR: 'FREE_MAKASSAR',
  EXPEDITION: 'EXPEDITION_MANUAL',
};

// P0-2: Idempotency-Key UNIK per klik bayar (zero-dep). Format UUID lolos regex
// server /^[A-Za-z0-9\-_.:]{8,128}$/ (mobile checkout baca header "idempotency-key").
function newIdempotencyKey(): string {
  try {
    const u = (globalThis as any)?.crypto?.randomUUID?.();
    if (typeof u === 'string' && u.length >= 8) return u;
  } catch {
    // abaikan — pakai fallback di bawah
  }
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Normalisasi nomor WA seperti web (checkout route + send-otp):
 * strip spasi/strip/titik/kurung/+, sisakan digit; terima prefix 08 / 62 / +62.
 * Contoh: "+62 812-3456-7890" → "6281234567890".
 * Validasi: /^(0|62)8[1-9][0-9]{6,10}$/ + panjang 10–15 digit.
 */
export function normalizeMobilePhone(raw: string): string {
  let s = (raw || '').trim().replace(/[\s\-.\u2010-\u2015()]+/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  s = s.replace(/[^0-9]/g, '');
  return s;
}

export function isValidMobilePhone(normalizedDigits: string): boolean {
  return (
    normalizedDigits.length >= 10 &&
    normalizedDigits.length <= 15 &&
    /^(0|62)8[1-9][0-9]{6,10}$/.test(normalizedDigits)
  );
}

export function CheckoutSheet({ open, onOpenChange, onOrderSuccess, onNotify }: CheckoutSheetProps) {
  const { items, getSubtotal, clearCart } = useMobileCartStore(
    useShallow((s) => ({ items: s.items, getSubtotal: s.getSubtotal, clearCart: s.clearCart }))
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states (kosong default — JANGAN hardcode data pribadi dev di sini;
  // insiden Sep 2026: nama/alamat dev tampil ke semua pengguna).
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [turnaroundTier, setTurnaroundTier] = useState<TurnaroundTier>('REGULER');
  // P-checkout parity: email + catatan kurir opsional + notice harga server.
  const [email, setEmail] = useState('');
  const [courierNotes, setCourierNotes] = useState('');
  const [priceNotice, setPriceNotice] = useState<string | null>(null);

  // LANGKAH 1: re-quote harga server saat sheet dibuka (cermin web syncPrices).
  useEffect(() => {
    if (!open || items.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const { requoteAndSyncCart } = await import('@/lib/checkoutParity');
        const r = await requoteAndSyncCart(10000);
        if (alive && r.notice) setPriceNotice(r.notice.message);
      } catch {}
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOption>(MAKASSAR_DELIVERY_OPTIONS[0]);
  // P0-3: kecamatan FREE_MAKASSAR — WAJIB dari MAKASSAR_SUBDISTRICTS (cerminan
  // whitelist web; server 400 bila di luar daftar). Default = 'Tallo' (workshop).
  const [district, setDistrict] = useState<string>(MAKASSAR_SUBDISTRICTS.includes('Tallo') ? 'Tallo' : MAKASSAR_SUBDISTRICTS[0]);
  // P0-3: OTP WA — server WAJIBKAN otpCode 6-digit (401 bila tanpa/salah).
  // Alur: KIRIM OTP → kode masuk WA → isi 6 digit → checkout kirim
  // phoneNumber + otpCode. JANGAN verifikasi via endpoint lain (satu-pakai).
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  // OTP sekali seumur hidup: nomor terverifikasi permanen → lewati kode.
  const [otpLifetimeOk, setOtpLifetimeOk] = useState(false);
  // Ekspedisi luar kota: kota + kode pos + daftar tarif server + opsi terpilih.
  // Harga final tetap di-resolve server (tampilan di sini hanya estimasi).
  interface ShipOption { key: string; courier: string; service: string; cost: number; etd: string; zoneId?: string; courierCode?: string; serviceCode?: string; }
  const [destCity, setDestCity] = useState('');
  const [destPostal, setDestPostal] = useState('');
  const [zones, setZones] = useState<ShipOption[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [locSuggest, setLocSuggest] = useState<ShipLocation[]>([]);
  const [locLoading, setLocLoading] = useState(false);

  // Autocomplete kota → kode pos (debounce hemat kuota).
  const locTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDestSearch = (q: string) => {
    setDestCity(q);
    setSelectedZoneId(null);
    setLocSuggest([]);
    if (locTimer.current) clearTimeout(locTimer.current);
    if (q.trim().length < 3) return;
    setLocLoading(true);
    locTimer.current = setTimeout(async () => {
      const list = await searchLocations(q);
      setLocSuggest(list);
      setLocLoading(false);
    }, 500);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Upload R2 dulu: progres kompres+unggah + peringatan fallback base64.
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [r2Warning, setR2Warning] = useState<string | null>(null);

  // GATE LOGIN (keputusan owner Sep 2026: tamu DILARANG checkout — wajib login).
  // Pola auth yg tersedia di file ini = userId persisten (localStorage
  // 'kaoskami_user_id' + Preferences via setStoredUserId). Mobile tak punya
  // sesi web better-auth di file ini — server tetap sumber kebenaran (401 bila
  // tanpa sesi). Tanpa userId → JANGAN render form, tampilkan prompt login.
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  const [loginChecked, setLoginChecked] = useState(false);
  useEffect(() => {
    if (!open) return;
    setLoginChecked(false);
    try {
      const id = localStorage.getItem('kaoskami_user_id');
      setStoredUserId(id && id.trim() ? id : null);
      // N3: sheet dibuka + user sudah login → pastikan binding token push
      // memakai userId ini (mis. login Google di sesi sebelumnya).
      if (id && id.trim()) {
        import('@/lib/bridge/push')
          .then((m) => void m.refreshPushTokenBinding(id.trim()))
          .catch(() => {});
      }
    } catch {
      setStoredUserId(null);
    } finally {
      setLoginChecked(true);
    }
  }, [open ]);
  const isLoggedIn = !!storedUserId;

  const subtotal = getSubtotal();
  const selectedZone = zones.find((z) => z.key === selectedZoneId) || null;
  const isExpedition = selectedDelivery.id === 'EXPEDITION';
  const selectedTurnaround = PRODUCTION_TURNAROUND_OPTIONS.find((t) => t.tier === turnaroundTier);
  const turnaroundSurcharge = selectedTurnaround?.surchargeIdr || 0;
  // HARGA JUJUR (audit HIGH): ongkir ekspedisi TANPA quote = belum diketahui
  // (null), BUKAN Rp 25.000 placeholder. Total = estimasi, server hitung ulang.
  const deliveryFee: number | null = isExpedition ? (selectedZone ? selectedZone.cost : null) : selectedDelivery.price;
  const grandTotal: number | null = deliveryFee === null ? null : subtotal + deliveryFee + turnaroundSurcharge;

  const handleCheckOngkir = async () => {
    if (destCity.trim().length < 2) return setZonesError('Isi nama kota dulu (min. 2 huruf).');
    setZonesLoading(true);
    setZonesError(null);
    try {
      const weightGrams = Math.max(250, items.reduce((a, it) => a + (it.quantity || 0), 0) * 250);
      const data = await quoteShipping(destCity.trim(), /^\d{5}$/.test(destPostal) ? destPostal : undefined, weightGrams);
      let opts: ShipOption[] = [];
      if (data.source === 'live' && Array.isArray(data.rates)) {
        opts = data.rates.map((r: any) => ({
          key: `live:${r.courierCode}:${r.serviceCode}`,
          courier: r.courierName, service: r.serviceName, cost: r.costIdr, etd: r.etdText,
          courierCode: r.courierCode, serviceCode: r.serviceCode,
        }));
      } else if (Array.isArray(data.zones)) {
        opts = data.zones.map((z: any) => ({
          key: `zone:${z.id}`, courier: z.courier, service: `${z.service} — ${z.city}`,
          cost: z.costIdr, etd: z.etdLabel, zoneId: z.id,
        }));
      }
      setZones(opts);
      setSelectedZoneId(opts[0]?.key || null);
      if (opts.length === 0) setZonesError('Tarif tidak ditemukan.');
    } catch (e: any) {
      setZonesError(e?.message || 'Gagal cek ongkir.');
    } finally {
      setZonesLoading(false);
    }
  };

  // GPS: isi alamat otomatis dari lokasi HP (izin native + proxy server).
  const handleUseGps = async () => {
    setGpsLoading(true);
    setGpsMsg(null);
    const coords = await getCurrentCoords();
    if (!coords) {
      setGpsLoading(false);
      setGpsMsg('Izin lokasi ditolak / GPS mati. Isi manual.');
      return;
    }
    const r = await reverseGeocode(coords.lat, coords.lon);
    setGpsLoading(false);
    if (r) {
      if (r.displayName) setCustomerAddress(r.displayName);
      // Kecamatan GPS → pakai bila masuk whitelist (paritas web CheckoutModal).
      if (r.district && MAKASSAR_SUBDISTRICTS.includes(r.district)) setDistrict(r.district);
      if (isExpedition && r.city) {
        setDestCity(r.city);
        setZones([]);
        setSelectedZoneId(null);
      }
      setGpsMsg(r.city || r.district ? `Lokasi: ${[r.district, r.city].filter(Boolean).join(', ')}` : 'Alamat terisi dari GPS.');
    } else setGpsMsg('Gagal baca lokasi. Isi manual.');
  };

  // P0-3: kirim OTP ke WA (hemat Fonnte: 1x per checkout, bukan per render).
  // Normalisasi dulu agar nomor benar tak ditolak 400.
  const handleSendOtp = async () => {
    const norm = normalizeMobilePhone(customerPhone);
    if (norm) setCustomerPhone(norm);
    if (!isValidMobilePhone(norm)) {
      setOtpMsg('Isi WA dulu (contoh: 081234567890)');
      return;
    }
    setIsSendingOtp(true);
    setOtpMsg(null);
    try {
      const r = await mobileApiClient.sendOtp(norm);
      if (!r.ok) {
        setOtpMsg(r.error || 'Gagal kirim OTP');
        return;
      }
      // Nomor terverifikasi permanen (OTP sekali seumur hidup): nol WA, langsung pesan.
      if ((r as any).alreadyVerified) {
        setOtpLifetimeOk(true);
        setOtpSent(false);
        setOtpCode('');
        setOtpMsg('✅ Nomor sudah terverifikasi permanen — langsung PESAN tanpa kode.');
        return;
      }
      setOtpSent(true);
      // Kode mock HANYA ada di dev lokal; server prod tak pernah kirim code.
      const showMock = r.mock && r.code && process.env.NODE_ENV !== 'production';
      setOtpMsg(showMock ? `Kode mock: ${r.code} (Fonnte mock)` : 'Kode OTP terkirim ke WA');
    } catch (e: any) {
      setOtpMsg(e?.message || 'Gagal kirim OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handlePlaceOrder = async () => {
    setFormError(null);
    // Gate login client-side (server 401 bila tanpa sesi — sumber kebenaran).
    try {
      const id = localStorage.getItem('kaoskami_user_id');
      if (!id || !id.trim()) {
        const msg = 'Login dulu untuk memesan (tamu tidak bisa order).';
        setFormError(msg);
        onNotify?.(msg);
        return;
      }
    } catch {
      const msg = 'Login dulu untuk memesan (tamu tidak bisa order).';
      setFormError(msg);
      onNotify?.(msg);
      return;
    }
    if (customerName.trim().length < 2) return setFormError('Nama penerima minimal 2 karakter.');
    const normalizedPhone = normalizeMobilePhone(customerPhone);
    if (!isValidMobilePhone(normalizedPhone))
      return setFormError('Nomor WhatsApp tidak valid (contoh: 081234567890).');
    if (customerAddress.trim().length < 5) return setFormError('Alamat pengiriman minimal 5 karakter.');
    if (items.length === 0) return setFormError('Keranjang masih kosong.');
    // Penjaga orderable client-side (≈400): tolak item !orderable SEBELUM
    // request (hemat kuota + pesan jujur). Server tetap sumber kebenaran dan
    // wajib menolak ulang (fail-closed bila client dimodifikasi).
    const blocked = items.find(
      (it) => (MOBILE_APPAREL_META as Record<string, { orderable?: boolean; lockedMessage?: string }>)[it.apparelType]?.orderable !== true
    );
    if (blocked) {
      const msg =
        (MOBILE_APPAREL_META as Record<string, { lockedMessage?: string }>)[blocked.apparelType]?.lockedMessage ||
        `Apparel "${blocked.apparelType}" belum bisa dipesan di HP.`;
      return setFormError(`Checkout diblokir (400): ${msg} Hapus item tsb / pilih 4 katalog aktif.`);
    }
    if (isExpedition && destCity.trim().length < 2) return setFormError('Isi kota tujuan ekspedisi.');
    // HARGA JUJUR: blokir submit tanpa quote server (tanpa tarif valid,
    // total tak bisa dihitung — JANGAN kirim dengan ongkir tebakan).
    if (isExpedition && !selectedZone) {
      return setFormError('Cek ongkir & pilih kurir dulu — total belum bisa dihitung tanpa tarif server.');
    }
    // P0-3: server WAJIBKAN otpCode 6-digit (401 bila tanpa/salah/kadaluarsa,
    // 403 bila OTP milik nomor lain). Minta kode dulu via KIRIM OTP.
    // KECUALI nomor terverifikasi permanen (OTP sekali seumur hidup) → lewati.
    if (!otpLifetimeOk && !/^\d{6}$/.test(otpCode.trim())) {
      return setFormError('Kode OTP 6 digit wajib — klik KIRIM OTP, cek WA, lalu isi kodenya sebelum pesan.');
    }
    // Guard FREE_MAKASSAR (paritas server): kecamatan wajib dari whitelist.
    if (selectedDelivery.id === 'FREE_MAKASSAR' && !MAKASSAR_SUBDISTRICTS.includes(district)) {
      return setFormError('Pilih kecamatan se-Kota Makassar untuk antar gratis.');
    }
    // LANGKAH 2: validasi varian+ukuran vs katalog segar (server tetap final).
    try {
      const { validateCartAgainstCatalog } = await import('@/lib/checkoutParity');
      const cats = await mobileApiClient.getCatalog().then((r) => r.data?.categories ?? []);
      const v = validateCartAgainstCatalog(
        items.map((it) => ({
          apparelType: it.apparelType,
          size: it.size,
          quantity: it.quantity,
          basePrice: (it as any).basePrice ?? 0,
          sablonPrice: (it as any).sablonPrice ?? 0,
        })),
        cats as any
      );
      if (!v.ok) return setFormError(v.issues[0].message);
      if (v.notice) {
        setPriceNotice(v.notice.message);
        return setFormError(v.notice.message + ' Klik PESAN lagi.');
      }
    } catch {}
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setFormError('Email tidak valid (opsional — kosongkan bila tak perlu).');
    }

    setIsSubmitting(true);
    haptic.tapHeavy();
    try {
      // Snapshot gizmo PER-ITEM cart (kontrak DecalLayerSchema server:
      // id, url, name, targetSide, x, y, scale, rotation, opacity).
      // Tiap CartItem membawa decalX/decalY/decalScale/decalRotation/
      // decalTargetSide dari handleSaveToCart — checkout JANGAN memakai satu
      // transform global studio (bug: 2 desain beda posisi ikut posisi
      // terakhir tampil). Fallback = default store (x 0, y 0.04, scale 0.22,
      // rot 0, front) untuk item cache v2 lama tanpa snapshot.
      // printWidthCm/HeightCm/offsetFromCollarCm/decalPx TIDAK dikirim (tak ada di
      // skema decal; dimensi fisik disimpan server di ProductionTask, bukan OrderItem).
      const clampDecal = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
      const getDecalForItem = (it: (typeof items)[number]) => {
        const rx = (it as { decalX?: unknown }).decalX;
        const ry = (it as { decalY?: unknown }).decalY;
        const rs = (it as { decalScale?: unknown }).decalScale;
        const rr = (it as { decalRotation?: unknown }).decalRotation;
        const rt = (it as { decalTargetSide?: unknown }).decalTargetSide;
        const ro = (it as { decalOpacity?: unknown }).decalOpacity;
        return {
          x: clampDecal(typeof rx === 'number' && Number.isFinite(rx) ? rx : 0, -0.75, 0.75),
          y: clampDecal(typeof ry === 'number' && Number.isFinite(ry) ? ry : 0.04, -0.75, 0.75),
          scale: clampDecal(typeof rs === 'number' && Number.isFinite(rs) ? rs : 0.22, 0.02, 1.5),
          rotation: clampDecal(typeof rr === 'number' && Number.isFinite(rr) ? rr : 0, -180, 180),
          targetSide: (rt === 'back' ? 'back' : 'front') as 'front' | 'back',
          // Q8: opasitas dasar dari sheet (0.2–1, default 1) — bukan hardcode.
          opacity: clampDecal(typeof ro === 'number' && Number.isFinite(ro) ? ro : 1, 0.2, 1),
        };
      };
      // UPLOAD R2 DULU (audit HIGH): base64 mentah 5–8MB JANGAN dikirim
      // langsung — buat DRAFT via POST /api/designs (akun login, server
      // hosting decal → R2) lalu pakai URL R2 di payload checkout.
      // Gagal → fallback base64 lama + peringatan (checkout tetap jalan).
      setUploadProgress('Menyiapkan gambar sablon…');
      setR2Warning(null);
      const resolvedDecalUrls: (string | null)[] = [];
      let r2Failed = false;
      let lastDraftError: string | null = null;
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        if (!it.decalUrl || !it.decalUrl.startsWith('data:image')) {
          resolvedDecalUrls.push(it.decalUrl);
          continue;
        }
        try {
          setUploadProgress(`Mengompres gambar ${idx + 1}/${items.length}…`);
          const { compressedUrl } = await compressDecalForUpload(it.decalUrl, {
            maxDimension: 1600,
            onProgress: (s) => setUploadProgress(`${s} (${idx + 1}/${items.length})`),
          });
          setUploadProgress(`Mengunggah gambar ${idx + 1}/${items.length} ke server…`);
          const draft = await createDesignDraft(
            {
              title: (it.apparelTitle || 'Custom Mobile').slice(0, 60),
              apparelSlug: it.apparelType,
              colorHex: it.colorHex,
              colorName: it.colorName || 'Custom',
              size: it.size,
              decals: [
                (() => {
                  const per = getDecalForItem(it);
                  return {
                    id: `decal-${it.id}`.slice(0, 64),
                    url: compressedUrl,
                    name: per.targetSide === 'back' ? 'Belakang' : 'Depan',
                    targetSide: per.targetSide,
                    x: per.x,
                    y: per.y,
                    scale: per.scale,
                    rotation: per.rotation,
                    opacity: per.opacity,
                  };
                })(),
              ],
            },
            (s) => setUploadProgress(`${s} (${idx + 1}/${items.length})`)
          );
          if (draft.ok && draft.decalUrls?.[0]) {
            resolvedDecalUrls.push(draft.decalUrls[0]);
          } else {
            r2Failed = true;
            lastDraftError = draft.error || `draft gagal (${items.length ? 'tanpa URL R2' : 'unknown'})`;
            resolvedDecalUrls.push(it.decalUrl);
          }
        } catch (e: any) {
          r2Failed = true;
          lastDraftError = e?.message || 'jaringan bermasalah saat upload decal';
          resolvedDecalUrls.push(it.decalUrl);
        }
      }
      setUploadProgress(null);
      if (r2Failed) {
        // Draft-R2: JANGAN diam — jelaskan alur di UI + toast.
        // Normal: akun login → POST /api/designs → decal di-hosting server ke
        // R2, checkout memakai URL R2. Gagal → fallback gambar asli (base64)
        // agar checkout tetap jalan (mungkin lambat); desain tetap tersimpan.
        const reason = lastDraftError ? ` (${lastDraftError})` : '';
        const warn =
          `Simpan draft gambar ke server (R2) gagal${reason} — ` +
          'memakai gambar asli agar checkout tetap jalan (mungkin lambat). ' +
          'Pesanan tetap tersimpan; ulangi saat sinyal kuat bila gagal.';
        setR2Warning(warn);
        onNotify?.(warn);
      }
      const res = await mobileApiClient.checkout({
        recipientName: customerName.trim(),
        phoneNumber: normalizedPhone,
        email: email.trim().slice(0, 254) || undefined,
        courierNotes: courierNotes.trim().slice(0, 500) || undefined,
        // P0-3: bukti kepemilikan WA — server 401 tanpa ini (6 digit).
        otpCode: otpCode.trim(),
        deliveryMethod: DELIVERY_TO_SERVER[selectedDelivery.id],
        fullAddress: customerAddress.trim(),
        // FREE_MAKASSAR = kecamatan pilihan dari whitelist (server 400 bila
        // di luar daftar); ekspedisi = kota tujuan; pickup = Makassar generik.
        district: isExpedition ? destCity.trim() || 'Luar Kota' : selectedDelivery.id === 'FREE_MAKASSAR' ? district : 'Makassar',
        destinationCity: isExpedition ? destCity.trim() : undefined,
        destinationPostalCode: isExpedition && /^\d{5}$/.test(destPostal) ? destPostal : undefined,
        expeditionZoneId: isExpedition && selectedZone?.zoneId ? selectedZone.zoneId : undefined,
        expeditionCourier: isExpedition && selectedZone?.courierCode ? selectedZone.courierCode : undefined,
        expeditionService: isExpedition && selectedZone?.serviceCode ? selectedZone.serviceCode : undefined,
        paymentMethod: 'QRIS',
        couponCode: couponCode.trim() || undefined,
        turnaroundTier,
        items: items.map((it, mapIdx) => {
          const decalUrl = resolvedDecalUrls[mapIdx] ?? it.decalUrl;
          const per = getDecalForItem(it);
          return {
            apparelSlug: it.apparelType,
            colorHex: it.colorHex,
            colorName: it.colorName,
            size: it.size,
            quantity: it.quantity,
            title: it.apparelTitle,
            decals: decalUrl
              ? [{
                  id: `decal-${it.id}`,
                  url: decalUrl,
                  name: per.targetSide === 'back' ? 'Belakang' : 'Depan',
                  targetSide: per.targetSide,
                  x: per.x,
                  y: per.y,
                  scale: per.scale,
                  rotation: per.rotation,
                  opacity: per.opacity,
                }]
              : [],
          };
        }),
      // P0-2: Idempotency-Key UNIK per klik pesan — double-tap / retry timeout
      // dengan key SAMA dibalas server 409 + order lama (tanpa dobel).
      }, { idempotencyKey: newIdempotencyKey() });

      if (!res.success) {
        // 502 fail-closed & 409 replay: order tetap tersimpan di server.
        // JANGAN hapus keranjang diam-diam; arahkan ke invoice agar user bisa
        // bayar manual (WA) — bukan dead-end tanpa paymentUrl.
        if (res.orderId) {
          onOpenChange(false);
          onOrderSuccess(res.orderId, { invoiceUrl: res.invoiceUrl });
          // Pesan JUJUR: pakai error server (409 = "sudah diproses, tak ada
          // order ganda" + nomor order) bukan generik.
          onNotify?.(
            res.error
              ? `${res.error}${res.orderNumber ? ` Order: ${res.orderNumber}.` : ''} Buka invoice untuk bayar manual via WA.`
              : 'Gagal buat link bayar otomatis. Buka invoice untuk bayar manual via WA.'
          );
        } else {
          // 401 sesi-hilang ("Login dulu...") / 401 OTP (wajib/salah/kadaluarsa)
          // / 403 (OTP milik nomor lain) / 503 / 409-tanpa-order: tampilkan
          // pesan server apa adanya. Hint OTP HANYA untuk 401 OTP, JANGAN untuk
          // 401 sesi-hilang (tamu dilarang — wajib login, bukan minta OTP).
          const suffix =
            res.status === 409 && (res.orderNumber || res.invoiceUrl)
              ? `${res.orderNumber ? ` Order: ${res.orderNumber}.` : ''}${res.invoiceUrl ? ` Buka: ${res.invoiceUrl}` : ''}`
              : '';
          const serverMsg = res.error || 'Checkout gagal. Periksa koneksi lalu coba lagi.';
          const isLoginGate = serverMsg.includes('Login dulu untuk memesan');
          const otpHint = res.status === 401 && !isLoginGate ? ' Minta kode baru via KIRIM OTP lalu coba lagi.' : '';
          setFormError(`${serverMsg}${suffix}${otpHint}`);
        }
        return;
      }

      if (res.userId) {
        // Persisten via Preferences (native) + cermin localStorage.
        void setStoredUserId(res.userId);
        try { localStorage.setItem('kaoskami_user_id', res.userId); } catch {}
        // N3: identitas (baru/berubah) → ikat ulang token push ke userId ini.
        // Fire-and-forget: gagal = push tanpa user (checkout tetap sukses).
        try {
          const { refreshPushTokenBinding } = await import('@/lib/bridge/push');
          void refreshPushTokenBinding(res.userId);
        } catch {}
      }
      if (res.orderId) {
        try {
          const historyRaw = localStorage.getItem('kaoskami_order_history') || '[]';
          const history = JSON.parse(historyRaw);
          const newEntry = {
            id: res.orderId,
            orderNumber: res.orderNumber || res.orderId,
            totalIdr: grandTotal ?? subtotal,
            itemCount: items.length,
            deliveryMethod: selectedDelivery.name,
            status: 'PENDING_PAYMENT',
            createdAt: new Date().toISOString(),
          };
          const updated = [newEntry, ...history.filter((h: any) => h.id !== res.orderId)].slice(0, 20);
          localStorage.setItem('kaoskami_order_history', JSON.stringify(updated));
        } catch {}
      }
      // A7: cart DIPERTAHANKAN saat PENDING (ditandai dipakai order ini) —
      // dikosongkan HANYA setelah server konfirmasi lunas.
      try {
        localStorage.setItem('kaoskami_cart_pending_order', res.orderId!);
      } catch {}
      haptic.success();
      onOpenChange(false);
      // ALUR REVIEW: tanpa charge — cart dikosongkan (item pindah ke order),
      // bayar nanti via tombol di tracker setelah admin ACC.
      clearCart();
      try { localStorage.removeItem('kaoskami_cart_pending_order'); } catch {}
      onOrderSuccess(
        res.orderId!,
        {
          paymentUrl: res.paymentUrl,
          invoiceUrl: res.invoiceUrl,
        } as any
      );
      if (res.paymentUrl) {
        openDuitkuPaymentModal(res.paymentUrl, () => {
          onNotify?.('Browser pembayaran ditutup. Status pesanan diperbarui otomatis.');
        });
      } else {
        onNotify?.('Desain terkirim — menunggu ACC admin, lalu bayar dari tab Pesanan.');
      }
    } catch (e: any) {
      setFormError(e?.message || 'Checkout gagal. Coba lagi.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
       title={!isLoggedIn ? 'Login Diperlukan' : step === 1 ? 'Data Penerima' : step === 2 ? 'Pengiriman' : 'Metode Pembayaran'}
      description={!isLoggedIn ? 'Login dulu untuk memesan (tamu tidak bisa order).' : 'Harga dihitung ulang di server. Bayar QRIS, lunas dulu baru produksi.'}
    >
      <div className="space-y-4 py-2 pb-6">
        {/* GATE LOGIN — tamu DILARANG checkout (keputusan owner). Tanpa userId/
            sesi: JANGAN render form, tampilkan prompt login. Pola auth di file
            ini = userId persisten; sesi web true diverifikasi server (401). */}
        {loginChecked && !isLoggedIn && (
          <div className="space-y-3 p-4 rounded-2xl bg-zinc-900 border border-[#FF6B35]/40 text-center">
            <p className="text-sm font-bold text-white">Login dulu untuk memesan (tamu tidak bisa order).</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Checkout hanya untuk akun login. Verifikasi nomor WA via KIRIM OTP untuk membuat akun,
              atau login via web agar sesi terbaca — server menolak pesanan tamu (401).
            </p>
            <button
              type="button"
              onClick={() => {
                onNotify?.('Login dulu untuk memesan (tamu tidak bisa order).');
                onOpenChange(false);
              }}
              className="w-full py-3 rounded-xl bg-[#FF6B35] text-white text-xs font-bold min-h-[44px]"
            >
              Tutup &amp; Login Dulu
            </button>
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                {formError}
              </div>
            )}
          </div>
        )}
        {/* Step Indicator Tabs — hanya untuk akun login */}
        {isLoggedIn && (
        <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-800">
          {[
            { num: 1, label: 'Alamat' },
            { num: 2, label: 'Kurir' },
            { num: 3, label: 'Bayar' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              aria-current={step === s.num ? 'step' : undefined}
              onClick={() => {
                if (s.num <= step) setStep(s.num as any);
              }}
              className={`flex items-center gap-1.5 text-xs cursor-pointer min-h-[44px] px-1 ${
                step === s.num ? 'text-[#FF6B35] font-bold' : 'text-zinc-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.num
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {s.num}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        )}

        {/* ========================================================= */}
        {/* STEP 1: ALAMAT MAKASSAR — hanya akun login (tamu = prompt di atas) */}
        {/* ========================================================= */}
        {isLoggedIn && step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Nama Lengkap:</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-base outline-none focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Nomor WhatsApp (Aktif) *</label>
              {/* ≤360px (HP kecil): tumpuk vertikal agar tombol OTP min-44px tak terjepit. */}
              <div className="flex gap-2 max-[360px]:flex-col">
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    // Nomor berubah = kode lama milik nomor lain (server 403
                    // owner-match) — buang agar tak terkirim basi.
                    setOtpSent(false);
                    setOtpCode('');
                    setOtpLifetimeOk(false);
                  }}
                  placeholder="08xx / 628xx / +62…"
                  aria-label="Nomor WhatsApp untuk OTP"
                  className="flex-1 px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-base outline-none focus:border-[#FF6B35]"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || !customerPhone}
                  className="px-3 py-3 rounded-xl bg-zinc-800 border border-[#FF6B35]/50 text-[#FF6B35] text-xs font-bold disabled:opacity-40 min-h-[44px] max-[360px]:w-full"
                >
                  {isSendingOtp ? '...' : otpSent ? 'KIRIM ULANG' : 'KIRIM OTP'}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Format 08 / 62 / +62 — spasi & strip otomatis diabaikan. Wajib — server menolak pesanan tanpa OTP (401).</p>
              {otpSent && (
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="6 digit OTP dari WA"
                  aria-label="Kode OTP 6 digit dari WhatsApp"
                  maxLength={6}
                  className="w-full mt-2 px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-base tracking-[0.3em] text-center outline-none focus:border-[#FF6B35]"
                />
              )}
              {otpMsg && <p className="text-[11px] text-amber-400 mt-1">{otpMsg}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Email (opsional, utk invoice)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                aria-label="Email opsional"
                className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-base outline-none focus:border-[#FF6B35]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Alamat Pengiriman (Kota Makassar):</label>
              <textarea
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-base outline-none focus:border-[#FF6B35]"
              />
              <button
                type="button"
                onClick={handleUseGps}
                disabled={gpsLoading}
                className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#FF6B35] font-semibold disabled:opacity-50"
              >
                <MapPin className="w-3.5 h-3.5" />
                {gpsLoading ? 'Membaca GPS...' : 'Isi otomatis dari GPS HP'}
              </button>
              {gpsMsg && <p className="text-[11px] text-zinc-400 mt-1">{gpsMsg}</p>}
            </div>

            <HapticButton
              variant="primary"
              onClick={() => {
                // Validasi step-1 di sini juga (audit: tombol loncat tanpa cek).
                if (customerName.trim().length < 2) return setFormError('Nama penerima minimal 2 karakter.');
                if (!isValidMobilePhone(normalizeMobilePhone(customerPhone)))
                  return setFormError('Nomor WhatsApp tidak valid (contoh: 081234567890).');
                if (selectedDelivery.id !== 'WORKSHOP_PICKUP' && customerAddress.trim().length < 5) {
                  return setFormError('Alamat pengiriman minimal 5 karakter.');
                }
                setFormError(null);
                setStep(2);
              }}
              className="w-full mt-2"
            >
              <span>Lanjut ke Opsi Kurir</span>
              <ChevronRight className="w-4 h-4" />
            </HapticButton>
            {formError && step === 1 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                {formError}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: OPSI KURIR MAKASSAR — hanya akun login */}
        {/* ========================================================= */}
        {isLoggedIn && step === 2 && (
          <div className="space-y-2.5">
            {MAKASSAR_DELIVERY_OPTIONS.map((opt) => {
              const isSelected = selectedDelivery.id === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={isSelected}
                   onClick={() => {
                     haptic.selection();
                     setSelectedDelivery(opt);
                     if (opt.id !== 'EXPEDITION') { setZones([]); setSelectedZoneId(null); setZonesError(null); }
                   }}
                  className={`w-full text-left p-3.5 rounded-2xl border cursor-pointer transition-all min-h-[44px] ${
                    isSelected
                      ? 'bg-[#FF6B35]/15 border-[#FF6B35] ring-1 ring-orange-500/30'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Syne']">
                      <Truck className="w-3.5 h-3.5 text-[#FF6B35]" />
                      {opt.name}
                    </span>
                    <Badge variant={opt.id !== 'EXPEDITION' && opt.price === 0 ? 'success' : 'neutral'}>
                      {opt.id === 'EXPEDITION' ? 'Cek ongkir — menghitung…' : opt.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">{opt.description}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Estimasi: {opt.estimatedTime}</p>
                </button>
              );
            })}

            {/* WORKSHOP_PICKUP: info lokasi SSOT Tallo Makassar + Google Maps navigasi */}
            {selectedDelivery.id === 'WORKSHOP_PICKUP' && (
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-emerald-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 font-['Syne']">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {WORKSHOP_LOCATION.name}
                  </span>
                  <Badge variant="success">Rp 0</Badge>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {WORKSHOP_LOCATION.address}
                </p>
                <p className="text-[10px] text-zinc-400">
                  ⏰ Jam Buka: {WORKSHOP_LOCATION.operatingHours}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    haptic.tap();
                    window.open(WORKSHOP_LOCATION.googleMapsUrl, '_blank');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-600/30 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Buka Rute Google Maps</span>
                </button>
              </div>
            )}

            {/* FREE_MAKASSAR: kecamatan WAJIB dari whitelist (server 400 bila di
                luar daftar). Opsi = MAKASSAR_SUBDISTRICTS, cerminan whitelist web. */}
            {selectedDelivery.id === 'FREE_MAKASSAR' && (
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-[#FF6B35]/40 space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">Kecamatan di Kota Makassar *</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-base outline-none focus:border-[#FF6B35]"
                >
                  {MAKASSAR_SUBDISTRICTS.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleUseGps}
                  disabled={gpsLoading}
                  className="w-full py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-[11px] text-[#FF6B35] font-semibold disabled:opacity-50"
                >
                  {gpsLoading ? 'Membaca GPS...' : (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Pilih kecamatan dari GPS HP
                    </span>
                  )}
                </button>
                {gpsMsg && <p className="text-[11px] text-zinc-400">{gpsMsg}</p>}
              </div>
            )}

            {isExpedition && (
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-[#FF6B35]/40 space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 block">Kota tujuan (luar Makassar):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={destCity}
                    onChange={(e) => handleDestSearch(e.target.value)}
                    placeholder="cth: Gowa, Jakarta, Surabaya"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-base outline-none focus:border-[#FF6B35]"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={destPostal}
                    onChange={(e) => setDestPostal(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                    placeholder="Kode pos"
                    className="w-24 px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-base outline-none focus:border-[#FF6B35]"
                  />
                </div>
                {locLoading && <p className="text-[11px] text-zinc-500">Mencari kota…</p>}
                {locSuggest.length > 0 && (
                  <div className="space-y-1">
                    {locSuggest.map((l) => (
                      <button
                        key={`${l.postalCode}-${l.label}`}
                        type="button"
                        onClick={() => {
                          haptic.selection();
                          setDestCity(l.label.split(',')[0] || l.label);
                          setDestPostal(l.postalCode);
                          setLocSuggest([]);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-[11px] text-white"
                      >
                        {l.label} <span className="text-[#FF6B35] font-bold">{l.postalCode}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <HapticButton variant="primary" onClick={handleCheckOngkir} className="flex-1 text-xs px-3">
                    {zonesLoading ? '...' : 'Cek Ongkir'}
                  </HapticButton>
                </div>
                {zonesError && <p className="text-[11px] text-rose-300">{zonesError}</p>}
                {zones.map((z) => {
                  const sel = selectedZoneId === z.key;
                  return (
                    <button
                      key={z.key}
                      type="button"
                      aria-pressed={sel}
                      onClick={() => { haptic.selection(); setSelectedZoneId(z.key); }}
                      className={`w-full text-left p-3 rounded-xl border cursor-pointer flex items-center justify-between min-h-[44px] ${
                        sel ? 'bg-[#FF6B35]/15 border-[#FF6B35]' : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{z.courier} {z.service}</p>
                        <p className="text-[10px] text-zinc-400">Estimasi {z.etd}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400">Rp {z.cost.toLocaleString('id-ID')}</span>
                        {sel && <Check className="w-4 h-4 text-[#FF6B35]" />}
                      </div>
                    </button>
                  );
                })}
                <p className="text-[10px] text-zinc-500">Pilih yang termurah. Ongkir final dihitung server.</p>
              </div>
            )}

            {/* Turnaround Tier (Reguler vs Express 24 Jam) */}
            <div className="pt-2 space-y-2">
              <label className="text-xs font-bold text-white block font-['Syne']">
                Kecepatan Produksi Sablon DTF:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCTION_TURNAROUND_OPTIONS.map((t) => {
                  const isSelected = turnaroundTier === t.tier;
                  return (
                    <button
                      key={t.tier}
                      type="button"
                      onClick={() => {
                        haptic.selection();
                        setTurnaroundTier(t.tier);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#FF6B35]/15 border-[#FF6B35] ring-1 ring-orange-500/30'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white font-['Syne']">{t.label}</span>
                      </div>
                      <span className={`text-[10px] font-bold block mb-1 ${isSelected ? 'text-[#FF6B35]' : 'text-zinc-400'}`}>
                        {t.badge}
                      </span>
                      <p className="text-[10px] text-zinc-400 leading-snug">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Catatan kurir (opsional, maks 500)</label>
              <textarea
                rows={2}
                value={courierNotes}
                onChange={(e) => setCourierNotes(e.target.value.slice(0, 500))}
                placeholder="Patokan, jam terima, titip satpam…"
                aria-label="Catatan kurir opsional"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-base outline-none focus:border-[#FF6B35]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <HapticButton
                variant="secondary"
                onClick={() => setStep(1)}
                className="flex-1 text-xs"
              >
                Kembali
              </HapticButton>              <HapticButton
                variant="primary"
                onClick={() => {
                  // Ekspedisi wajib pilih tarif dulu (audit); lainnya bebas lanjut.
                  if (isExpedition && !selectedZone) {
                    return setFormError('Cek ongkir & pilih kurir dulu.');
                  }
                  setFormError(null);
                  setStep(3);
                }}
                className="flex-1 text-xs"
              >
                <span>Metode Bayar</span>
                <ChevronRight className="w-4 h-4" />
              </HapticButton>
            </div>
            {formError && step === 2 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                {formError}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: PEMBAYARAN & ORDER SUBMISSION — hanya akun login */}
        {/* ========================================================= */}
        {isLoggedIn && step === 3 && (
          <div className="space-y-3">
            {/* QRIS ONLY (lunas-dulu, fee 0,7%) — QR generatif sesuai total. */}
            <div className="p-3.5 rounded-2xl border bg-[#FF6B35]/15 border-[#FF6B35] ring-1 ring-orange-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-[#FF6B35]">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">QRIS — Scan untuk Bayar</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Semua e-wallet & m-banking • Lunas dulu, baru produksi</p>
                </div>
              </div>
              <Check className="w-4 h-4 text-[#FF6B35]" />
            </div>

            {/* Total Summary — ESTIMASI, server hitung ulang (audit HIGH). */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1.5 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} Kaos) — estimasi:</span>
                <span className="text-white font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Ongkir ({selectedDelivery.name}) — estimasi:</span>
                <span className="text-emerald-400 font-medium">
                  {deliveryFee === null
                    ? 'menghitung… (cek ongkir dulu)'
                    : deliveryFee === 0
                    ? 'Gratis'
                    : `Rp ${deliveryFee.toLocaleString('id-ID')}`}
                </span>
              </div>
              {turnaroundSurcharge > 0 && (
                <div className="flex justify-between">
                  <span>Layanan ({selectedTurnaround?.label}):</span>
                  <span className="text-amber-400 font-medium">+Rp {turnaroundSurcharge.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div>
                <label htmlFor="m-coupon" className="block mb-1">Kode kupon (opsional)</label>
                <input
                  id="m-coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32))}
                  placeholder="cth: HEMAT10"
                  autoComplete="off"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-base uppercase placeholder:normal-case"
                />
                <p className="text-zinc-500 text-[11px] mt-1">Potongan dihitung server saat pesan.</p>
              </div>
              <div className="flex justify-between text-sm font-bold text-white border-t border-zinc-800 pt-1.5 mt-1 font-['Syne']">
                <span>Total Bayar (Estimasi — dihitung ulang server):</span>
                <span className="text-[#FF6B35]">
                  {grandTotal === null ? 'menghitung…' : `Rp ${grandTotal.toLocaleString('id-ID')}`}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">Estimasi — dihitung ulang server saat pesan.</p>
            </div>

            {/* Submit Button */}
            {priceNotice && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] leading-relaxed text-amber-300">
                {priceNotice}
              </div>
            )}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                {formError}
              </div>
            )}
            {uploadProgress && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-300 text-center">
                {uploadProgress}
              </div>
            )}
            {r2Warning && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] leading-relaxed text-amber-300 break-words whitespace-pre-line">
                <p className="font-bold">Draft R2 gagal — checkout tetap jalan</p>
                <p className="mt-0.5">{r2Warning}</p>
              </div>
            )}
            {/* P0-3: OTP dipakai di sini (satu state dengan langkah 1) — bila
                kosong, user bisa kirim+isi tanpa kembali ke langkah 1. */}
            <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
              <p className="text-[11px] text-zinc-400">
                Kode OTP WA {(/^\d{6}$/.test(otpCode.trim())) ? <span className="text-emerald-400 font-bold inline-flex items-center gap-1">siap <CheckCircle2 className="w-3 h-3" /></span> : <span className="text-amber-400 font-bold">wajib diisi (server 401 tanpanya)</span>}
              </p>
              <div className="flex gap-2 max-[360px]:flex-col">
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="6 digit OTP"
                  aria-label="Kode OTP 6 digit dari WhatsApp"
                  maxLength={6}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-base tracking-[0.3em] text-center outline-none focus:border-[#FF6B35]"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="px-3 py-2.5 rounded-xl bg-zinc-800 border border-[#FF6B35]/50 text-[#FF6B35] text-xs font-bold disabled:opacity-40 min-h-[44px] max-[360px]:w-full"
                >
                  {isSendingOtp ? '...' : otpSent ? 'KIRIM ULANG' : 'KIRIM OTP'}
                </button>
              </div>
              {otpMsg && <p className="text-[11px] text-amber-400">{otpMsg}</p>}
            </div>
            <HapticButton
              variant="primary"
              hapticStyle="success"
              loading={isSubmitting}
              disabled={isExpedition && !selectedZone}
              onClick={handlePlaceOrder}
              className="w-full py-4 text-sm font-bold shadow-xl shadow-orange-600/40"
            >
              {isExpedition && !selectedZone ? 'Cek Ongkir Dulu' : 'Ajukan Desain & Pesan Sekarang'}
            </HapticButton>
            {isExpedition && !selectedZone && (
              <p className="text-[10px] text-amber-400 text-center">
                Estimasi — dihitung ulang server. Pilih tarif ekspedisi untuk lanjut.
              </p>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
