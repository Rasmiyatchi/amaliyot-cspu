import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { bulkDeleteInBatches } from "@/lib/api/bulk-delete";
import type { CredentialsUpdate } from "@/lib/api/students";
import type { Paginated, Supervisor, SupervisorCreate, UUID } from "@/lib/api/types";

export type SupervisorFilters = {
  organization_id?: UUID;
  search?: string;
  is_active?: boolean;
  faculty_id?: UUID;
  /** organization_id bilan: tashkilotga bog'lanmagan supervizorlarni ham ko'rsatish */
  include_unassigned?: boolean;
};

export type SupervisorUpdate = Partial<Omit<SupervisorCreate, "username" | "password">> & {
  is_active?: boolean;
};

export const supervisorKeys = {
  all: ["supervisors"] as const,
  lists: () => [...supervisorKeys.all, "list"] as const,
  list: (f: SupervisorFilters, page: number, pageSize: number) =>
    [...supervisorKeys.lists(), f, page, pageSize] as const,
  detail: (id: UUID) => [...supervisorKeys.all, "detail", id] as const,
};

function qs(filters: SupervisorFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", String(pageSize));
  if (filters.organization_id) p.set("organization_id", filters.organization_id);
  if (filters.search) p.set("search", filters.search);
  if (filters.is_active !== undefined) p.set("is_active", String(filters.is_active));
  if (filters.faculty_id) p.set("faculty_id", filters.faculty_id);
  if (filters.include_unassigned) p.set("include_unassigned", "true");
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

export function useSupervisor(id: UUID | null) {
  return useQuery({
    queryKey: supervisorKeys.detail(id ?? ""),
    queryFn: () => api.get(`v1/supervisors/${id}`).json<Supervisor>(),
    enabled: !!id,
  });
}

/** Saqlangandan keyin: detal keshi server javobi bilan yangilanadi, ro'yxatlar qayta so'raladi. */
function useSupervisorSaved() {
  const qc = useQueryClient();
  return (supervisor: Supervisor) => {
    qc.setQueryData(supervisorKeys.detail(supervisor.id), supervisor);
    return qc.invalidateQueries({ queryKey: supervisorKeys.lists() });
  };
}

export function useCreateSupervisor() {
  const onSaved = useSupervisorSaved();
  return useMutation({
    mutationFn: (data: SupervisorCreate) =>
      api.post("v1/supervisors", { json: data }).json<Supervisor>(),
    onSuccess: onSaved,
  });
}

export function useUpdateSupervisor() {
  const onSaved = useSupervisorSaved();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: SupervisorUpdate }) =>
      api.patch(`v1/supervisors/${id}`, { json: data }).json<Supervisor>(),
    onSuccess: onSaved,
  });
}

export function useUpdateSupervisorCredentials() {
  const onSaved = useSupervisorSaved();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: CredentialsUpdate }) =>
      api.patch(`v1/supervisors/${id}/credentials`, { json: data }).json<Supervisor>(),
    onSuccess: onSaved,
  });
}

export function useDeleteSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/supervisors/${id}`),
    onSuccess: (_res, id) => {
      qc.removeQueries({ queryKey: supervisorKeys.detail(id), exact: true });
      return qc.invalidateQueries({ queryKey: supervisorKeys.lists() });
    },
  });
}

export type SupervisorBulkDeleteResult = {
  requested: number;
  deleted: number;
  failed: { id: UUID; full_name: string | null; error: string }[];
};



/** Backend chegarasi: bir so'rovda 100 ta (SupervisorBulkDeleteRequest). */
const SUPERVISOR_BULK_MAX = 100;

export function useBulkDeleteSupervisors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: UUID[]) =>
      bulkDeleteInBatches(ids, SUPERVISOR_BULK_MAX, (chunk) =>
        api
          .post("v1/supervisors/bulk-delete", { json: { ids: chunk }, timeout: 120_000 })
          .json<SupervisorBulkDeleteResult>(),
      ),
    // Qisman bajarilgan bo'lsa ham ro'yxat yangilansin
    onSettled: () => qc.invalidateQueries({ queryKey: supervisorKeys.all }),
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
