import { useMutation } from "@tanstack/react-query";

import i18n from "@/i18n";
import { api, authFetch, readErrorDetail } from "@/lib/api";
import { useAuthStore, type User } from "@/stores/auth";

export type ProfileUpdate = {
  first_name?: string;
  last_name?: string;
  middle_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ChangePassword = {
  current_password: string;
  new_password: string;
};

/** Parol siyosati — backend `ChangePasswordRequest` / `ForceChangePasswordRequest` bilan bir xil. */
export const PASSWORD_MIN_LENGTH = 6;

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (data: ProfileUpdate) =>
      api.patch("v1/auth/me", { json: data }).json<User>(),
    onSuccess: (user) => setUser(user),
  });
}

export function useChangeMyPassword() {
  return useMutation({
    mutationFn: (data: ChangePassword) =>
      api.post("v1/auth/me/change-password", { json: data }),
  });
}

/** Avatar yuklash — multipart; `authFetch` tokenni va tilni qo'shadi, Content-Type'ni brauzer qo'yadi. */
export function useUploadAvatar() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authFetch("/api/v1/auth/me/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        throw new Error(await readErrorDetail(res, i18n.t("common.avatarUploadFailed")));
      }
      return (await res.json()) as User;
    },
    onSuccess: (user) => setUser(user),
  });
}
