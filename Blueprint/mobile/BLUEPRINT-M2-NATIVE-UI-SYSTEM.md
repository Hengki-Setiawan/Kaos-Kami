# BLUEPRINT M2 — NATIVE-FEEL UI SYSTEM, OKLCH TOKENS & GESTURES 2026
Target agent: Claude 4.5 / GPT-5 / Cursor Composer / Antigravity
Depends on: M1, BLUEPRINT-02 (Design DNA existing)
Version: 3.0 — Sep 2026 (Enterprise Deep Specification)
Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 0. PRINSIP NON-NEGOTIABLE (BLIND TEST 10 DETIK)
Aplikasi mobile Kaos Kami harus lolos "blind test": Pengguna awam tidak boleh bisa membedakan apakah ini webview atau native app dalam 10 detik pertama pemakaian.

### 7 Aturan Mutlak Pengalaman Pengguna:
1. **Setiap Interaksi Memiliki Haptic Feedback:** Tap tombol, ganti warna kain, geser stiker sablon, atau konfirmasi order memberikan getaran fisik mikro.
2. **Scroll Momentum Native & Zero Rubber-Band:** Mencegah overscroll web kaku dengan `overscroll-behavior-y: none`.
3. **Transisi Halaman Native-Style:** Menggunakan `framer-motion` dengan kurva spring natural dan slide horizontal.
4. **Bottom Sheet Berbasis Fisika:** Menggunakan `vaul` dengan penutupan usap jari (*drag-to-dismiss*) dan snap points (15%, 50%, 85%).
5. **Safe Area Wajib Terproteksi:** Mendukung Dynamic Island iPhone, kamera punch-hole, dan bar navigasi gesture Android 15/16.
6. **Zero Browser Artifacts:** Hilangkan seleksi teks biru (`user-select: none`), hilangkan highlight tap abu-abu (`-webkit-tap-highlight-color: transparent`), dan sembunyikan scrollbar bawaan.
7. **Sentuhan Jari Minimal 44x44 pt:** Semua elemen interaktif memiliki tap target luas sesuai Apple Human Interface Guidelines dan Google Material 3.

---

## 1. DESIGN TOKENS — OKLCH COLOR SYSTEM & CSS VARIABLES

File: `src/styles/mobile-tokens.css`
```css
:root {
  /* Brand Primary (Signal Tangerine / DTF Heat Flame) */
  --color-primary: oklch(0.65 0.18 45);        /* #FF6B35 */
  --color-primary-dark: oklch(0.55 0.18 45);   /* #E65100 */
  --color-primary-light: oklch(0.75 0.15 45);  /* #FFA06D */
  --color-primary-glow: rgba(255, 107, 53, 0.35);

  /* Neutrals (Deep Obsidian Streetwear) */
  --color-obsidian: oklch(0.12 0.01 280);      /* #0E0E10 */
  --color-surface: oklch(0.16 0.01 280);       /* #18181B */
  --color-surface-subtle: oklch(0.22 0.01 280);/* #27272A */
  --color-border: oklch(0.28 0.01 280);        /* #3F3F46 */

  /* Text Hierarchy */
  --text-white: #FFFFFF;
  --text-muted: #A1A1AA;
  --text-subtle: #71717A;

  /* Glassmorphism Surface */
  --glass-bg: rgba(24, 24, 27, 0.75);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);

  /* Safe Area Insets (SystemBars Capacitor 8 Compliant) */
  --safe-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
  --safe-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));
  --safe-left: var(--safe-area-inset-left, env(safe-area-inset-left, 0px));
  --safe-right: var(--safe-area-inset-right, env(safe-area-inset-right, 0px));

  /* Typography */
  --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

/* Global Reset for Native Feel */
html, body {
  background-color: var(--color-obsidian);
  color: var(--text-white);
  font-family: var(--font-ui);
  overscroll-behavior-y: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Sembunyikan scrollbar bawaan */
::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
```

File: `src/styles/tokens.ts`
```typescript
export const TOKENS = {
  colors: {
    primary: {
      DEFAULT: '#FF6B35',
      dark: '#E65100',
      light: '#FFA06D',
      glow: 'rgba(255, 107, 53, 0.35)',
    },
    background: {
      obsidian: '#0E0E10',
      surface: '#18181B',
      surfaceSubtle: '#27272A',
      border: '#3F3F46',
    },
    text: {
      white: '#FFFFFF',
      muted: '#A1A1AA',
      subtle: '#71717A',
    },
  },
  animation: {
    spring: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    },
    gentle: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
} as const;
```

