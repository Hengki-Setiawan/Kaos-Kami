import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Hygiene Sep 2026: token warna canvas/surface/text-*/brand-*/border-*
      // DIHAPUS — var-nya tak didefinisikan di globals.css mobile & tak satu
      // pun dipakai di src (mobile pakai arbitrary values + zinc). Jangan
      // tambah warna di sini tanpa definisikan var-nya di globals.css.
      // Entri content ./src/pages/** juga dihapus (direktori tak ada).
      fontFamily: {
        // --font-mono belum didefinisikan di CSS (jatuh ke monospace);
        // dipakai ~9x (nomor order dsb). display/sans tak dipakai → dihapus.
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
