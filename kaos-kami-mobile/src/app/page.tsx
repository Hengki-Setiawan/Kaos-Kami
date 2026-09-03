"use client";

import React, { useEffect } from 'react';
import { Palette, ShoppingBag, ClipboardList, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { haptic, initEdgeToEdgeStatusBar } from '@/lib/bridge';

export default function MobileHomePage() {
  useEffect(() => {
    initEdgeToEdgeStatusBar();
  }, []);

  return (
    <main className="flex-1 flex flex-col px-4 pb-24 pt-2">
      {/* Header Mobile */}
      <header className="flex items-center justify-between py-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-orange-400 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-orange-500/20">
            K
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight font-['Syne']">KAOS KAMI</h1>
            <p className="text-[11px] text-zinc-400">Custom 3D & DTF Makassar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Workshop Aktif
          </span>
        </div>
      </header>

      {/* Hero 3D Studio Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-800/80 to-zinc-900/90 border border-zinc-700/60 p-5 mb-5 shadow-2xl">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-[#FF6B35]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FF6B35]/20 text-[#FF6B35] border border-[#FF6B35]/30 mb-3">
            <Sparkles className="w-3 h-3" />
            3D CONFIGURATOR 2026
          </span>
          <h2 className="text-xl font-extrabold text-white mb-1 font-['Syne']">Rancang Kaos 3D Impianmu</h2>
          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            Putar 360°, pasang stiker sablon 1:1 cm, dan rasakan getaran haptic saat mendesain.
          </p>

          <button
            onClick={() => {
              haptic.tapHeavy();
              alert('Membuka Studio 3D Mobile...');
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FF6B35] hover:bg-orange-600 active:scale-[0.98] transition-all text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30"
          >
            <span>Buka Studio 3D Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Grid Menu Cepat */}
      <section className="grid grid-cols-2 gap-3 mb-5">
        <div
          onClick={() => {
            haptic.tap();
            alert('Membuka Katalog Apparel Heavyweight 240 & 280 GSM...');
          }}
          className="p-4 rounded-2xl bg-zinc-850 bg-[#18181B] border border-zinc-800 active:scale-95 transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FF6B35] mb-2">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-0.5 font-['Syne']">Katalog Baju</h3>
          <p className="text-[11px] text-zinc-400">T-Shirt, Hoodie, Jacket</p>
        </div>

        <div
          onClick={() => {
            haptic.tap();
            alert('Membuka Pelacakan Pesanan Sablon Real-time...');
          }}
          className="p-4 rounded-2xl bg-zinc-850 bg-[#18181B] border border-zinc-800 active:scale-95 transition-transform cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2">
            <ClipboardList className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-0.5 font-['Syne']">Lacak Pesanan</h3>
          <p className="text-[11px] text-zinc-400">Live Sablon & Maxim COD</p>
        </div>
      </section>

      {/* Admin Mobile Workshop Banner */}
      <section className="mt-auto p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800/90 border border-zinc-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white font-['Syne']">Workshop Admin Mode</h4>
            <p className="text-[10px] text-zinc-400">ACC desain & kelola sablon langsung dari HP</p>
          </div>
        </div>
        <button
          onClick={() => {
            haptic.selection();
            alert('Mode Admin Mobile Aktif: Anda bisa ACC pesanan dan cek DPI sablon!');
          }}
          className="px-3 py-1.5 rounded-xl bg-zinc-700/80 hover:bg-zinc-600 text-white text-xs font-semibold"
        >
          Masuk
        </button>
      </section>

      {/* Bottom Tab Bar Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0E0E10]/95 backdrop-blur-2xl border-t border-zinc-800/90 pb-[env(safe-area-inset-bottom)] px-3">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => haptic.selection()}
            className="flex flex-col items-center justify-center w-14 text-[#FF6B35]"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-bold">Home</span>
          </button>
          <button
            onClick={() => haptic.selection()}
            className="flex flex-col items-center justify-center w-14 text-zinc-400 hover:text-white"
          >
            <Palette className="w-5 h-5" />
            <span className="text-[10px] mt-1">Studio 3D</span>
          </button>
          <button
            onClick={() => haptic.selection()}
            className="flex flex-col items-center justify-center w-14 text-zinc-400 hover:text-white"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] mt-1">Katalog</span>
          </button>
          <button
            onClick={() => haptic.selection()}
            className="flex flex-col items-center justify-center w-14 text-zinc-400 hover:text-white"
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] mt-1">Pesanan</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
