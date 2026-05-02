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
};

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
      qc.invalidateQueries({ queryKey: systemSettingsKeys.all });
      qc.invalidateQueries({ queryKey: systemSettingsKeys.public });
    },
  });
}
