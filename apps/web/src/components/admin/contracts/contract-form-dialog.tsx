import { HTTPError } from "ky";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { useContractTemplates } from "@/lib/api/contract-templates";
import { useCreateContract } from "@/lib/api/contracts";
import { useOrganizations } from "@/lib/api/organizations";
import { usePracticeTypes } from "@/lib/api/practice-types";
import type { ContractTemplate, UUID } from "@/lib/api/types";

const FALLBACK_TEMPLATES: { value: ContractTemplate; labelKey: string }[] = [
  { value: "4_plus_2", labelKey: "contractsContractFormDialog.templates.fourPlusTwo" },
  { value: "pedagogical", labelKey: "contractsContractFormDialog.templates.pedagogical" },
  { value: "qualifying", labelKey: "contractsContractFormDialog.templates.qualifying" },
  { value: "internship_production", labelKey: "contractsContractFormDialog.templates.production" },
  { value: "partnership", labelKey: "contractsContractFormDialog.templates.partnership" },
];

type Props = { open: boolean; onClose: () => void };

export function ContractFormDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateContract();
  const contractTemplates = useContractTemplates();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateRef, setTemplateRef] = useState<ContractTemplate>("4_plus_2");
  const [organizationId, setOrganizationId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [practiceTypeId, setPracticeTypeId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const organizations = useOrganizations({ is_active: true }, 1, 100);
  const academicYears = useAcademicYears();
  const practiceTypes = usePracticeTypes();

  // Active templates list
  const activeTemplates = useMemo(() => {
    if (!contractTemplates.data) return [];
    return contractTemplates.data.filter((t) => t.status === "active");
  }, [contractTemplates.data]);

  // Set default template when modal opens
  useEffect(() => {
    if (open) {
      if (activeTemplates.length > 0 && !selectedTemplateId) {
        const firstTpl = activeTemplates[0];
        if (firstTpl) {
          setSelectedTemplateId(firstTpl.id);
          if (firstTpl.practice_type_id) {
            setPracticeTypeId(firstTpl.practice_type_id);
          }
        }
      }
    }
  }, [open, activeTemplates, selectedTemplateId]);

  // Aktiv AY avtomatik
  useEffect(() => {
    if (open && !academicYearId && academicYears.data?.length) {
      const active = academicYears.data.find((ay) => ay.is_active);
      if (active) setAcademicYearId(active.id);
    }
  }, [open, academicYears.data, academicYearId]);

  // Currently selected template object
  const currentTemplate = useMemo(() => {
    return (contractTemplates.data ?? []).find((t) => t.id === selectedTemplateId);
  }, [contractTemplates.data, selectedTemplateId]);

  // Custom student input variables for current template
  const customVariables = useMemo(() => {
    if (!currentTemplate) return [];
    // If template has variables array
    const vars = (currentTemplate as unknown as { variables?: Array<{ key: string; label: string; source: string }> }).variables;
    if (Array.isArray(vars)) {
      return vars.filter((v) => v.source === "student_input");
    }
    return [];
  }, [currentTemplate]);

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

  const handleTemplateChange = (val: string) => {
    setSelectedTemplateId(val);
    const found = (contractTemplates.data ?? []).find((t) => t.id === val);
    if (found?.practice_type_id) {
      setPracticeTypeId(found.practice_type_id);
    }
  };

  const resetAll = () => {
    setSelectedTemplateId("");
    setTemplateRef("4_plus_2");
    setOrganizationId("");
    setPracticeTypeId("");
    setSelectedIds(new Set());
    setStartDate("");
    setEndDate("");
    setNotes("");
    setVariableValues({});
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
    (!!selectedTemplateId || !!templateRef) &&
    !!organizationId &&
    !!academicYearId &&
    !!practiceTypeId &&
    selectedIds.size > 0 &&
    !!startDate &&
    !!endDate;

  const handleSubmit = async () => {
    try {
      await create.mutateAsync({
        contract_template_id: (selectedTemplateId as UUID) || null,
        template_ref: templateRef,
        organization_id: organizationId,
        academic_year_id: academicYearId,
        practice_type_id: practiceTypeId,
        assignment_ids: Array.from(selectedIds),
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
        variable_values: Object.keys(variableValues).length > 0 ? variableValues : null,
      });
      toast.success(t("contractsContractFormDialog.createdToast"));
      handleClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{t("contractsContractFormDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("contractsContractFormDialog.subtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template + AY */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="flex items-center gap-1.5">
                <span>{t("contractsContractFormDialog.templateLabel")} *</span>
                {activeTemplates.length > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                    <Sparkles className="mr-1 h-3 w-3 text-amber-500" />
                    {activeTemplates.length} ta faol shablon
                  </Badge>
                )}
              </Label>
              <Select
                value={selectedTemplateId || (activeTemplates[0]?.id ?? templateRef)}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Shablonni tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {contractTemplates.isLoading ? (
                    <div className="p-2 text-center text-xs text-muted-foreground">
                      Shablonlar yuklanmoqda...
                    </div>
                  ) : activeTemplates.length > 0 ? (
                    activeTemplates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </SelectItem>
                    ))
                  ) : (
                    FALLBACK_TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.value} value={tpl.value}>
                        {t(tpl.labelKey)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("common.academicYear")} *</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t("contractsContractFormDialog.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(academicYears.data ?? []).length === 0 ? (
                    <SelectEmpty message={t("contractsContractFormDialog.noAcademicYears")} />
                  ) : (
                    (academicYears.data ?? []).map((ay) => (
                      <SelectItem key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_active && t("common.activeSuffix").trim()}
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
              <Label>{t("common.organization")} *</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t("contractsContractFormDialog.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(organizations.data?.items ?? []).length === 0 ? (
                    <SelectEmpty message={t("contractsContractFormDialog.noOrganizations")} />
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
              <Label>{t("common.practiceType")} *</Label>
              <Select value={practiceTypeId} onValueChange={setPracticeTypeId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t("contractsContractFormDialog.selectPlaceholder")} />
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

          {/* Dinamik maydonlar (agar shablonda maxsus student_input parametrlari bo'lsa) */}
          {customVariables.length > 0 && (
            <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Shablon parametrlarini to'ldirish
              </Label>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {customVariables.map((v) => (
                  <div key={v.key}>
                    <Label className="text-xs">{v.label}</Label>
                    <Input
                      placeholder={v.label}
                      value={variableValues[v.key] ?? ""}
                      onChange={(e) =>
                        setVariableValues((prev) => ({
                          ...prev,
                          [v.key]: e.target.value,
                        }))
                      }
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Assignments picker */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>{t("contractsContractFormDialog.assignmentsLabel")} *</Label>
              {canShowAssignments && (assignments.data?.items ?? []).length > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={selectAll}>
                  {t("contractsContractFormDialog.selectAllWithCount", {
                    n: assignments.data?.items.length,
                  })}
                </Button>
              )}
            </div>
            {!canShowAssignments && (
              <Alert>
                <AlertDescription className="text-xs">
                  {t("contractsContractFormDialog.selectFiltersFirst")}
                </AlertDescription>
              </Alert>
            )}
            {canShowAssignments && (
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {(assignments.data?.items ?? []).length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {t("contractsContractFormDialog.noAssignmentsForFilter")}
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
                <Trans
                  i18nKey="contractsContractFormDialog.selectedCount"
                  values={{ n: selectedIds.size }}
                  components={[<strong key="0" />]}
                />
              </p>
            )}
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="s">{t("contractsContractFormDialog.startDateLabel")} *</Label>
              <Input
                id="s"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="e">{t("contractsContractFormDialog.endDateLabel")} *</Label>
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
            <Label htmlFor="n">{t("common.note")}</Label>
            <Input
              id="n"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5"
              placeholder={t("contractsContractFormDialog.optionalPlaceholder")}
            />
          </div>

          {create.isError && (
            <Alert variant="destructive">
              <AlertTitle>{t("common.error")}</AlertTitle>
              <AlertDescription>
                {(create.error as Error).message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={create.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("contractsContractFormDialog.create")}{" "}
            {selectedIds.size > 0 && <span className="opacity-80">({selectedIds.size})</span>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
