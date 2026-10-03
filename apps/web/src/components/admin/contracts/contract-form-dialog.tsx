import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  Loader2,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { OrganizationSearchSelect } from "@/components/admin/assignments/organization-search-select";
import { matchesSearch } from "@/components/admin/assignments/search-select-utils";
import { fetchStudentsPage } from "@/components/admin/assignments/student-queries";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import { useAcademicYears, useAllGroups } from "@/lib/api/academic";
import { useAssignments } from "@/lib/api/assignments";
import { useContractTemplates } from "@/lib/api/contract-templates";
import { useCreateContract } from "@/lib/api/contracts";
import { usePracticeTypes } from "@/lib/api/practice-types";
import { studentKeys, type StudentFilters } from "@/lib/api/students";
import type { ContractTemplate, Student, UUID } from "@/lib/api/types";

const FALLBACK_TEMPLATES: { value: ContractTemplate; labelKey: string }[] = [
  { value: "4_plus_2", labelKey: "contractsContractFormDialog.templates.fourPlusTwo" },
  { value: "pedagogical", labelKey: "contractsContractFormDialog.templates.pedagogical" },
  { value: "qualifying", labelKey: "contractsContractFormDialog.templates.qualifying" },
  { value: "internship_production", labelKey: "contractsContractFormDialog.templates.production" },
  { value: "partnership", labelKey: "contractsContractFormDialog.templates.partnership" },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STUDENT_PAGE_SIZE = 50;
const MAX_VISIBLE_GROUPS = 100;

type BindingMode = "assignments" | "students" | "groups" | "general";
type PickedStudent = { id: string; name: string; hemis_id: string };

type Props = { open: boolean; onClose: () => void };

export function ContractFormDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {/* Kontent faqat ochiq paytda mavjud — har ochilishda toza holat, yopiqda so'rov yo'q */}
        <ContractForm onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function ContractForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateContract();
  const contractTemplates = useContractTemplates();
  const academicYears = useAcademicYears();
  const practiceTypes = usePracticeTypes();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateRef, setTemplateRef] = useState<ContractTemplate>("4_plus_2");
  const [organizationId, setOrganizationId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [practiceTypeId, setPracticeTypeId] = useState("");
  const [bindingMode, setBindingMode] = useState<BindingMode>("assignments");
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Talabalar — server qidiruvi (debounce bilan; har bosishda so'rov ketmasin)
  const [studentSearch, setStudentSearch] = useState("");
  const debouncedStudentSearch = useDebounce(studentSearch.trim(), 300);
  const [pickedStudents, setPickedStudents] = useState<Map<string, PickedStudent>>(new Map());

  const studentFilters: StudentFilters = {
    status: "studying",
    search: debouncedStudentSearch || undefined,
  };
  const studentsQuery = useQuery({
    queryKey: studentKeys.list(studentFilters, 1, STUDENT_PAGE_SIZE),
    queryFn: () => fetchStudentsPage(studentFilters, 1, STUDENT_PAGE_SIZE),
    enabled: bindingMode === "students",
    placeholderData: (prev) => prev,
  });
  const students = studentsQuery.data?.items ?? [];

  const groupsQuery = useAllGroups(
    { academicYearId: academicYearId || undefined },
    { enabled: bindingMode === "groups" },
  );
  const matchedGroups = useMemo(
    () => (groupsQuery.data ?? []).filter((g) => matchesSearch(g.name, groupSearch)),
    [groupsQuery.data, groupSearch],
  );

  const activeTemplates = useMemo(
    () => (contractTemplates.data ?? []).filter((tpl) => tpl.status === "active"),
    [contractTemplates.data],
  );

  // Birinchi faol shablon — standart
  useEffect(() => {
    if (selectedTemplateId || activeTemplates.length === 0) return;
    const first = activeTemplates[0];
    if (!first) return;
    setSelectedTemplateId(first.id);
    if (first.practice_type_id) setPracticeTypeId(first.practice_type_id);
  }, [activeTemplates, selectedTemplateId]);

  // Faol o'quv yili — standart
  useEffect(() => {
    if (academicYearId || !academicYears.data?.length) return;
    const active = academicYears.data.find((ay) => ay.is_active);
    if (active) setAcademicYearId(active.id);
  }, [academicYears.data, academicYearId]);

  const currentTemplate = useMemo(
    () => (contractTemplates.data ?? []).find((tpl) => tpl.id === selectedTemplateId),
    [contractTemplates.data, selectedTemplateId],
  );

  // Shablonning talaba to'ldiradigan maydonlari
  const customVariables = useMemo(() => {
    const vars = (
      currentTemplate as unknown as
        | { variables?: Array<{ key: string; label: string; source: string }> }
        | undefined
    )?.variables;
    return Array.isArray(vars) ? vars.filter((v) => v.source === "student_input") : [];
  }, [currentTemplate]);

  const canShowAssignments = !!organizationId && !!practiceTypeId && !!academicYearId;
  // Faqat uchala filtr tanlanganda so'raladi (aks holda keraksiz 100 ta biriktirish yuklanardi)
  const assignments = useAssignments(
    {
      organization_id: organizationId || undefined,
      practice_type_id: practiceTypeId || undefined,
      academic_year_id: academicYearId || undefined,
    },
    1,
    100,
    { enabled: canShowAssignments && bindingMode === "assignments" },
  );
  const assignmentItems = canShowAssignments ? (assignments.data?.items ?? []) : [];

  const handleTemplateChange = (val: string) => {
    if (UUID_RE.test(val)) {
      setSelectedTemplateId(val);
      const found = (contractTemplates.data ?? []).find((tpl) => tpl.id === val);
      if (found?.practice_type_id) setPracticeTypeId(found.practice_type_id);
    } else {
      setSelectedTemplateId("");
      setTemplateRef(val as ContractTemplate);
    }
  };

  const toggleInSet = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const toggleStudent = (st: Student) => {
    setPickedStudents((prev) => {
      const next = new Map(prev);
      if (next.has(st.id)) next.delete(st.id);
      else next.set(st.id, { id: st.id, name: st.full_name, hemis_id: st.hemis_id });
      return next;
    });
  };

  const selectAllStudentsOnPage = () => {
    setPickedStudents((prev) => {
      const next = new Map(prev);
      for (const st of students) {
        next.set(st.id, { id: st.id, name: st.full_name, hemis_id: st.hemis_id });
      }
      return next;
    });
  };

  const removeStudent = (id: string) => {
    setPickedStudents((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const datesInvalid = !!startDate && !!endDate && endDate < startDate;

  const canSubmit =
    (!!selectedTemplateId || !!templateRef) &&
    !!organizationId &&
    !!academicYearId &&
    !!practiceTypeId &&
    !!startDate &&
    !!endDate &&
    !datesInvalid;

  const handleSubmit = async () => {
    try {
      await create.mutateAsync({
        contract_template_id: UUID_RE.test(selectedTemplateId) ? (selectedTemplateId as UUID) : null,
        template_ref: templateRef,
        organization_id: organizationId as UUID,
        academic_year_id: academicYearId as UUID,
        practice_type_id: practiceTypeId as UUID,
        assignment_ids:
          bindingMode === "assignments" ? (Array.from(selectedAssignmentIds) as UUID[]) : [],
        student_ids: bindingMode === "students" ? (Array.from(pickedStudents.keys()) as UUID[]) : [],
        group_ids: bindingMode === "groups" ? (Array.from(selectedGroupIds) as UUID[]) : [],
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
        variable_values: Object.keys(variableValues).length > 0 ? variableValues : null,
      });
      toast.success(t("contractsContractFormDialog.createdToast"));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const submitSuffix =
    bindingMode === "assignments" && selectedAssignmentIds.size > 0
      ? `(${selectedAssignmentIds.size})`
      : bindingMode === "students" && pickedStudents.size > 0
        ? `(${t("contractsContractFormDialog.studentsCount", { count: pickedStudents.size })})`
        : bindingMode === "groups" && selectedGroupIds.size > 0
          ? `(${t("contractsContractFormDialog.groupsCount", { count: selectedGroupIds.size })})`
          : "";

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>{t("contractsContractFormDialog.title")}</DialogTitle>
            <DialogDescription>{t("contractsContractFormDialog.subtitle")}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4">
        {/* Shablon + o'quv yili */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="contract-template" className="flex flex-wrap items-center gap-1.5">
              <span>{t("contractsContractFormDialog.templateLabel")} *</span>
              {activeTemplates.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                  <Sparkles className="mr-1 h-3 w-3 text-amber-500" />
                  {t("contractsContractFormDialog.activeTemplatesCount", {
                    count: activeTemplates.length,
                  })}
                </Badge>
              )}
            </Label>
            <Select value={selectedTemplateId || templateRef} onValueChange={handleTemplateChange}>
              <SelectTrigger id="contract-template" className="mt-1.5">
                <SelectValue placeholder={t("contractsContractFormDialog.templatePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {contractTemplates.isPending ? (
                  <div className="p-2 text-center text-xs text-muted-foreground">
                    {t("common.loading")}
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
            <Label htmlFor="contract-academic-year">{t("common.academicYear")} *</Label>
            <Select value={academicYearId} onValueChange={setAcademicYearId}>
              <SelectTrigger id="contract-academic-year" className="mt-1.5">
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

        {/* Tashkilot + amaliyot turi */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>{t("common.organization")} *</Label>
            <div className="mt-1.5">
              <OrganizationSearchSelect
                value={organizationId}
                onValueChange={(v) => {
                  setOrganizationId(v);
                  setSelectedAssignmentIds(new Set());
                }}
                placeholder={t("contractsContractFormDialog.selectPlaceholder")}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="contract-practice-type">{t("common.practiceType")} *</Label>
            <Select
              value={practiceTypeId}
              onValueChange={(v) => {
                setPracticeTypeId(v);
                setSelectedAssignmentIds(new Set());
              }}
            >
              <SelectTrigger id="contract-practice-type" className="mt-1.5">
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

        {/* Shablonning dinamik maydonlari */}
        {customVariables.length > 0 && (
          <div className="space-y-3 rounded-lg border border-border/80 bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("contractsContractFormDialog.templateParamsTitle")}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {customVariables.map((v) => (
                <div key={v.key}>
                  <Label htmlFor={`contract-var-${v.key}`} className="text-xs">
                    {v.label}
                  </Label>
                  <Input
                    id={`contract-var-${v.key}`}
                    value={variableValues[v.key] ?? ""}
                    onChange={(e) =>
                      setVariableValues((prev) => ({ ...prev, [v.key]: e.target.value }))
                    }
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Kimlarga biriktiriladi */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("contractsContractFormDialog.bindingTitle")}</Label>

          <Tabs value={bindingMode} onValueChange={(v) => setBindingMode(v as BindingMode)}>
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
              <TabsTrigger value="assignments" className="flex items-center gap-1 px-1 text-[11px]">
                <UserCheck className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("contractsContractFormDialog.bindingAssignments")}</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-1 px-1 text-[11px]">
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("contractsContractFormDialog.bindingStudents")}</span>
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex items-center gap-1 px-1 text-[11px]">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("contractsContractFormDialog.bindingGroups")}</span>
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-1 px-1 text-[11px]">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("contractsContractFormDialog.bindingGeneral")}</span>
              </TabsTrigger>
            </TabsList>

            {/* Biriktirishlar bo'yicha */}
            <TabsContent value="assignments" className="pt-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("contractsContractFormDialog.existingAssignments")}
                </span>
                {assignmentItems.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      setSelectedAssignmentIds(new Set(assignmentItems.map((a) => a.id)))
                    }
                  >
                    {t("contractsContractFormDialog.selectAllWithCount", {
                      n: assignmentItems.length,
                    })}
                  </Button>
                )}
              </div>

              {!canShowAssignments ? (
                <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  {t("contractsContractFormDialog.selectFiltersFirst")}
                </div>
              ) : (
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {assignments.isPending ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : assignmentItems.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      {t("contractsContractFormDialog.noAssignmentsForFilter")}{" "}
                      {t("contractsContractFormDialog.canCreateAnyway")}
                    </div>
                  ) : (
                    assignmentItems.map((a) => (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssignmentIds.has(a.id)}
                          onChange={() =>
                            setSelectedAssignmentIds((prev) => toggleInSet(prev, a.id))
                          }
                          className="h-3.5 w-3.5"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {a.student_full_name}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {a.student_hemis_id}
                          {a.student_group_name ? ` · ${a.student_group_name}` : ""}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
              {selectedAssignmentIds.size > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <Trans
                    i18nKey="contractsContractFormDialog.selectedCount"
                    values={{ n: selectedAssignmentIds.size }}
                    components={[<strong key="0" />]}
                  />
                </p>
              )}
            </TabsContent>

            {/* Talabalar bo'yicha */}
            <TabsContent value="students" className="space-y-2 pt-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-muted-foreground">
                  {t("contractsContractFormDialog.studentsHint")}
                </span>
                {students.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={selectAllStudentsOnPage}
                  >
                    {t("contractsContractFormDialog.selectAllWithCount", { n: students.length })}
                  </Button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("contractsContractFormDialog.studentsSearchPlaceholder")}
                  aria-label={t("contractsContractFormDialog.studentsSearchPlaceholder")}
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="h-8 pl-8 pr-8 text-xs"
                />
                {studentSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStudentSearch("")}
                    aria-label={t("common.clear")}
                    className="absolute right-1 top-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {pickedStudents.size > 0 && (
                <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                    <span>
                      {t("contractsContractFormDialog.selectedStudents", {
                        count: pickedStudents.size,
                      })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPickedStudents(new Map())}
                      className="h-5 px-1 text-[10px] text-destructive hover:bg-destructive/10"
                    >
                      {t("common.clear")}
                    </Button>
                  </div>
                  <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
                    {Array.from(pickedStudents.values()).map((st) => (
                      <Badge
                        key={st.id}
                        variant="secondary"
                        className="flex items-center gap-1 border bg-background px-2 py-0.5 text-[11px] font-normal"
                      >
                        <span>{st.name}</span>
                        <span className="text-[10px] text-muted-foreground">({st.hemis_id})</span>
                        <button
                          type="button"
                          onClick={() => removeStudent(st.id)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                          aria-label={t("contractsContractFormDialog.removeStudent", {
                            name: st.name,
                          })}
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {studentsQuery.isPending ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin" />
                    {t("common.loading")}
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {debouncedStudentSearch
                      ? t("assignmentsSearchSelect.noStudentFound")
                      : t("contractsContractFormDialog.studentsEmpty")}
                  </div>
                ) : (
                  students.map((st) => (
                    <label
                      key={st.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={pickedStudents.has(st.id)}
                        onChange={() => toggleStudent(st)}
                        className="h-3.5 w-3.5"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">
                          {st.full_name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          HEMIS: {st.hemis_id} ·{" "}
                          {st.group_name || t("assignmentsSearchSelect.noGroup")}
                          {st.course ? ` · ${t("common.courseN", { n: st.course })}` : ""}
                          {st.direction_code ? ` · ${st.direction_code}` : ""}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Guruhlar bo'yicha */}
            <TabsContent value="groups" className="space-y-2 pt-2">
              <div className="text-xs text-muted-foreground">
                {t("contractsContractFormDialog.groupsHint")}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder={t("assignmentsSearchSelect.searchGroup")}
                  aria-label={t("assignmentsSearchSelect.searchGroup")}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {groupsQuery.isPending ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : matchedGroups.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    {t("assignmentsSearchSelect.noGroupFound")}
                  </div>
                ) : (
                  matchedGroups.slice(0, MAX_VISIBLE_GROUPS).map((g) => (
                    <label
                      key={g.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.has(g.id)}
                        onChange={() => setSelectedGroupIds((prev) => toggleInSet(prev, g.id))}
                        className="h-3.5 w-3.5"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {t("common.courseN", { n: g.course })}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {matchedGroups.length > MAX_VISIBLE_GROUPS && (
                <p className="text-[11px] text-muted-foreground">
                  {t("assignmentsSearchSelect.moreResults", {
                    shown: MAX_VISIBLE_GROUPS,
                    total: matchedGroups.length,
                  })}
                </p>
              )}
              {selectedGroupIds.size > 0 && (
                <p className="text-xs font-medium text-primary">
                  {t("contractsContractFormDialog.groupsCount", { count: selectedGroupIds.size })}
                </p>
              )}
            </TabsContent>

            {/* Umumiy shartnoma */}
            <TabsContent value="general" className="pt-2">
              <Alert className="border-primary/20 bg-primary/5">
                <Building2 className="h-4 w-4 text-primary" />
                <AlertTitle className="text-xs font-semibold">
                  {t("contractsContractFormDialog.generalTitle")}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  {t("contractsContractFormDialog.generalDescription")}
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </div>

        <Separator />

        {/* Sanalar */}
        <div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="contract-start">{t("contractsContractFormDialog.startDateLabel")} *</Label>
              <Input
                id="contract-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contract-end">{t("contractsContractFormDialog.endDateLabel")} *</Label>
              <Input
                id="contract-end"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                aria-invalid={datesInvalid}
                className="mt-1.5"
              />
            </div>
          </div>
          {datesInvalid && (
            <p role="alert" className="mt-1.5 text-xs text-destructive">
              {t("assignmentsAssignmentWizard.endBeforeStart")}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="contract-notes">{t("common.note")}</Label>
          <Input
            id="contract-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1.5"
            placeholder={t("contractsContractFormDialog.optionalPlaceholder")}
          />
        </div>

        {create.isError && (
          <Alert variant="destructive">
            <AlertTitle>{t("common.error")}</AlertTitle>
            <AlertDescription>{create.error.message}</AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || create.isPending}>
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("contractsContractFormDialog.create")}
          {submitSuffix && <span className="ml-1 opacity-80">{submitSuffix}</span>}
        </Button>
      </DialogFooter>
    </>
  );
}
