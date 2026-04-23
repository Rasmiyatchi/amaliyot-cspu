import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PracticeType, UUID } from "@/lib/api/types";

export const practiceTypeKeys = {
  all: ["practice-types"] as const,
  list: (includeInactive: boolean) => [...practiceTypeKeys.all, "list", includeInactive] as const,
  detail: (id: UUID) => [...practiceTypeKeys.all, "detail", id] as const,
};

export function usePracticeTypes(includeInactive = false) {
  return useQuery({
    queryKey: practiceTypeKeys.list(includeInactive),
    queryFn: () =>
      api
        .get(`v1/practice-types?include_inactive=${includeInactive}`)
        .json<PracticeType[]>(),
  });
}

export function usePracticeType(id: UUID | null) {
  return useQuery({
    queryKey: id ? practiceTypeKeys.detail(id) : [],
    enabled: !!id,
    queryFn: () => api.get(`v1/practice-types/${id}`).json<PracticeType>(),
  });
}

export function useUpdatePracticeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<PracticeType> }) =>
      api.patch(`v1/practice-types/${id}`, { json: data }).json<PracticeType>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: practiceTypeKeys.all }),
  });
}
