import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dengan batas cache ramah mobile & low bandwidth
        staleTime: 60 * 1000, // 1 menit data dianggap fresh
        gcTime: 5 * 60 * 1000, // 5 menit garbage collection di memori
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Jangan retry bila 401/403/404
          if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: selalu buat instance baru per-request
    return makeQueryClient();
  } else {
    // Browser: gunakan singleton agar cache tetap bertahan saat re-render
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
