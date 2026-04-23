import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  Organization,
  OrganizationCreate,
  OrganizationKind,
  Paginated,
  UUID,
} from "@/lib/api/types";

export type OrganizationFilters = {
  search?: string;
  kind?: OrganizationKind;
  region?: string;
  is_active?: boolean;
};

export const orgKeys = {
  all: ["organizations"] as const,
  list: (f: OrganizationFilters, page: number, pageSize: number) =>
    [...orgKeys.all, "list", f, page, pageSize] as const,
  detail: (id: UUID) => [...orgKeys.all, "detail", id] as const,
};

function qs(filters: OrganizationFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.search) p.set("search", filters.search);
  if (filters.kind) p.set("kind", filters.kind);
  if (filters.region) p.set("region", filters.region);
  if (filters.is_active !== undefined) p.set("is_active", String(filters.is_active));
  return p.toString();
}

export function useOrganizations(filters: OrganizationFilters = {}, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: orgKeys.list(filters, page, pageSize),
    queryFn: () => api.get(`v1/organizations?${qs(filters, page, pageSize)}`).json<Paginated<Organization>>(),
    placeholderData: (prev) => prev,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OrganizationCreate>) =>
      api.post("v1/organizations", { json: data }).json<Organization>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.all }),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<OrganizationCreate> }) =>
      api.patch(`v1/organizations/${id}`, { json: data }).json<Organization>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.all }),
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/organizations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.all }),
  });
}
