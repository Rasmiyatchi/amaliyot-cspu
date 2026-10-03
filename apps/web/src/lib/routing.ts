import type { UserRole } from "@/stores/auth";

export function landingPathFor(role: UserRole): string {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin";
    case "supervisor":
      return "/supervisor";
    case "student":
      return "/student";
  }
}

/** Yo'l shu rolning o'z bo'limiga tegishlimi (qayta kirishdan keyin qaytarish uchun). */
function isPathInRoleArea(pathname: string, role: UserRole): boolean {
  const area = landingPathFor(role);
  return pathname === area || pathname.startsWith(`${area}/`);
}

type FromLocation = { pathname?: unknown; search?: unknown; hash?: unknown };

/**
 * Login'dan keyin qayerga o'tish: `Protected` login'ga yo'naltirganda `state.from`ni beradi —
 * agar u shu foydalanuvchi rolining bo'limida bo'lsa, o'sha sahifaga qaytaramiz
 * (boshqa rol sahifasiga yuborsak, Protected uni bosh sahifaga qaytarib yuborardi).
 */
export function postLoginPath(role: UserRole, state: unknown): string {
  const from =
    state && typeof state === "object" && "from" in state
      ? (state as { from?: FromLocation }).from
      : undefined;
  const pathname = typeof from?.pathname === "string" ? from.pathname : null;
  if (!pathname || !isPathInRoleArea(pathname, role)) return landingPathFor(role);
  const search = typeof from?.search === "string" ? from.search : "";
  const hash = typeof from?.hash === "string" ? from.hash : "";
  return `${pathname}${search}${hash}`;
}
