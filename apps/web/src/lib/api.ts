import ky from "ky";

/**
 * HTTP klient — ky bilan.
 *
 * `prefixUrl: "/api"` — Vite dev server proxy orqali FastAPIga borayapti (vite.config.ts).
 * Production'da nginx shu path'ni backend'ga yo'naltiradi.
 *
 * Auth hook'lar (Bearer token, 401 refresh) Phase 1 — Auth da qo'shiladi.
 */
export const api = ky.create({
  prefixUrl: "/api",
  credentials: "include", // refresh token HttpOnly cookie uchun
  retry: { limit: 1, methods: ["get"] },
  timeout: 10_000,
});
