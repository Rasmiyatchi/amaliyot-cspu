import { useEffect } from "react";

import { bootstrap } from "@/lib/auth-api";
import { useAuthStore } from "@/stores/auth";

/**
 * App ishga tushgan zahoti bir marta bootstrap'ni chaqiradi.
 * HttpOnly refresh cookie mavjud bo'lsa — sessiya tiklanadi.
 */
export function useBootstrap(): { isReady: boolean } {
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);

  useEffect(() => {
    if (!isBootstrapped) void bootstrap();
  }, [isBootstrapped]);

  return { isReady: isBootstrapped };
}
