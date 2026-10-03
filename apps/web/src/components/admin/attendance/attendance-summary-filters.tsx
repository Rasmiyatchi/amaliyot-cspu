import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYears, useDirections, useFaculties, useGroups } from "@/lib/api/academic";
import type { AttendanceSummaryFilters, AttendanceSummarySort } from "@/lib/api/attendance";
import type { AssignmentStatus, Semester } from "@/lib/api/types";

const ALL = "__all__";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: AttendanceSummaryFilters;
  /** Qisman yangilash — ota komponent funksional setState bilan birlashtiradi */
  onChange: (patch: Partial<AttendanceSummaryFilters>) => void;
  onReset: () => void;
};

const STATUSES: AssignmentStatus[] = ["active", "draft", "completed", "cancelled"];
const SORTS: AttendanceSummarySort[] = ["name", "percent_asc", "percent_desc", "red_desc"];

export function AttendanceSummaryFiltersBar({
  search,
  onSearchChange,
  filters,
  onChange,
  onReset,
}: Props) {
  const { t } = useTranslation();
  const faculties = useFaculties();
  const directions = useDirections(filters.faculty_id);
  const groups = useGroups({ directionId: filters.direction_id });
  const years = useAcademicYears();

  const hasAny =
    !!search ||
    !!filters.faculty_id ||
    !!filters.direction_id ||
    !!filters.group_id ||
    !!filters.academic_year_id ||
    !!filters.semester ||
    !!filters.assignment_status ||
    (!!filters.sort && filters.sort !== "name");

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("adminAttendance.searchPlaceholder", {
            defaultValue: "Talaba: F.I.SH., HEMIS ID yoki login...",
          })}
          aria-label={t("common.search")}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={t("common.clear")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs">{t("common.faculty")}</Label>
          <Select
            value={filters.faculty_id ?? ALL}
            onValueChange={(v) =>
              onChange({
                faculty_id: v === ALL ? undefined : v,
                direction_id: undefined,
                group_id: undefined,
              })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>{t("adminAttendance.allFaculties")}</SelectItem>
              {(faculties.data?.items ?? []).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("common.direction")}</Label>
          <Select
            value={filters.direction_id ?? ALL}
            onValueChange={(v) =>
              onChange({ direction_id: v === ALL ? undefined : v, group_id: undefined })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>{t("adminAttendance.allDirections")}</SelectItem>
              {(directions.data?.items ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("common.group")}</Label>
          <Select
            value={filters.group_id ?? ALL}
            onValueChange={(v) => onChange({ group_id: v === ALL ? undefined : v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value={ALL}>{t("adminAttendance.allGroups")}</SelectItem>
              {(groups.data?.items ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} ({t("common.courseN", { n: g.course })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("common.academicYear")}</Label>
          <Select
            value={filters.academic_year_id ?? ALL}
            onValueChange={(v) => onChange({ academic_year_id: v === ALL ? undefined : v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.allYears")}</SelectItem>
              {(years.data ?? []).map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                  {y.is_active ? t("common.activeSuffix") : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("common.semester")}</Label>
          <Select
            value={filters.semester ?? ALL}
            onValueChange={(v) => onChange({ semester: v === ALL ? undefined : (v as Semester) })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              <SelectItem value="fall">{t("common.semesterFall")}</SelectItem>
              <SelectItem value="spring">{t("common.semesterSpring")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">
            {t("adminAttendance.assignmentStatus", { defaultValue: "Biriktirish holati" })}
          </Label>
          <Select
            value={filters.assignment_status ?? ALL}
            onValueChange={(v) =>
              onChange({ assignment_status: v === ALL ? undefined : (v as AssignmentStatus) })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t("adminAttendance.assignmentStatusDefault", { defaultValue: "Aktiv + qoralama" })}
              </SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`adminAttendance.assignmentStatuses.${s}`, { defaultValue: s })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">
            {t("adminAttendance.sort", { defaultValue: "Saralash" })}
          </Label>
          <Select
            value={filters.sort ?? "name"}
            onValueChange={(v) => onChange({ sort: v as AttendanceSummarySort })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`adminAttendance.sorts.${s}`, { defaultValue: s })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          {hasAny && (
            <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
              <X className="h-4 w-4" />
              {t("common.clear")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