---

## 2. CORE NATIVE UI COMPONENTS LENGKAP

### A. Bottom Sheet Berbasis Fisika (Vaul Drawer)
File: `src/components/ui/BottomSheet.tsx`
```tsx
'use client';

import React from 'react';
import { Drawer } from 'vaul';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapPoints?: (string | number)[];
  children: React.ReactNode;
}

export function BottomSheet({
  open,
  onOpenChange,
  snapPoints = ['15%', '50%', '85%'],
  children,
}: BottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground
      repositionInputs={false}
      snapPoints={snapPoints}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-[#18181B] border-t border-zinc-800 rounded-t-[28px] outline-none h-[88vh] flex flex-col pb-[var(--safe-bottom)] z-50 shadow-2xl">
          {/* Native Drag Handle */}
          <div className="mx-auto w-12 h-1.5 rounded-full bg-white/25 mt-3 mb-2 flex-shrink-0" />
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

### B. Haptic Spring Button
File: `src/components/ui/HapticButton.tsx`
```tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { NativeBridge } from '@/bridge/NativeBridge';

interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'success';
  loading?: boolean;
}

export function HapticButton({
  children,
  variant = 'primary',
  hapticStyle = 'light',
  loading = false,
  onClick,
  className = '',
  disabled,
  ...props
}: HapticButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    if (hapticStyle === 'success') {
      NativeBridge.hapticNotification('success');
    } else {
      NativeBridge.hapticTap(hapticStyle);
    }
    onClick?.(e);
  };

  const variants = {
    primary: 'bg-[#FF6B35] text-white shadow-lg shadow-orange-600/30 active:bg-orange-600 font-semibold',
    secondary: 'bg-zinc-800/90 backdrop-blur-md border border-zinc-700/60 text-white active:bg-zinc-700',
    ghost: 'bg-transparent text-zinc-300 hover:text-white active:bg-white/5',
    destructive: 'bg-red-600/90 text-white active:bg-red-700',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`min-h-[48px] px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        children
      )}
    </motion.button>
  );
}
```

### C. GlassCard with Frosted Blur
File: `src/components/ui/GlassCard.tsx`
```tsx
import React from 'react';

export function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-[#18181B]/80 backdrop-blur-xl border border-white/10 shadow-2xl p-4 ${className}`}
    >
      {children}
    </div>
  );
}
```

### D. Native Header dengan Safe Area Top
File: `src/components/ui/NativeHeader.tsx`
```tsx
'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NativeBridge } from '@/bridge/NativeBridge';

interface NativeHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  onBack?: () => void;
}

export function NativeHeader({
  title,
  subtitle,
  showBack = false,
  actions,
  onBack,
}: NativeHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    NativeBridge.hapticTap('light');
    if (onBack) onBack();
    else router.back();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0E0E10]/90 backdrop-blur-xl border-b border-zinc-800/80 pt-[var(--safe-top)] px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-zinc-800/70 flex items-center justify-center text-white active:bg-zinc-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-base font-bold text-white font-['Syne'] leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-zinc-400 leading-none mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
```

### E. Bottom Tab Bar (5 Tab Navigasi)
File: `src/components/ui/TabBar.tsx`
```tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Palette, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { NativeBridge } from '@/bridge/NativeBridge';

const tabs = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Studio 3D', path: '/studio', icon: Palette },
  { label: 'Katalog', path: '/catalog', icon: ShoppingBag },
  { label: 'Pesanan', path: '/orders', icon: ClipboardList },
  { label: 'Profil', path: '/profile', icon: User },
];

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0E0E10]/92 backdrop-blur-2xl border-t border-zinc-800/80 pb-[var(--safe-bottom)] px-3">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path));
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => {
                NativeBridge.hapticTap('light');
                router.push(tab.path);
              }}
              className="relative flex flex-col items-center justify-center w-14 h-full py-1 text-xs"
            >
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? 'text-[#FF6B35]' : 'text-zinc-400'
                }`}
              />
              <span
                className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                  isActive ? 'text-white font-semibold' : 'text-zinc-400'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute top-0 w-8 h-1 bg-[#FF6B35] rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

### F. Multi-Part Color Swatch Picker
File: `src/components/ui/ColorSwatchPicker.tsx`
```tsx
'use client';

