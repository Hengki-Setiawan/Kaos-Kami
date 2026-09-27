import { createAuthClient } from "better-auth/react";
import { useState, useEffect } from "react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
});

const CACHE_KEY = "kaoskami_auth_session_cache";

export interface CachedSessionPayload {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string;
    createdAt?: string | Date;
    [key: string]: any;
  };
  session?: {
    id?: string;
    userId?: string;
    expiresAt?: string | Date;
    [key: string]: any;
  } | null;
  cachedAt?: number;
}

/**
 * Membaca snapshot sesi user dari localStorage.
 * Berfungsi menjaga status login saat offline, internet mati, atau server tidak terjangkau.
 */
export function getCachedSession(): CachedSessionPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.user?.id || parsed.id)) {
      if (!parsed.user && parsed.id) {
        return { user: parsed, session: null, cachedAt: Date.now() };
      }
      return parsed;
    }
  } catch {}
  return null;
}

/**
 * Menyimpan snapshot sesi user ke localStorage.
 * Kompatibel dengan web dan WebView mobile Capacitor.
 */
export function setCachedSession(sessionData: any): void {
  if (typeof window === "undefined" || !sessionData) return;
  try {
    const user = sessionData.user || sessionData;
    if (user && user.id) {
      const payload: CachedSessionPayload = {
        user: {
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          image: user.image || null,
          role: user.role || "CUSTOMER",
          createdAt: user.createdAt,
        },
        session: sessionData.session || null,
        cachedAt: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      localStorage.setItem("kaoskami_user_id", user.id);
    }
  } catch {}
}

/**
 * Menghapus snapshot sesi user dari localStorage saat user sengaja logout.
 */
export function clearCachedSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem("kaoskami_user_id");
  } catch {}
}

/**
 * Offline-First useSession Hook
 * 1. Saat online: Menggunakan better-auth live session dan otomatis mencadangkan ke storage.
 * 2. Saat offline / network error: Membaca cache lokal agar user TIDAK PERNAH ter-logout.
 * 3. Saat kembali online: Otomatis merevalidasi sesi ke server.
 */
export function useSession() {
  const sessionResult = authClient.useSession();
  const [cachedData, setCachedData] = useState<CachedSessionPayload | null>(() => getCachedSession());
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      try {
        sessionResult.refetch?.();
      } catch {}
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sessionResult]);

  useEffect(() => {
    if (sessionResult.data?.user?.id) {
      setCachedSession(sessionResult.data);
      setCachedData(sessionResult.data as CachedSessionPayload);
    }
  }, [sessionResult.data]);

  const activeData = (sessionResult.data as CachedSessionPayload | null) || cachedData;

  return {
    ...sessionResult,
    data: activeData,
    isPending: !activeData && sessionResult.isPending,
    isOffline: !isOnline,
  };
}

export const signOut: typeof authClient.signOut = ((...args: any[]) => {
  clearCachedSession();
  return (authClient.signOut as any)(...args);
}) as typeof authClient.signOut;

export const { signIn, signUp } = authClient;
