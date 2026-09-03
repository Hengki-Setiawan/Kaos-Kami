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
  activeSnapPoint,
  setActiveSnapPoint,
  title,
  description,
  children,
}: BottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={setActiveSnapPoint}
      shouldScaleBackground={false}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-[#18181B] border-t border-zinc-800/80 rounded-t-[28px] outline-none h-[88vh] flex flex-col pb-[env(safe-area-inset-bottom)] z-50 shadow-2xl">
          {/* Native Grab Handle */}
          <div className="pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
            <div className="mx-auto w-12 h-1.5 rounded-full bg-white/25" />
          </div>

          {(title || description) && (
            <div className="px-5 pb-3 border-b border-zinc-800/60 flex-shrink-0">
              {title && <h3 className="text-base font-bold text-white font-['Syne']">{title}</h3>}
              {description && <p className="text-xs text-zinc-400 mt-0.5">{description}</p>}
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
