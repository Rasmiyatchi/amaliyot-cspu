import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { HemisImportResponse } from "@/lib/api/types";
import { studentKeys } from "@/lib/api/students";
import { academicKeys } from "@/lib/api/academic";

export function useHemisImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<HemisImportResponse> => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post("v1/hemis/import", { body: fd, timeout: 600_000 }).json<HemisImportResponse>();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: academicKeys.all });
    },
  });
}
