"use client";

import React from "react";
import { Printer } from "lucide-react";

export const PrintButton: React.FC = () => {
  return (
    <button
      onClick={() => window.print()}
      className="py-2 px-4 bg-black text-white rounded font-bold hover:bg-gray-800 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
      title="Cetak Job Ticket untuk Operator Sablon"
    >
      <Printer size={14} />
      <span>Cetak Dokumen (Ctrl + P)</span>
    </button>
  );
};
