// JSON.parse yang tak pernah meledak (audit: satu baris korup = 500 sekatalog).
export function safeJsonArray<T = any>(text: unknown, fallback: T[] = []): T[] {
  if (!text || typeof text !== "string") return fallback;
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}
