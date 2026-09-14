import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // P0-3: warna terunifikasi web (var didefinisikan di globals.css :root).
      colors: {
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        "text-primary": "var(--color-text-primary)",
        "text-muted": "var(--color-text-muted)",
        "brand-accent": "var(--color-brand-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "border-subtle": "var(--color-border-subtle)",
        success: "var(--color-success)",
      },
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
