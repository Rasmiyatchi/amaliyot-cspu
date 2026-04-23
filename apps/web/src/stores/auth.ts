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
  is_active: boolean;
  last_login_at: string | null;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isBootstrapped: boolean; // birinchi refresh urinishi tugadi
  setAuth: (user: User, accessToken: string) => void;
  setToken: (accessToken: string) => void;
  setUser: (user: User) => void;
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
  setAuth: (user, accessToken) => set({ user, accessToken, isBootstrapped: true }),
  setToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  markBootstrapped: () => set({ isBootstrapped: true }),
  clear: () => set({ user: null, accessToken: null, isBootstrapped: true }),
}));
