// fetchJson terpusat (audit #37): timeout + bedakan 401/429/5xx +
// tangani body non-JSON (502 HTML) tanpa meledak di res.json().
export class FetchError extends Error {
  status: number;
  code: "timeout" | "unauthorized" | "rate_limited" | "server" | "network";
  constructor(status: number, code: FetchError["code"], message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function fetchJson<T = any>(
  url: string,
  init?: RequestInit,
  timeoutMs = 15000
): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e: any) {
    clearTimeout(t);
    if (e?.name === "AbortError") {
      throw new FetchError(0, "timeout", "Server terlalu lama merespons. Coba lagi.");
    }
    throw new FetchError(0, "network", "Koneksi putus. Periksa internet lalu coba lagi.");
  } finally {
    clearTimeout(t);
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401) throw new FetchError(401, "unauthorized", "Sesi habis. Masuk lagi.");
  if (res.status === 429) {
    const retry = res.headers.get("Retry-After");
    throw new FetchError(
      429,
      "rate_limited",
      `Terlalu sering. Tunggu${retry ? ` ${retry} detik` : " sebentar"}.`
    );
  }
  if (!res.ok || !data) {
    throw new FetchError(res.status, "server", (data as any)?.error || `Server error (${res.status}).`);
  }
  if ((data as any)?.error) {
    throw new FetchError(res.status, "server", String((data as any).error));
  }
  return data as T;
}
