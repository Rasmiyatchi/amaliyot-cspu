import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

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

function fetchOrganizations(filters: OrganizationFilters, page: number, pageSize: number) {
  return api
    .get(`v1/organizations?${qs(filters, page, pageSize)}`)
    .json<Paginated<Organization>>();
}

export function useOrganizations(filters: OrganizationFilters = {}, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: orgKeys.list(filters, page, pageSize),
    queryFn: () => fetchOrganizations(filters, page, pageSize),
    placeholderData: (prev) => prev,
  });
}

export type OrganizationKindCounts = {
  /** Barcha tashkilotlar soni (yuklanmagan bo'lsa undefined) */
  total: number | undefined;
  byKind: Partial<Record<OrganizationKind, number>>;
};

/**
 * Har bir tur bo'yicha tashkilotlar soni — serverning `total` qiymatidan olinadi
 * (birinchi N ta yozuvni sanash emas). Har so'rov bitta qator qaytaradi.
 */
export function useOrganizationKindCounts(kinds: readonly OrganizationKind[]): OrganizationKindCounts {
  return useQueries({
    queries: [
      {
        queryKey: orgKeys.list({}, 1, 1),
        queryFn: () => fetchOrganizations({}, 1, 1),
      },
      ...kinds.map((kind) => ({
        queryKey: orgKeys.list({ kind }, 1, 1),
        queryFn: () => fetchOrganizations({ kind }, 1, 1),
      })),
    ],
    combine: (results) => {
      const byKind: Partial<Record<OrganizationKind, number>> = {};
      kinds.forEach((kind, i) => {
        const total = results[i + 1]?.data?.total;
        if (total !== undefined) byKind[kind] = total;
      });
      return { total: results[0]?.data?.total, byKind };
    },
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
