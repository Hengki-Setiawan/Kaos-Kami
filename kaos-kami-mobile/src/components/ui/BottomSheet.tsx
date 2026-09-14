"use client";

import React from 'react';
import { Drawer } from 'vaul';

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapPoints?: (string | number)[];
  activeSnapPoint?: string | number | null;
  setActiveSnapPoint?: (snapPoint: string | number | null) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  open,
  onOpenChange,
  snapPoints = ['15%', '50%', '85%'],
  // Controlled snap default 50%: tanpa prop = snap tengah (tak full 88dvh
  // saat buka — hemat layar HP kecil; user bisa drag ke 85%).
  activeSnapPoint: controlledSnap,
  setActiveSnapPoint: controlledSetSnap,
  title,
  description,
  children,
}: BottomSheetProps) {
  const [innerSnap, setInnerSnap] = React.useState<string | number | null>('50%');
  const activeSnapPoint = controlledSnap ?? innerSnap;
  const setActiveSnapPoint = controlledSetSnap ?? setInnerSnap;
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={setActiveSnapPoint}
      shouldScaleBackground={false}
      // Android: input checkout naik di atas keyboard (paritas iOS).
      // Dipasangkan windowSoftInputMode=adjustResize (AndroidManifest) +
      // keyboardDidShow scroll (page.tsx). iOS aman: setResizeMode Body.
      repositionInputs={true}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 sm:max-w-lg sm:mx-auto bg-surface border-t border-border-subtle rounded-t-[28px] outline-none h-[88dvh] flex flex-col pb-[env(safe-area-inset-bottom)] z-50 shadow-2xl transition-colors">
          {/* Native Grab Handle */}
          <div className="pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
            <div className="mx-auto w-12 h-1.5 rounded-full bg-white/25" />
          </div>

          {(title || description) && (
            <div className="px-5 pb-3 border-b border-border-subtle flex-shrink-0 transition-colors">
              {title && <h3 className="text-base font-bold text-text-primary font-['Syne']">{title}</h3>}
              {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
