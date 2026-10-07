import { create } from "zustand";

export type UserRole = "super_admin" | "admin" | "supervisor" | "student";

export type User = {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  must_change_password?: boolean;
  faculty_id?: string | null;
  permissions?: string[];
};

/** Super admin shu foydalanuvchi (yoki guruhi) uchun kirishni to'xtatgan — 423 javobdan. */
export type AccessRestriction = {
  mode: "maintenance" | "restricted";
  message: string | null;
  ends_at: string | null;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isBootstrapped: boolean; // birinchi refresh urinishi tugadi
  /** Berilgan bo'lsa — butun ekran "texnik ishlar" / "kirish cheklangan" ko'rsatadi */
  restriction: AccessRestriction | null;
  setAuth: (user: User, accessToken: string) => void;
  setToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  setRestriction: (restriction: AccessRestriction | null) => void;
  markBootstrapped: () => void;
  clear: () => void;
};

/**
 * Auth store — user ma'lumoti va access token.
 *
 * Access token memoryda — sahifa reload'ida yo'qoladi (xavfsiz).
 * Reload paytida HttpOnly refresh cookie orqali qaytadan olinadi (bootstrap).
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isBootstrapped: false,
  restriction: null,
  setAuth: (user, accessToken) => set({ user, accessToken, isBootstrapped: true }),
  setToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setRestriction: (restriction) => set({ restriction }),
  markBootstrapped: () => set({ isBootstrapped: true }),
  clear: () => set({ user: null, accessToken: null, isBootstrapped: true, restriction: null }),
}));
