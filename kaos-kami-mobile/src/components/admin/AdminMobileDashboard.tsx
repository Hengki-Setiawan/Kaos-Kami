"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Flame,
  Truck,
  Search,
  ScanLine,
  FileText,
  LogIn,
  LogOut,
  RefreshCw,
  BarChart3,
  LayoutGrid,
  Package,
  Ticket,
  Eye,
  EyeOff,
} from 'lucide-react';
import { GlassCard, Badge, HapticButton, BottomSheet } from '@/components/ui';
import { OrderItemData, OrderStatus } from '@/components/commerce/UserOrderTracker';
import { mobileApiClient } from '@/lib/api/mobileApiClient';
import { SHOP_WHATSAPP } from '@/lib/shop';
import { scanJobTicketOrQris } from '@/lib/bridge/scanner';
import { haptic } from '@/lib/bridge/haptics';
import { useMobileStudioStore } from '@/store/useMobileStudioStore';
import { AdminJobTicketModal, AdminJobTicketData } from './AdminJobTicketModal';

const STAGE_TO_STATUS: Record<string, OrderStatus> = {
  DESIGN_PREP: 'PENDING_DESIGN_APPROVAL',
  SCREEN_PRINT_SETUP: 'PENDING_DESIGN_APPROVAL',
  PRINTING: 'PRINTING_DTF',
  PRESSING: 'CURING_PRESS',
  QUALITY_CHECK: 'CURING_PRESS',
  PACKAGING: 'SHIPPED',
  DONE: 'COMPLETED',
};

const STATUS_TO_STAGE: Partial<Record<OrderStatus, string>> = {
  PENDING_PAYMENT: 'PRINTING',
  PRINTING_DTF: 'PRESSING',
  CURING_PRESS: 'PACKAGING',
  SHIPPED: 'DONE',
};

/** Role yang boleh masuk portal workshop (cermin RBAC web production-tasks). */
const WORKSHOP_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PRODUCTION_STAFF'];
/** Role yang boleh lihat omset/kupon (cermin RBAC web reports/coupons). */
const ADMIN_ONLY_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/**
 * Tombol "Simulasikan Pelanggan Sudah Lunas" HANYA untuk uji internal dev.
 * Default MATI (termasuk semua build rilis): set
 * NEXT_PUBLIC_ALLOW_PAYMENT_SIMULATION=1 untuk mengaktifkan di dev.
 */
const ALLOW_PAYMENT_SIMULATION =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ALLOW_PAYMENT_SIMULATION === '1';

/**
 * Data demo EKSPLISIT (?demo=1) — BUKAN default.
 * P4: mode demo diam DIHAPUS. Tanpa sesi admin + tanpa ?demo=1 → layar login,
 * bukan daftar palsu. Data ini hanya untuk uji UI offline / screenshot.
 */
const DEMO_ADMIN_ORDERS: OrderItemData[] = [
  {
    id: 'ord-1',
    orderNumber: '#KK-2026-101',
    apparelTitle: 'Kaos Custom Kaos Kami (Combed 24s)',
    colorName: 'Obsidian Black',
    size: 'XL',
    quantity: 1,
    printWidthCm: 28.5,
    printHeightCm: 22.0,
    status: 'PENDING_DESIGN_APPROVAL',
    totalAmount: 114000,
    paymentMethod: 'QRIS Instant',
    deliveryMethod: 'Ambil di Workshop',
    createdAt: '10 menit yang lalu',
  },
  {
    id: 'ord-2',
    orderNumber: '#KK-2026-098',
    apparelTitle: 'Hoodie Jumper Kaos Kami',
    colorName: 'Pure White',
    size: 'L',
    quantity: 2,
    printWidthCm: 26.0,
    printHeightCm: 26.0,
    status: 'PRINTING_DTF',
    totalAmount: 390000,
    paymentMethod: 'QRIS',
    deliveryMethod: 'Ambil di Workshop',
    createdAt: '1 jam yang lalu',
  },
  {
    id: 'ord-3',
    orderNumber: '#KK-2026-095',
    apparelTitle: 'Coach Jacket Waterproof',
    colorName: 'Signal Tangerine',
    size: 'M',
    quantity: 1,
    printWidthCm: 24.0,
    printHeightCm: 18.0,
    status: 'COMPLETED',
    totalAmount: 220000,
    paymentMethod: 'QRIS Instant',
    deliveryMethod: 'Kurir Internal Flat Rate',
    createdAt: 'Kemarin',
  },
];

type MainTab = 'orders' | 'revenue' | 'kanban' | 'stock' | 'coupons';
type ReportRange = 'today' | '7d' | '30d';

interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

function formatIdr(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `Rp ${Number(v).toLocaleString('id-ID')}`;
}

function honestNum(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return String(v);
}

const KANBAN_STAGES = [
  'DESIGN_PREP',
  'SCREEN_PRINT_SETUP',
  'PRINTING',
  'PRESSING',
  'QUALITY_CHECK',
  'PACKAGING',
  'DONE',
] as const;

