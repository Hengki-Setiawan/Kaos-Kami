/**
 * Mode pengembangan eksplisit.
 *
 * JANGAN memakai `NODE_ENV !== "production"` untuk gerbang keamanan: bila
 * NODE_ENV kosong/typo (mis. runtime Worker salah konfigurasi), ekspresi itu
 * justru membuka bypass admin/Turnstile. Hanya "development" dan "test" yang
 * dianggap non-produksi.
 */
export function isDevOrTest(): boolean {
  const env = process.env.NODE_ENV;
  return env === "development" || env === "test";
}
