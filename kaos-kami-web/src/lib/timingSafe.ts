import { timingSafeEqual } from "crypto";

/** Bandingkan secret/signature anti-timing-attack (length guard + compare konstan). */
export function secretsEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a || "", "utf8");
    const bb = Buffer.from(b || "", "utf8");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