export function AdminMobileDashboard({
  onClose,
  onNotify,
}: {
  onClose?: () => void;
  onNotify?: (msg: string) => void;
}) {
  // Demo HANYA bila eksplisit ?demo=1 di URL (uji UI offline). Default = sesi nyata.
  const [demoExplicit] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      return new URLSearchParams(window.location.search).get('demo') === '1';
    } catch {
      return false;
    }
  });

  const [session, setSession] = useState<AdminSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Form login (cermin web AuthModal: identifier email/username/WA + password).
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderItemData[]>([]);
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PRODUCTION' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItemData | null>(null);
  const [spkModalData, setSpkModalData] = useState<AdminJobTicketData | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const [mainTab, setMainTab] = useState<MainTab>('orders');

  // Tab read-only: revenue / kupon.
  const [reportRange, setReportRange] = useState<ReportRange>('7d');
  const [reportData, setReportData] = useState<any | null>(null);
  const [reportStatus, setReportStatus] = useState<number | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [couponData, setCouponData] = useState<any | null>(null);
  const [couponStatus, setCouponStatus] = useState<number | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Coba tarik antrean produksi asli dari server (butuh sesi admin via cookie
  // better-auth — lihat mobileApiClient.getProductionTasks). 401/403 = belum
  // login / role tak diizinkan → tampilkan login, JANGAN fallback demo diam.
  const loadLiveTasks = useCallback(async () => {
    setLoadingLive(true);
    setLiveError(null);
    try {
      const tasks = await mobileApiClient.getProductionTasks();
      setRawTasks(Array.isArray(tasks) ? tasks : []);
      if (tasks.length > 0) {
        setOrders(
          tasks.map((t: any) => {
            const first = t.order?.items?.[0];
            const total = (t.order?.items || []).reduce(
              (s: number, it: any) => s + (it.lineTotalIdr || 0),
              0
            );
            const artworkUrl = first?.snapshotImageUrl || first?.design?.previewImageFrontUrl || (Array.isArray(first?.decals) ? first?.decals[0]?.url : null) || null;
            const customerPhone = t.order?.shippingAddress?.phoneNumber || t.order?.user?.phoneNumber || '';
            // Q3: nama pelanggan ASLI (user.name / recipient) — JANGAN apparelTitle.
            // DPI tak ada di ProductionTask server → null (diisi aktual dari
            // store/artwork saat SPK dibuka, bukan 300 karangan).
            const customerName =
              t.order?.user?.name || t.order?.shippingAddress?.recipientName || t.order?.recipientName || 'Pelanggan';
            return {
              id: t.orderId || t.id,
              taskId: t.id,
              orderNumber: t.order?.orderNumber || t.orderId,
              customerName,
              apparelTitle: first?.snapshotName || 'Pesanan Sablon DTF',
              colorName: first?.snapshotColorName || '-',
              size: first?.snapshotSize || '-',
              quantity: first?.quantity || 1,
              printWidthCm: t.printWidthCm ?? 0,
              printHeightCm: t.printHeightCm ?? 0,
              status: STAGE_TO_STATUS[t.stage] ?? 'PENDING_DESIGN_APPROVAL',
              totalAmount: total,
              paymentMethod: '-',
              deliveryMethod: t.order?.deliveryMethod || '-',
              createdAt: t.createdAt || '',
              artworkUrl,
              customerPhone,
              decalDpi: null,
            } as OrderItemData;
          })
        );
        setLiveMode(true);
      } else {
        // Sesi valid tapi antrean kosong = jujur kosong (bukan demo).
        setOrders([]);
        setLiveMode(true);
      }
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/401/.test(msg)) {
        setLiveError('Sesi admin belum masuk (401). Login dulu di bawah.');
      } else if (/403/.test(msg)) {
        setLiveError('Akun ini tak punya akses workshop (403). Minta role ADMIN/staf ke admin web.');
      } else {
        setLiveError('Gagal menghubungi server. Periksa koneksi lalu muat ulang.');
      }
      setLiveMode(false);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  // Boot: demo eksplisit → pakai data demo + badge; selain itu cek sesi nyata.
  useEffect(() => {
    (async () => {
      if (demoExplicit) {
        setOrders(DEMO_ADMIN_ORDERS);
        setRawTasks([]);
        setLiveMode(false);
        setSession(null);
        setSessionChecked(true);
        setSessionLoading(false);
        return;
      }
      try {
        const s = await mobileApiClient.getAdminSession();
        if (s && WORKSHOP_ROLES.includes(s.role)) {
          setSession(s);
          await loadLiveTasks();
        } else if (s) {
          // Login tapi role CUSTOMER → tolak jujur (bukan demo).
          setSession(null);
          setLoginError(`Akun ${s.email} ber-role ${s.role} — tak punya akses workshop. Minta role ke admin web.`);
          await mobileApiClient.adminSignOut();
        } else {
          setSession(null);
        }
      } catch {
        setSession(null);
      } finally {
        setSessionChecked(true);
        setSessionLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await mobileApiClient.adminSignIn(identifier, password);
      if (!res.ok) {
        setLoginError(res.error || 'Login gagal.');
        return;
      }
      // Verifikasi sesi nyata (cookie HttpOnly tak bisa dibaca manual).
      const s = await mobileApiClient.getAdminSession();
      if (!s) {
        setLoginError('Login terkirim tapi sesi tak terbaca (cookie diblokir / CORS). Coba build native atau browser web.');
        return;
      }
      if (!WORKSHOP_ROLES.includes(s.role)) {
        setLoginError(`Akun ${s.email} ber-role ${s.role} — tak punya akses workshop.`);
        await mobileApiClient.adminSignOut();
        return;
      }
      setSession(s);
      onNotify?.(`Masuk sebagai ${s.name || s.email} (${s.role}).`);
      await loadLiveTasks();
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    haptic.tap();
    await mobileApiClient.adminSignOut();
    setSession(null);
    setOrders([]);
    setRawTasks([]);
    setLiveMode(false);
    setReportData(null);
    setCouponData(null);
    setMainTab('orders');
    setIdentifier('');
    setPassword('');
    onNotify?.('Keluar dari sesi admin di perangkat ini.');
  };

  const loadReport = useCallback(async (range: ReportRange) => {
    setLoadingReport(true);
    setReportError(null);
    setReportStatus(null);
    const res = await mobileApiClient.getAdminReports(range);
    setReportStatus(res.status);
    if (res.status === 200 && res.data) {
      setReportData(res.data);
    } else if (res.status === 401) {
      setReportError('Belum login (401). Login admin dulu.');
    } else if (res.status === 403) {
      setReportError('Khusus ADMIN / SUPER_ADMIN (403). Akun staf produksi tak boleh lihat omset.');
    } else {
      setReportError(res.error || 'Gagal memuat laporan.');
    }
    setLoadingReport(false);
  }, []);

  const loadCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    setCouponError(null);
    setCouponStatus(null);
    const res = await mobileApiClient.getAdminCoupons(50);
    setCouponStatus(res.status);
    if (res.status === 200 && res.data) {
      setCouponData(res.data);
    } else if (res.status === 401) {
      setCouponError('Belum login (401). Login admin dulu.');
    } else if (res.status === 403) {
      setCouponError('Khusus ADMIN / SUPER_ADMIN (403). Akun staf produksi tak boleh lihat kupon.');
    } else {
      setCouponError(res.error || 'Gagal memuat kupon.');
    }
    setLoadingCoupons(false);
  }, []);

  // Muat tab read-only saat dibuka (hemat kuota: sekali per sesi/range).
  useEffect(() => {
    if (!session || demoExplicit) return;
    if (mainTab === 'revenue' && !reportData && !loadingReport) void loadReport(reportRange);
    if (mainTab === 'coupons' && !couponData && !loadingCoupons) void loadCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab]);

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.apparelTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (filter === 'PENDING') return o.status === 'PENDING_DESIGN_APPROVAL' || o.status === 'PENDING_PAYMENT';
    if (filter === 'PRODUCTION') return o.status === 'PRINTING_DTF' || o.status === 'CURING_PRESS' || o.status === 'QC_PACKED';
    if (filter === 'COMPLETED') return o.status === 'COMPLETED' || o.status === 'SHIPPED';
    return true;
  });

  const kanbanGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const s of KANBAN_STAGES) map.set(s, []);
    for (const t of rawTasks) {
      const stage = String(t.stage || 'DESIGN_PREP');
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage)!.push(t);
    }
    return map;
  }, [rawTasks]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    // KUNCI DEMO (audit HIGH): tanpa liveMode semua mutasi DIKUNCI di UI
    // (tombol disabled + notice). Guard ganda di sini bila dipanggil paksa.
    if (!liveMode) {
      onNotify?.(demoExplicit ? 'Mode demo (?demo=1) — ACC dikunci. Login admin untuk aksi live.' : 'Belum tersambung live — login admin untuk aksi live.');
      return;
    }
    haptic.success();
    const target = orders.find((o) => o.id === orderId);
    const serverStage = STATUS_TO_STAGE[newStatus];
    // ACC 1-klik asli: PATCH ke server jika taskId tersedia DAN ada padanan stage.
    // Jujur: tanpa padanan (mis. REJECTED) = lokal saja, beri tahu eksplisit.
    // Jujur: bila server gagal, JANGAN klaim sukses.
    let synced = true;
    let localOnly = false;
    if (target?.taskId && serverStage) {
      synced = await mobileApiClient.advanceProductionTask(target.taskId, serverStage);
    } else if (target?.taskId && !serverStage) {
      localOnly = true;
    }
    if (!synced) {
      onNotify?.('Gagal sinkron ke server (sesi kedaluwarsa / offline). Status TIDAK diubah.');
      return;
    }
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    if (onNotify) {
      onNotify(
        localOnly
          ? `Pesanan ${selectedOrder?.orderNumber} ditolak (lokal — tak ada padanan server).`
          : `Pesanan ${selectedOrder?.orderNumber} status diubah ke: ${newStatus}`
      );
    }
  };

  const pendingApprovalCount = orders.filter((o) => o.status === 'PENDING_DESIGN_APPROVAL').length;
  // ACC dikunci bila demo (jujur: JANGAN klaim sukses lokal sebagai ACC).
  const accLocked = !liveMode;
  const isAdminOnly = session ? ADMIN_ONLY_ROLES.includes(session.role) : false;

  // ---- Layar loading sesi -------------------------------------------------
  if (!sessionChecked || sessionLoading) {
    return (
      <div className="space-y-4 pb-12 select-none">
        <GlassCard glow className="p-6 text-center space-y-2">
          <RefreshCw className="w-6 h-6 mx-auto text-zinc-400 animate-spin" />
          <p className="text-xs text-zinc-400">Memeriksa sesi admin (better-auth)…</p>
        </GlassCard>
      </div>
    );
  }

  // ---- Layar login (default TANPA demo diam) -------------------------------
  if (!session && !demoExplicit) {
    return (
      <div className="space-y-4 pb-12 select-none">
        <GlassCard glow className="p-4 bg-gradient-to-r from-zinc-900 to-zinc-800/95 border-zinc-700/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-['Syne']">Admin Mobile Workshop</h2>
              <p className="text-[11px] text-zinc-400">Login sesi admin nyata (better-auth) — tanpa demo diam</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <LogIn className="w-4 h-4 text-emerald-400" /> Masuk akun workshop
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Sama seperti login web (email / username / nomor WA + password). Role yang diterima:{' '}
            <span className="font-mono text-zinc-300">ADMIN, SUPER_ADMIN, PRODUCTION_STAFF</span>.
            Google OAuth lewat browser web — di HP pakai kredensial email.
          </p>
          <form onSubmit={handleLogin} className="space-y-2">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email / username / nomor WA"
              autoComplete="username"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-700/80 text-xs text-white outline-none focus:border-[#FF6B35]"
            />
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 karakter)"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 pr-11 rounded-2xl bg-zinc-900 border border-zinc-700/80 text-xs text-white outline-none focus:border-[#FF6B35]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {loginError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-300">
                {loginError}
              </div>
            )}
            <HapticButton
              variant="primary"
              hapticStyle="success"
              icon={loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              onClick={() => void handleLogin()}
              className="w-full py-3 text-xs font-bold"
            >
              {loginLoading ? 'Memeriksa sesi…' : 'Masuk & Muat Antrean Live'}
            </HapticButton>
          </form>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Uji UI offline tanpa login? Buka halaman ini dengan <span className="font-mono text-zinc-400">?demo=1</span> —
            data contoh hanya tampil bila parameter itu eksplisit.
          </p>
        </GlassCard>
      </div>
    );
  }

  const TABS: { key: MainTab; label: string; icon: React.ReactNode }[] = [
    { key: 'orders', label: 'Pesanan', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'revenue', label: 'Omset', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { key: 'kanban', label: 'Kanban', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { key: 'stock', label: 'Stok', icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'coupons', label: 'Kupon', icon: <Ticket className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Admin Mobile Banner */}
      <GlassCard glow className="p-4 bg-gradient-to-r from-zinc-900 to-zinc-800/95 border-zinc-700/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-['Syne']">Admin Mobile Workshop</h2>
              <p className="text-[11px] text-zinc-400">Pusat Moderasi Desain & Sablon DTF</p>
              <p className="text-[10px] mt-0.5 font-mono">
                {demoExplicit ? (
                  <span className="text-amber-400">● Mode demo eksplisit (?demo=1) — data contoh</span>
                ) : loadingLive ? (
                  <span className="text-zinc-500">Menghubungi server…</span>
                ) : liveMode && session ? (
                  <span className="text-emerald-400">● Live: {session.name || session.email} ({session.role})</span>
                ) : (
                  <span className="text-red-400">● Offline / sesi tak valid</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {pendingApprovalCount > 0 && mainTab === 'orders' && (
              <Badge variant="warning" pulse>
                {pendingApprovalCount} Perlu ACC
              </Badge>
            )}
            {!demoExplicit && session && (
              <button
                onClick={handleLogout}
                title="Keluar sesi admin"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 text-[10px] text-zinc-400 hover:text-white"
              >
                <LogOut className="w-3 h-3" /> Keluar
              </button>
            )}
          </div>
        </div>
        {liveError && !demoExplicit && (
          <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 flex items-center justify-between gap-2">
            <span>{liveError}</span>
            <button
              onClick={() => void loadLiveTasks()}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 text-[10px] text-white"
            >
              <RefreshCw className="w-3 h-3" /> Muat ulang
            </button>
          </div>
        )}
      </GlassCard>

      {/* Tab utama */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {TABS.map((t) => {
          const active = mainTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                haptic.selection();
                setMainTab(t.key);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-600/30'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {mainTab === 'orders' && (
        <>
          {/* Search and Quick Filters */}
          <div className="space-y-2">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari ID pesanan, nama baju..."
                  aria-label="Cari pesanan berdasarkan ID atau nama baju"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-700/80 text-xs text-white outline-none focus:border-[#FF6B35]"
                />
              </div>
              <button
                title="Scan Job Ticket / QR pesanan"
                onClick={async () => {
                  const code = await scanJobTicketOrQris();
                  if (code) {
                    setSearchQuery(code);
                    onNotify?.(`Hasil scan: ${code}`);
                  }
                }}
                className="w-10 h-10 shrink-0 rounded-2xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-[#FF6B35]"
              >
                <ScanLine className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { key: 'ALL', label: 'Semua Pesanan' },
                { key: 'PENDING', label: 'Perlu ACC Desain', count: pendingApprovalCount },
                { key: 'PRODUCTION', label: 'Sedang Dicetak' },
                { key: 'COMPLETED', label: 'Selesai' },
              ].map((tab) => {
                const isActive = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      haptic.selection();
                      setFilter(tab.key as any);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-600/30'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] font-bold">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order List Cards */}
          <div className="space-y-3">
            {loadingLive ? (
              <div className="p-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Memuat antrean live…
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                {demoExplicit
                  ? 'Tidak ada pesanan yang sesuai dengan filter.'
                  : liveMode
                  ? 'Antrean live kosong — belum ada production task dari server.'
                  : 'Belum tersambung. Login admin untuk memuat antrean live.'}
              </div>
            ) : (
              filteredOrders.map((ord) => (
                <GlassCard
                  key={ord.id}
                  interactive
                  onClick={() => {
                    haptic.tap();
                    setSelectedOrder(ord);
                  }}
                  className="p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-white font-mono">{ord.orderNumber}</span>
                    <Badge
                      variant={
                        ord.status === 'PENDING_DESIGN_APPROVAL'
                          ? 'warning'
                          : ord.status === 'COMPLETED'
                          ? 'success'
                          : ord.status === 'REJECTED' || ord.status === 'CANCELLED' || ord.status === 'REFUNDED'
                          ? 'neutral'
                          : 'production'
                      }
                      pulse={ord.status === 'PENDING_DESIGN_APPROVAL'}
                    >
                      {ord.status === 'PENDING_DESIGN_APPROVAL'
                        ? 'Perlu ACC Admin'
                        : ord.status === 'PENDING_PAYMENT'
                        ? 'Menunggu Bayar'
                        : ord.status === 'PRINTING_DTF'
                        ? 'Cetak DTF'
                        : ord.status === 'REJECTED'
                        ? 'Ditolak — baca catatan'
                        : ord.status === 'CANCELLED'
                        ? 'Dibatalkan'
                        : ord.status === 'REFUNDED'
                        ? 'Dana Kembali'
                        : ord.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    {ord.artworkUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/60 border border-zinc-700/80 shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ord.artworkUrl} alt="Artwork" className="w-full h-full object-contain p-0.5" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-850 bg-[#18181B] border border-zinc-700/60 shrink-0 flex items-center justify-center text-zinc-400">
                        <Printer className="w-5 h-5 text-[#FF6B35]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white leading-tight truncate font-['Syne']">{ord.apparelTitle}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        {ord.customerName || 'Pelanggan'} • {ord.colorName} • Size {ord.size} • Sablon{' '}
                        {ord.printWidthCm > 0 && ord.printHeightCm > 0
                          ? `${ord.printWidthCm}x${ord.printHeightCm} cm`
                          : 'menunggu info workshop'}
                      </p>
                    </div>
                    <span className="font-bold text-[#FF6B35] shrink-0 text-xs">
                      Rp {ord.totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{ord.deliveryMethod}</span>
                    <span className="text-[#FF6B35] font-semibold flex items-center gap-1">
                      Detail & ACC Desain →
                    </span>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </>
      )}

      {mainTab === 'revenue' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300">
            Read-only — angka jujur dari <span className="font-mono">GET /api/admin/reports</span>.
            Mutasi (refund/batal/closing) via web <span className="font-mono">/admin</span>.
            {demoExplicit && ' Mode demo: laporan tak dimuat.'}
          </div>
          {!demoExplicit && (
            <div className="flex items-center gap-1.5">
              {(['today', '7d', '30d'] as ReportRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    haptic.selection();
                    setReportRange(r);
                    setReportData(null);
                    void loadReport(r);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    reportRange === r ? 'bg-[#FF6B35] text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {r === 'today' ? 'Hari ini' : r}
                </button>
              ))}
              <button
                onClick={() => void loadReport(reportRange)}
                title="Muat ulang laporan"
                className="ml-auto w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300"
              >
                <RefreshCw className={`w-4 h-4 ${loadingReport ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
          {demoExplicit ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Laporan dimatikan di mode demo. Login admin untuk angka live.</div>
          ) : loadingReport ? (
            <div className="p-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Memuat laporan…
            </div>
          ) : reportError ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">{reportError}</div>
          ) : reportData ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <GlassCard className="p-3">
                  <p className="text-[10px] text-zinc-500">Omset kotor ({reportData.range})</p>
                  <p className="text-sm font-extrabold text-white font-mono">{formatIdr(reportData.gross)}</p>
                </GlassCard>
                <GlassCard className="p-3">
                  <p className="text-[10px] text-zinc-500">Net (kotor−refund−diskon)</p>
                  <p className="text-sm font-extrabold text-emerald-400 font-mono">{formatIdr(reportData.net)}</p>
                </GlassCard>
                <GlassCard className="p-3">
                  <p className="text-[10px] text-zinc-500">Refund</p>
                  <p className="text-sm font-bold text-red-300 font-mono">{formatIdr(reportData.refundTotal)}</p>
                </GlassCard>
                <GlassCard className="p-3">
                  <p className="text-[10px] text-zinc-500">Diskon kupon</p>
                  <p className="text-sm font-bold text-amber-300 font-mono">{formatIdr(reportData.discountTotal)}</p>
                </GlassCard>
              </div>
              <GlassCard className="p-3 space-y-1.5 text-xs">
                <p className="font-bold text-white">Order: {honestNum(reportData.counts?.orders)} • Selesai: {honestNum(reportData.counts?.completed)} • Batal: {honestNum(reportData.counts?.cancelled)} • Refund: {honestNum(reportData.counts?.refunded)}</p>
                <p className="text-zinc-400 text-[11px]">
                  Rata-rata produksi: {reportData.avgTurnaroundHours === null ? '— (tak ada COMPLETED terukur)' : `${reportData.avgTurnaroundHours} jam (n=${reportData.avgTurnaroundMeta?.sample ?? 0})`}
                </p>
                <p className="text-zinc-400 text-[11px]">Express kedaluwarsa SLA 24H: {honestNum(reportData.overdueExpress)}</p>
                {reportData.closing && (
                  <p className="text-zinc-400 text-[11px]">
                    Tutup harian — hari ini ({reportData.closing.today?.date}): {formatIdr(reportData.closing.today?.net)} ({honestNum(reportData.closing.today?.orders)} order)
                    {' '}• kemarin: {formatIdr(reportData.closing.yesterday?.net)} ({honestNum(reportData.closing.yesterday?.orders)} order)
                  </p>
                )}
              </GlassCard>
            </>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">Belum ada data laporan. Ketuk ikon muat ulang.</div>
          )}
        </div>
      )}

      {mainTab === 'kanban' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300">
            Read-only — dikelompokkan dari <span className="font-mono">GET /api/admin/production-tasks</span> yang sama dengan tab Pesanan.
            Maju stage (advance) tetap via tab Pesanan per order.
          </div>
          {demoExplicit ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Kanban dimatikan di mode demo. Login admin untuk antrean live.</div>
          ) : rawTasks.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              {loadingLive ? 'Memuat…' : 'Antrean kosong / belum tersambung. Muat ulang di tab Pesanan.'}
            </div>
          ) : (
            <div className="space-y-2">
              {KANBAN_STAGES.map((stage) => {
                const list = kanbanGroups.get(stage) || [];
                return (
                  <GlassCard key={stage} className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white font-mono">{stage}</span>
                      <Badge variant={list.length > 0 ? 'production' : 'neutral'}>{list.length} task</Badge>
                    </div>
                    {list.length === 0 ? (
                      <p className="text-[11px] text-zinc-600">— kosong —</p>
                    ) : (
                      <div className="space-y-1">
                        {list.slice(0, 8).map((t: any) => (
                          <p key={t.id} className="text-[11px] text-zinc-300 font-mono truncate">
                            {t.order?.orderNumber || t.orderId}
                            {t.assignee ? <span className="text-zinc-500"> • {t.assignee.name || 'staf'}</span> : <span className="text-amber-400/80"> • unassigned</span>}
                          </p>
                        ))}
                        {list.length > 8 && (
                          <p className="text-[10px] text-zinc-500">+{list.length - 8} lagi (cari di tab Pesanan)</p>
                        )}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mainTab === 'stock' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300">
            Read-only — forecast dari <span className="font-mono">GET /api/admin/reports → stockForecast</span> (burn 30 hari ÷ 4).
            Mutasi stok via web <span className="font-mono">/admin</span> (PATCH /api/admin/catalog, delta anti lost-update).
          </div>
          {demoExplicit ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Stok dimatikan di mode demo. Login admin untuk angka live.</div>
          ) : loadingReport && !reportData ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Memuat…</div>
          ) : reportError && !reportData ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">{reportError}</div>
          ) : reportData?.stockForecast ? (
            <div className="space-y-2">
              {(reportData.stockForecast as any[]).slice(0, 20).map((v: any) => (
                <GlassCard key={v.variantId} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{v.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {v.size || ''} {v.colorName ? `• ${v.colorName}` : ''} • burn/minggu: {v.burnPerWeek === null ? '— (tak ada penjualan tercatat)' : v.burnPerWeek}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-extrabold font-mono ${v.qty <= 0 ? 'text-red-400' : v.weeksLeft !== null && v.weeksLeft < 2 ? 'text-amber-400' : 'text-white'}`}>
                      {v.qty} pcs
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {v.weeksLeft === null ? 'sisa: tak terhitung' : `±${v.weeksLeft} minggu`}
                      {v.suggestOrder ? ` • usul +${v.suggestOrder}` : ''}
                    </p>
                  </div>
                </GlassCard>
              ))}
              {(reportData.stockForecast as any[]).length === 0 && (
                <div className="p-8 text-center text-zinc-500 text-xs">Tak ada varian aktif dari server.</div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">
              Buka tab Omset dulu (laporan memuat forecast stok), lalu kembali ke sini.
            </div>
          )}
        </div>
      )}

      {mainTab === 'coupons' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300">
            Read-only — daftar dari <span className="font-mono">GET /api/admin/coupons</span>.
            Buat/nonaktif/hapus kupon via web <span className="font-mono">/admin</span>.
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => void loadCoupons()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 text-[11px] text-zinc-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCoupons ? 'animate-spin' : ''}`} /> Muat ulang
            </button>
          </div>
          {demoExplicit ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Kupon dimatikan di mode demo. Login admin untuk daftar live.</div>
          ) : loadingCoupons ? (
            <div className="p-8 text-center text-zinc-500 text-xs">Memuat kupon…</div>
          ) : couponError ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">{couponError}</div>
          ) : couponData?.coupons ? (
            <div className="space-y-2">
              {(couponData.coupons as any[]).map((c: any) => (
                <GlassCard key={c.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-white font-mono">{c.code}</p>
                    <p className="text-[10px] text-zinc-500">
                      {c.discountType === 'PERCENT' ? `${c.discountValue}%` : formatIdr(c.discountValue)}
                      {' '}• min {formatIdr(c.minSpendIdr)} • pakai {c.usedCount ?? 0}{c.maxUses ? `/${c.maxUses}` : ' (tanpa batas)'}
                    </p>
                  </div>
                  <Badge variant={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                </GlassCard>
              ))}
              {(couponData.coupons as any[]).length === 0 && (
                <div className="p-8 text-center text-zinc-500 text-xs">Belum ada kupon di server.</div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">Belum dimuat. Ketuk muat ulang.</div>
          )}
        </div>
      )}

      {/* Detail & 1-Click Moderation Bottom Sheet */}
      {selectedOrder && (
        <BottomSheet
          open={!!selectedOrder}
          onOpenChange={(open) => {
            if (!open) setSelectedOrder(null);
          }}
          title={`Inspeksi Order ${selectedOrder.orderNumber}`}
          description={`${selectedOrder.apparelTitle} (${selectedOrder.colorName})`}
        >
          <div className="space-y-4 py-2 pb-8">
            {/* Spesifikasi Teknis DTF Sablon */}
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
              <h4 className="font-bold text-white font-['Syne']">Kalibrasi Sablon Workshop:</h4>
              <div className="grid grid-cols-2 gap-2 text-zinc-400">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Pelanggan:</span>
                  <span className="text-white font-bold">{selectedOrder.customerName || 'Pelanggan'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Ukuran Cetak DTF:</span>
                  <span className="text-white font-mono font-bold">
                    {selectedOrder.printWidthCm > 0 && selectedOrder.printHeightCm > 0
                      ? `${selectedOrder.printWidthCm} cm x ${selectedOrder.printHeightCm} cm`
                      : 'menunggu info workshop'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Kualitas Gambar:</span>
                  <span className="text-amber-400 font-bold">
                    {selectedOrder.decalDpi && selectedOrder.decalDpi > 0
                      ? `${selectedOrder.decalDpi} DPI (aktual)`
                      : 'Perlu verifikasi file master'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Metode Pembayaran:</span>
                  <span className="text-white">{selectedOrder.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Opsi Pengiriman:</span>
                  <span className="text-white">{selectedOrder.deliveryMethod}</span>
                </div>
              </div>
            </div>

            {/* Tombol Moderasi Utama (ACC Desain) — DIKUNCI saat demo */}
            {selectedOrder.status === 'PENDING_DESIGN_APPROVAL' && (
              <div className="space-y-2">
                {accLocked && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    <p className="font-bold">{demoExplicit ? 'Mode demo (?demo=1) — ACC dikunci' : 'Belum live — ACC dikunci'}</p>
                    <p className="text-[10px] text-amber-300/80 mt-0.5">
                      {demoExplicit
                        ? 'Data contoh untuk uji UI. Login admin untuk menyetujui desain asli.'
                        : 'Tersambung tanpa sesi live. Login admin untuk menyetujui desain asli.'}
                    </p>
                  </div>
                )}
                <HapticButton
                  variant="primary"
                  hapticStyle="success"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  disabled={accLocked}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'PENDING_PAYMENT')}
                  className="w-full py-4 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30 shadow-lg shadow-emerald-600/30"
                >
                  {accLocked ? 'ACC Terkunci (Bukan Live)' : 'Setujui Desain & Terbitkan Tagihan QRIS'}
                </HapticButton>

                <HapticButton
                  variant="destructive"
                  hapticStyle="error"
                  icon={<XCircle className="w-4 h-4" />}
                  disabled={accLocked}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'REJECTED')}
                  className="w-full py-3 text-xs"
                >
                  {accLocked ? 'Tolak Terkunci (Bukan Live)' : 'Tolak Desain (Gambar Pecah / Buram)'}
                </HapticButton>
              </div>
            )}

            {/* Alur Produksi Workshop Selanjutnya */}
            {selectedOrder.status === 'PENDING_PAYMENT' && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <p className="font-bold">Desain telah Anda setujui!</p>
                <p className="text-[10px] text-amber-300/80 mt-0.5">
                  Menunggu pelanggan menyelesaikan pembayaran QRIS di aplikasinya.
                </p>
                {ALLOW_PAYMENT_SIMULATION ? (
                  <HapticButton
                    variant="primary"
                    disabled={accLocked}
                    onClick={() => updateOrderStatus(selectedOrder.id, 'PRINTING_DTF')}
                    className="w-full mt-3 text-xs"
                  >
                    {accLocked ? 'Simulasi Terkunci (Bukan Live)' : 'Simulasikan Pelanggan Sudah Lunas → Kirim ke Mesin DTF'}
                  </HapticButton>
                ) : (
                  <p className="text-[10px] text-zinc-400 mt-2">
                    Simulasi lunas dinonaktifkan di build ini (rilis). Status maju otomatis setelah pembayaran terverifikasi.
                  </p>
                )}
              </div>
            )}

            {/* Stage terminal: label jujur, TANPA aksi merusak */}
            {(selectedOrder.status === 'REJECTED' || selectedOrder.status === 'CANCELLED') && (
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-300">
                <p className="font-bold text-white">
                  {selectedOrder.status === 'REJECTED' ? 'Desain ditolak workshop' : 'Pesanan dibatalkan'}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {selectedOrder.status === 'REJECTED'
                    ? 'Beri tahu pelanggan alasan penolakan via WA di bawah. Tidak ada aksi produksi yang bisa dijalankan dari status ini.'
                    : 'Pesanan ini dibatalkan. Tidak ada aksi produksi yang bisa dijalankan dari status ini.'}
                </p>
              </div>
            )}

            {selectedOrder.status === 'PRINTING_DTF' && (
              <HapticButton
                variant="primary"
                icon={<Flame className="w-4 h-4" />}
                disabled={accLocked}
                onClick={() => updateOrderStatus(selectedOrder.id, 'CURING_PRESS')}
                className="w-full py-3.5 text-xs font-bold"
              >
                {accLocked ? 'Terkunci (Bukan Live)' : 'Cetak Selesai → Lanjut Press Panas 160°C'}
              </HapticButton>
            )}

            {selectedOrder.status === 'CURING_PRESS' && (
              <HapticButton
                variant="primary"
                icon={<Truck className="w-4 h-4" />}
                disabled={accLocked}
                onClick={() => updateOrderStatus(selectedOrder.id, 'SHIPPED')}
                className="w-full py-3.5 text-xs font-bold"
              >
                {accLocked ? 'Terkunci (Bukan Live)' : 'Selesai QC & Packing → Siap Diambil / Diantar'}
              </HapticButton>
            )}

            {/* Lembar SPK Job Ticket Modal Button */}
            <HapticButton
              variant="glass"
              icon={<FileText className="w-4 h-4 text-amber-400" />}
              onClick={() => {
                haptic.tap();
                // Q3: customerName ASLI + DPI AKTUAL (order → store studio →
                // null jujur). JANGAN apparelTitle / 300 karangan.
                let liveDpi: number | null = null;
                try {
                  const d = useMobileStudioStore.getState().decalDpi;
                  liveDpi = typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : null;
                } catch {}
                setSpkModalData({
                  orderNumber: selectedOrder.orderNumber,
                  customerName: selectedOrder.customerName || 'Pelanggan',
                  apparelTitle: selectedOrder.apparelTitle,
                  colorName: selectedOrder.colorName,
                  size: selectedOrder.size,
                  quantity: selectedOrder.quantity,
                  printWidthCm: selectedOrder.printWidthCm,
                  printHeightCm: selectedOrder.printHeightCm,
                  decalDpi: selectedOrder.decalDpi ?? liveDpi ?? null,
                  deliveryMethod: selectedOrder.deliveryMethod,
                  artworkUrl: selectedOrder.artworkUrl,
                });
              }}
              className="w-full py-2.5 text-xs font-bold border-amber-500/30 text-amber-300"
            >
              Lihat Lembar SPK / Job Ticket Workshop
            </HapticButton>

            {/* Quick WhatsApp Dispatch Makassar */}
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
              <span className="font-bold text-white block font-['Syne']">
                Dispatch WhatsApp Pelanggan:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => {
                    haptic.tap();
                    const phone = selectedOrder.customerPhone || SHOP_WHATSAPP;
                    const msg = encodeURIComponent(
                      `Halo Kak! Pesanan ${selectedOrder.orderNumber} (${selectedOrder.apparelTitle}) sudah SELESAI di-press & lolos QC. Silakan ambil di Workshop Kaos Kami (Jl. Galangan Kapal, Lrg. Permandian 1, Kel. Kaluku Bodoa, Tallo). Rute Maps: https://www.google.com/maps?q=-5.106018,119.432396`
                    );
                    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                  }}
                  className="w-full p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-left text-[11px] text-zinc-300 flex items-center gap-2 transition-colors"
                >
                  <span className="shrink-0 text-emerald-400 font-bold">📍</span>
                  <span className="truncate">Siap Ambil di Workshop Tallo</span>
                </button>

                <button
                  onClick={() => {
                    haptic.tap();
                    const phone = selectedOrder.customerPhone || SHOP_WHATSAPP;
                    const msg = encodeURIComponent(
                      `Halo Kak! Pesanan ${selectedOrder.orderNumber} (${selectedOrder.apparelTitle}) sudah selesai dipacking rapi dan kurir tim Kaos Kami sedang MELUNCUR ke alamat Anda. Mohon standby di nomor ini ya. Terima kasih!`
                    );
                    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                  }}
                  className="w-full p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-left text-[11px] text-zinc-300 flex items-center gap-2 transition-colors"
                >
                  <span className="shrink-0 text-sky-400 font-bold">🛵</span>
                  <span className="truncate">Kurir Tim Kaos Kami Sedang Meluncur</span>
                </button>

                <button
                  onClick={() => {
                    haptic.tap();
                    const phone = selectedOrder.customerPhone || SHOP_WHATSAPP;
                    const msg = encodeURIComponent(
                      `Halo Kak! Mengenai pesanan ${selectedOrder.orderNumber}, tim produksi kami mengecek file logo resolusinya kurang tajam (<150 DPI). Boleh kirimkan file mentah PNG transparan / PDF resolusi tinggi via WhatsApp ini agar hasil sablon DTF tidak buram? Terima kasih!`
                    );
                    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                  }}
                  className="w-full p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-left text-[11px] text-zinc-300 flex items-center gap-2 transition-colors"
                >
                  <span className="shrink-0 text-amber-400 font-bold">⚠️</span>
                  <span className="truncate">Minta File Resolusi Tinggi (Buram)</span>
                </button>
              </div>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* SPK Job Ticket Modal */}
      <AdminJobTicketModal
        open={!!spkModalData}
        onOpenChange={(open) => {
          if (!open) setSpkModalData(null);
        }}
        data={spkModalData}
      />
    </div>
  );
}
