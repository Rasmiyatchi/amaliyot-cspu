import { QueryClient } from "@tanstack/react-query";

/**
 * Global TanStack Query klient.
 *
 * staleTime 30s — ma'lumot 30 sekund davomida "fresh" hisoblanadi, qayta so'rov yuborilmaydi.
 * refetchOnWindowFocus: false — brauzer tab o'zgartirilganda avto-refetch bo'lmaydi
 * (kutilmaganda ko'p request kelmasin).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
