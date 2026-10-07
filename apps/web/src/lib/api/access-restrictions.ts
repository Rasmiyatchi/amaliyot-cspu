import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AccessRestriction, AccessRestrictionCreate, UUID } from "@/lib/api/types";

export const accessRestrictionKeys = {
  all: ["access-restrictions"] as const,
  list: (effectiveOnly: boolean) => [...accessRestrictionKeys.all, "list", effectiveOnly] as const,
};

/** Faqat super admin. `effectiveOnly` — hozir amalda bo'lganlar. */
export function useAccessRestrictions(effectiveOnly = false, enabled = true) {
  return useQuery({
    queryKey: accessRestrictionKeys.list(effectiveOnly),
    queryFn: () =>
      api
        .get(`v1/access-restrictions${effectiveOnly ? "?effective_only=true" : ""}`)
        .json<AccessRestriction[]>(),
    enabled,
  });
}

export function useCreateAccessRestriction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AccessRestrictionCreate) =>
      api.post("v1/access-restrictions", { json: data }).json<AccessRestriction>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessRestrictionKeys.all }),
  });
}

export function useDeactivateAccessRestriction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) =>
      api.post(`v1/access-restrictions/${id}/deactivate`).json<AccessRestriction>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessRestrictionKeys.all }),
  });
}

export function useDeleteAccessRestriction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/access-restrictions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessRestrictionKeys.all }),
  });
}
