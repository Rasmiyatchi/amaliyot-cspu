import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { UUID } from "@/lib/api/types";

export type ContractTemplateDoc = {
  id: UUID;
  name: string;
  description: string | null;
  practice_type_id: UUID | null;
  file_attachment: { name: string; path: string; mime: string; size: number } | null;
  html_content: string | null;
  placeholders: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const KEY = ["contract-templates"] as const;

export function useContractTemplates() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get("v1/contract-templates").json<ContractTemplateDoc[]>(),
  });
}

export function useCreateContractTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      file: File;
      name: string;
      description?: string;
      practice_type_id?: UUID;
    }) => {
      const fd = new FormData();
      fd.append("file", input.file);
      fd.append("name", input.name);
      if (input.description) fd.append("description", input.description);
      if (input.practice_type_id) fd.append("practice_type_id", input.practice_type_id);
      return api
        .post("v1/contract-templates", { body: fd, timeout: 60_000 })
        .json<ContractTemplateDoc>();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateContractTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<ContractTemplateDoc> }) =>
      api.patch(`v1/contract-templates/${id}`, { json: data }).json<ContractTemplateDoc>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteContractTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => api.delete(`v1/contract-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export async function downloadContractTemplate(id: UUID, name: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error(i18n.t("common.sessionExpired"));
  const res = await fetch(`/api/v1/contract-templates/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Yuklab bo'lmadi (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".docx") ? name : `${name}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
