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
