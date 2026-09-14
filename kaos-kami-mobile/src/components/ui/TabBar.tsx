"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Palette, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { haptic } from '@/lib/bridge/haptics';

export type TabKey = 'home' | 'studio' | 'catalog' | 'orders' | 'profile';

export interface TabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  orderBadgeCount?: number;
}

const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'studio', label: 'Studio 3D', icon: Palette },
  { key: 'catalog', label: 'Katalog', icon: ShoppingBag },
  { key: 'orders', label: 'Pesanan', icon: ClipboardList },
  { key: 'profile', label: 'Akun', icon: User },
];

export function TabBar({ activeTab, onTabChange, orderBadgeCount = 0 }: TabBarProps) {
  return (
    <nav aria-label="Navigasi utama" className="fixed bottom-0 left-0 right-0 z-50 bg-canvas/90 backdrop-blur-2xl border-t border-border-subtle transition-colors pb-[max(12px,env(safe-area-inset-bottom))] px-3">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.key}
              type="button"
              whileTap={{ scale: 0.92 }}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label}
              onClick={() => {
                haptic.selection();
                onTabChange(tab.key);
              }}
              className="relative flex flex-col items-center justify-center w-14 min-h-[44px] h-full py-1 text-xs select-none"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'text-brand-accent scale-110' : 'text-text-muted'
                  }`}
                />
                {tab.key === 'orders' && orderBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-brand-accent text-white text-[9px] font-bold flex items-center justify-center border-2 border-canvas transition-colors">
                    {orderBadgeCount}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                  isActive ? 'text-text-primary font-bold' : 'text-text-muted'
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute top-0 w-8 h-1 bg-brand-accent rounded-full shadow-lg shadow-orange-500/50"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
