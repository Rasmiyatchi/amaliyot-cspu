import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  SystemSettings,
  SystemSettingsPublic,
  SystemSettingsUpdate,
} from "@/lib/api/types";

export const systemSettingsKeys = {
  all: ["system-settings"] as const,
  public: ["system-settings", "public"] as const,
  attendance: ["system-settings", "attendance"] as const,
};

/** Davomat sozlamalari (kunlik majburiy vaqt) — har qanday admin o'qiydi. */
export function useAttendanceSettings() {
  return useQuery({
    queryKey: systemSettingsKeys.attendance,
    queryFn: () =>
      api.get("v1/system-settings/attendance").json<{ min_practice_minutes: number }>(),
    staleTime: 60_000,
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: systemSettingsKeys.all,
    queryFn: () => api.get("v1/system-settings").json<SystemSettings>(),
  });
}

export function usePublicSettings() {
  return useQuery({
    queryKey: systemSettingsKeys.public,
    queryFn: () =>
      api.get("v1/system-settings/public").json<SystemSettingsPublic>(),
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SystemSettingsUpdate) =>
      api.patch("v1/system-settings", { json: data }).json<SystemSettings>(),
    onSuccess: () => {
      // `all` kaliti `public` va `attendance` ni ham qamraydi (prefiks)
      qc.invalidateQueries({ queryKey: systemSettingsKeys.all });
    },
  });
}
