import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectEmpty } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAcademicYears } from "@/lib/api/academic";
import { useAssignments } from "@/lib/api/assignments";
import { useCreateContract } from "@/lib/api/contracts";
import { useOrganizations } from "@/lib/api/organizations";
import { usePracticeTypes } from "@/lib/api/practice-types";
import type { ContractTemplate } from "@/lib/api/types";

const TEMPLATES: { value: ContractTemplate; label: string }[] = [
  { value: "4_plus_2", label: "4+2 amaliyoti" },
  { value: "pedagogical", label: "Pedagogik amaliyot" },
  { value: "qualifying", label: "Malakaviy amaliyot" },
  { value: "internship_production", label: "Ishlab chiqarish" },
  { value: "partnership", label: "Dastlabki hamkorlik" },
];

type Props = { open: boolean; onClose: () => void };

export function ContractFormDialog({ open, onClose }: Props) {
  const create = useCreateContract();

  const [templateRef, setTemplateRef] = useState<ContractTemplate>("4_plus_2");
  const [organizationId, setOrganizationId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [practiceTypeId, setPracticeTypeId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const organizations = useOrganizations({ is_active: true }, 1, 100);
  const academicYears = useAcademicYears();
  const practiceTypes = usePracticeTypes();

  // Aktiv AY avtomatik
  useEffect(() => {
    if (open && !academicYearId && academicYears.data?.length) {
      const active = academicYears.data.find((ay) => ay.is_active);
      if (active) setAcademicYearId(active.id);
    }
  }, [open, academicYears.data, academicYearId]);

  // Filter bo'yicha matching assignmentlar
  const assignmentFilters = useMemo(
    () => ({
      organization_id: organizationId || undefined,
      practice_type_id: practiceTypeId || undefined,
      academic_year_id: academicYearId || undefined,
    }),
    [organizationId, practiceTypeId, academicYearId],
  );
  const assignments = useAssignments(assignmentFilters, 1, 100);
  const canShowAssignments = !!organizationId && !!practiceTypeId && !!academicYearId;

  const resetAll = () => {
    setTemplateRef("4_plus_2");
    setOrganizationId("");
    setPracticeTypeId("");
    setSelectedIds(new Set());
    setStartDate("");
    setEndDate("");
    setNotes("");
    create.reset();
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set((assignments.data?.items ?? []).map((a) => a.id)));
  };

  const canSubmit =
    !!templateRef &&
    !!organizationId &&
    !!academicYearId &&
    !!practiceTypeId &&
    selectedIds.size > 0 &&
    !!startDate &&
    !!endDate;

  const handleSubmit = async () => {
    try {
      await create.mutateAsync({
        template_ref: templateRef,
        organization_id: organizationId,
        academic_year_id: academicYearId,
        practice_type_id: practiceTypeId,
        assignment_ids: Array.from(selectedIds),
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
      });
      toast.success("Shartnoma yaratildi — PDF generatsiyaga tayyor");
      handleClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yangi shartnoma</DialogTitle>
          <DialogDescription>
            Tashkilot va amaliyot turi tanlab, mavjud biriktirishlardan shartnoma yarating
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template + AY */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Shartnoma shabloni *</Label>
              <Select value={templateRef} onValueChange={(v) => setTemplateRef(v as ContractTemplate)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>O'quv yili *</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {(academicYears.data ?? []).length === 0 ? (
                    <SelectEmpty message="O'quv yillari yo'q" />
                  ) : (
                    (academicYears.data ?? []).map((ay) => (
                      <SelectItem key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_active && "(aktiv)"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Organization + Practice type */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Tashkilot *</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {(organizations.data?.items ?? []).length === 0 ? (
                    <SelectEmpty message="Tashkilotlar yo'q" />
                  ) : (
                    (organizations.data?.items ?? []).map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amaliyot turi *</Label>
              <Select value={practiceTypeId} onValueChange={setPracticeTypeId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {(practiceTypes.data ?? []).map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Assignments picker */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Biriktirishlar *</Label>
              {canShowAssignments && (assignments.data?.items ?? []).length > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={selectAll}>
                  Hammasi ({assignments.data?.items.length})
                </Button>
              )}
            </div>
            {!canShowAssignments && (
              <Alert>
                <AlertDescription className="text-xs">
                  Avval tashkilot, amaliyot turi va o'quv yilini tanlang
                </AlertDescription>
              </Alert>
            )}
            {canShowAssignments && (
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {(assignments.data?.items ?? []).length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Tanlangan tashkilot va amaliyot turi uchun biriktirishlar yo'q
                  </div>
                ) : (
                  (assignments.data?.items ?? []).map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggle(a.id)}
                        className="h-4 w-4"
                      />
                      <span className="flex-1 truncate">{a.student_full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.student_hemis_id} · {a.student_group_name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
            {selectedIds.size > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Tanlandi: <strong>{selectedIds.size}</strong>
              </p>
            )}
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="s">Boshlanish *</Label>
              <Input
                id="s"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="e">Tugash *</Label>
              <Input
                id="e"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="n">Izoh</Label>
            <Input
              id="n"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5"
              placeholder="Ixtiyoriy"
            />
          </div>

          {create.isError && (
            <Alert variant="destructive">
              <AlertTitle>Xatolik</AlertTitle>
              <AlertDescription>
                {(create.error as Error).message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={create.isPending}>
            Bekor qilish
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Yaratish {selectedIds.size > 0 && <span className="opacity-80">({selectedIds.size})</span>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
