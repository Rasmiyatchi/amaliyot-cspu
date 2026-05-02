import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
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

/** Avatar yuklash — multipart, manual fetch (ky avtomatik header qo'shmoqchi bo'ladi). */
export function useUploadAvatar() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (file: File) => {
      const token = useAuthStore.getState().accessToken;
      if (!token) throw new Error("Sessiya tugagan");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/auth/me/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = "Avatar yuklab bo'lmadi";
        try {
          const j = JSON.parse(text);
          if (j.detail) msg = j.detail;
        } catch {
          if (text) msg = text;
        }
        throw new Error(msg);
      }
      return res.json() as Promise<User>;
    },
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
