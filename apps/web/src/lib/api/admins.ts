import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CredentialsUpdate } from "@/lib/api/students";
import type {
  Admin,
  AdminCreate,
  AdminUpdate,
  Paginated,
  UUID,
} from "@/lib/api/types";

export type AdminFilters = {
  search?: string;
  is_active?: boolean;
};

export const adminKeys = {
  all: ["admins"] as const,
  lists: () => [...adminKeys.all, "list"] as const,
  list: (f: AdminFilters, page: number) =>
    [...adminKeys.lists(), f, page] as const,
  detail: (id: UUID) => [...adminKeys.all, "detail", id] as const,
};

function qs(filters: AdminFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.search) p.set("search", filters.search);
  if (filters.is_active !== undefined) p.set("is_active", String(filters.is_active));
  return p.toString();
}

export function useAdmins(filters: AdminFilters = {}, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: adminKeys.list(filters, page),
    queryFn: () =>
      api.get(`v1/admins?${qs(filters, page, pageSize)}`).json<Paginated<Admin>>(),
    placeholderData: (prev) => prev,
  });
}

export function useAdmin(id: UUID | null) {
  return useQuery({
    queryKey: adminKeys.detail(id ?? ""),
    queryFn: () => api.get(`v1/admins/${id}`).json<Admin>(),
    enabled: !!id,
  });
}

/** Saqlangandan keyin: detal keshi server javobi bilan yangilanadi, ro'yxatlar qayta so'raladi. */
function useAdminSaved() {
  const qc = useQueryClient();
  return (admin: Admin) => {
    qc.setQueryData(adminKeys.detail(admin.id), admin);
    return qc.invalidateQueries({ queryKey: adminKeys.lists() });
  };
}

export function useCreateAdmin() {
  const onSaved = useAdminSaved();
  return useMutation({
    mutationFn: (data: AdminCreate) =>
      api.post("v1/admins", { json: data }).json<Admin>(),
    onSuccess: onSaved,
  });
}

export function useUpdateAdmin() {
  const onSaved = useAdminSaved();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: AdminUpdate }) =>
      api.patch(`v1/admins/${id}`, { json: data }).json<Admin>(),
    onSuccess: onSaved,
  });
}

export function useUpdateAdminCredentials() {
  const onSaved = useAdminSaved();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: CredentialsUpdate }) =>
      api.patch(`v1/admins/${id}/credentials`, { json: data }).json<Admin>(),
    onSuccess: onSaved,
  });
}

export function useDeleteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/admins/${id}`),
    onSuccess: (_res, id) => {
      qc.removeQueries({ queryKey: adminKeys.detail(id), exact: true });
      return qc.invalidateQueries({ queryKey: adminKeys.lists() });
    },
  });
}
