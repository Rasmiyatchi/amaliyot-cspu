import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Area, AreaCreate, Paginated, UUID } from "@/lib/api/types";

export type AreaFilters = {
  search?: string;
  region?: string;
  is_active?: boolean;
};

export const areaKeys = {
  all: ["areas"] as const,
  list: (f: AreaFilters, page: number, pageSize: number) =>
    [...areaKeys.all, "list", f, page, pageSize] as const,
};

function qs(filters: AreaFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.search) p.set("search", filters.search);
  if (filters.region) p.set("region", filters.region);
  if (filters.is_active !== undefined) p.set("is_active", String(filters.is_active));
  return p.toString();
}

export function useAreas(filters: AreaFilters = {}, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: areaKeys.list(filters, page, pageSize),
    queryFn: () => api.get(`v1/areas?${qs(filters, page, pageSize)}`).json<Paginated<Area>>(),
    placeholderData: (prev) => prev,
  });
}

export function useCreateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AreaCreate>) =>
      api.post("v1/areas", { json: data }).json<Area>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<AreaCreate> }) =>
      api.patch(`v1/areas/${id}`, { json: data }).json<Area>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  });
}

export function useDeleteArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/areas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  });
}
