// Konstanta bersama zona ekspedisi (SSOT untuk route API + halaman admin).
// Zona fallback ini menjamin selalu ada tarif bila API live down —
// tidak boleh dinonaktifkan maupun dihapus (dijaga di [id]/route.ts + UI).
export const DEFAULT_ZONE_ID = "zone_default_lainnya";
