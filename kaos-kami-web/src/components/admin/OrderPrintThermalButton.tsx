"use client";

import React, { useState } from "react";
import { Printer } from "lucide-react";
import { ThermalShippingLabelModal, type DeliveryLabelOrder } from "@/components/admin/ThermalShippingLabelModal";

interface OrderPrintThermalButtonProps {
  order: DeliveryLabelOrder;
}

export function OrderPrintThermalButton({ order }: OrderPrintThermalButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="py-2 px-3 rounded-xl bg-brand-accent/20 border border-brand-accent/40 hover:bg-brand-accent hover:text-canvas text-brand-accent font-bold transition-all flex items-center gap-1.5 text-xs shadow-xs cursor-pointer active:scale-95"
        title="Cetak Resi & Surat Jalan (Thermal 80mm Bluetooth / 100×150)"
      >
        <Printer size={14} />
        <span>Cetak Resi 80mm (Bluetooth)</span>
      </button>

      {isOpen && (
        <ThermalShippingLabelModal
          order={order}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
