"use client";

import React from "react";
import { Printer } from "lucide-react";

interface PrintInvoiceButtonProps {
  className?: string;
  label?: string;
}

export function PrintInvoiceButton({
  className,
  label = "CETAK NOTA RESMI",
}: PrintInvoiceButtonProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={
        className ||
        "py-2.5 px-4 rounded-xl bg-surface border border-border-subtle hover:border-brand-accent text-text-primary hover:text-brand-accent font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 print:hidden"
      }
      title="Cetak nota atau simpan sebagai PDF"
    >
      <Printer size={15} />
      <span>{label}</span>
    </button>
  );
}