import React from 'react';
import { NativeBridge } from '@/bridge/NativeBridge';

const STREETWEAR_PALETTE = [
  { name: 'Obsidian Black', hex: '#0E0E10' },
  { name: 'Vintage White', hex: '#F4F1EA' },
  { name: 'Signal Tangerine', hex: '#FF6B35' },
  { name: 'Military Olive', hex: '#3B413C' },
  { name: 'Washed Charcoal', hex: '#2A2B2E' },
  { name: 'Deep Forest', hex: '#1B3022' },
  { name: 'Indigo Street', hex: '#1E293B' },
];

export function ColorSwatchPicker({
  selectedColor,
  onChange,
  label = 'Warna Kain',
}: {
  selectedColor: string;
  onChange: (color: string) => void;
  label?: string;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-zinc-300">{label}</span>
        <span className="text-xs font-mono text-zinc-400">{selectedColor}</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {STREETWEAR_PALETTE.map((color) => {
          const isSelected = selectedColor.toLowerCase() === color.hex.toLowerCase();
          return (
            <button
              key={color.hex}
              onClick={() => {
                NativeBridge.hapticTap('light');
                onChange(color.hex);
              }}
              style={{ backgroundColor: color.hex }}
              className={`w-9 h-9 rounded-full flex-shrink-0 transition-transform ${
                isSelected ? 'ring-2 ring-[#FF6B35] ring-offset-2 ring-offset-[#18181B] scale-110' : 'opacity-80 active:scale-95'
              }`}
              title={color.name}
            />
          );
        })}
      </div>
    </div>
  );
}
```

### G. Apparel Skeleton Loader (Siluet Kaos Shimmer)
File: `src/components/ui/ApparelSkeletonLoader.tsx`
```tsx
import React from 'react';

export function ApparelSkeletonLoader() {
  return (
    <div className="w-full p-4 space-y-4 animate-pulse">
      {/* 3D Stage Siluet */}
      <div className="w-full h-80 rounded-3xl bg-zinc-800/60 flex items-center justify-center">
        <div className="w-40 h-52 rounded-2xl bg-zinc-700/40" />
      </div>
      {/* Title & Price */}
      <div className="h-6 w-3/4 bg-zinc-800 rounded-lg" />
      <div className="h-4 w-1/2 bg-zinc-800/60 rounded-lg" />
      {/* Swatches */}
      <div className="flex gap-3 pt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-9 h-9 rounded-full bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
```

---

## 3. MATRIKS EDGE CASE UI MOBILE

| Masalah UI | Gejala | Solusi Penanganan |
| :--- | :--- | :--- |
| **Keyboard Muncul Menutupi Input** | Form checkout tertutup keyboard Android | Pasang `@capacitor/keyboard` dengan opsi `resize: 'body'` sehingga layout scrollable |
| **Dynamic Island Menutupi Judul Header** | Teks header terpotong pulau hitam iPhone | Gunakan `padding-top: var(--safe-top)` pada elemen `NativeHeader` |
| **Pinch Zoom Tidak Sengaja di Browser** | Pengguna mencubit layar, seluruh UI ikut membesar | Pasang `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` |
| **Scroll Bersaing Antara Kanvas 3D & Sheet** | Layar tergulung saat memutar kaos 3D | Pasang CSS `touch-action: none` pada elemen Canvas 3D |

---

## 4. ACCEPTANCE CRITERIA
- [ ] Safe area insets atas dan bawah bekerja sempurna di iPhone Dynamic Island dan Android gestural bar.
- [ ] Drag-to-dismiss pada BottomSheet menutup mulus tanpa patah-patah (*60 FPS spring curve*).
- [ ] Setiap tap tombol menghasilkan respon haptic instan tanpa latency terasa.
- [ ] Seluruh tombol dan area interaktif memiliki ukuran minimal 44x44 pt.
- [ ] Warna pakaian berganti seketika dengan animasi swatch aktif.
