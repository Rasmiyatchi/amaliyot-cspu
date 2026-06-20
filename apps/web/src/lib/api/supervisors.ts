import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { CredentialsUpdate } from "@/lib/api/students";
import type { Paginated, Supervisor, SupervisorCreate, UUID } from "@/lib/api/types";

export type SupervisorFilters = {
  organization_id?: UUID;
  search?: string;
  is_active?: boolean;
};

export const supervisorKeys = {
  all: ["supervisors"] as const,
  list: (f: SupervisorFilters, page: number, pageSize: number) =>
    [...supervisorKeys.all, "list", f, page, pageSize] as const,
};

function qs(filters: SupervisorFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.organization_id) p.set("organization_id", filters.organization_id);
  if (filters.search) p.set("search", filters.search);
  if (filters.is_active !== undefined) p.set("is_active", String(filters.is_active));
  return p.toString();
}

export function useSupervisors(filters: SupervisorFilters = {}, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: supervisorKeys.list(filters, page, pageSize),
    queryFn: () =>
      api.get(`v1/supervisors?${qs(filters, page, pageSize)}`).json<Paginated<Supervisor>>(),
    placeholderData: (prev) => prev,
  });
}

export function useCreateSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SupervisorCreate) =>
      api.post("v1/supervisors", { json: data }).json<Supervisor>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisorKeys.all }),
  });
}

export function useUpdateSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<SupervisorCreate> & { is_active?: boolean } }) =>
      api.patch(`v1/supervisors/${id}`, { json: data }).json<Supervisor>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisorKeys.all }),
  });
}

export function useUpdateSupervisorCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: CredentialsUpdate }) =>
      api.patch(`v1/supervisors/${id}/credentials`, { json: data }).json<Supervisor>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisorKeys.all }),
  });
}

export function useDeleteSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/supervisors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisorKeys.all }),
  });
}

export type SupervisorImportResponse = {
  total_rows: number;
  created: number;
  skipped: number;
  errors: { row: number; name: string | null; message: string }[];
  credentials: { full_name: string; username: string; password: string }[];
};

export function useSupervisorImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api
        .post("v1/supervisors/import", { body: fd, timeout: 120000 })
        .json<SupervisorImportResponse>();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisorKeys.all }),
  });
}
