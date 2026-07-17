import { Inbox, Loader2, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { AssignmentStatusBadge } from "@/components/admin/assignments/assignment-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GradePanel } from "@/components/admin/assignments/grade-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dateLocale } from "@/i18n";
import { useMyAssignments } from "@/lib/api/assignments";
import type { AssignmentStatus, PracticeAssignment } from "@/lib/api/types";

const ALL = "__all__";
const STATUSES: { value: string; labelKey: string }[] = [
  { value: ALL, labelKey: "supervisorStudents.statuses.all" },
  { value: "active", labelKey: "supervisorStudents.statuses.active" },
  { value: "draft", labelKey: "supervisorStudents.statuses.draft" },
  { value: "completed", labelKey: "supervisorStudents.statuses.completed" },
  { value: "cancelled", labelKey: "supervisorStudents.statuses.cancelled" },
];

/** Supervizorning "Talabalarim" sahifasi — guruh bo'yicha tartiblangan ro'yxat. */
export function SupervisorStudentsPage() {
  const { t } = useTranslation();
  const { data, isPending, error } = useMyAssignments();
  const [search, setSearch] = useState("");
  const [grading, setGrading] = useState<PracticeAssignment | null>(null);
  const [status, setStatus] = useState(ALL);

  const rows = useMemo(() => {
    const items = (data ?? []).filter((a) => {
      if (status !== ALL && a.status !== (status as AssignmentStatus)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${a.student_full_name ?? ""} ${a.student_group_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Tartib: guruh → kurs → F.I.SH.
    return [...items].sort((a, b) => {
      const g = (a.student_group_name ?? "").localeCompare(b.student_group_name ?? "");
      if (g !== 0) return g;
      const c = (a.student_course ?? 0) - (b.student_course ?? 0);
      if (c !== 0) return c;
      return (a.student_full_name ?? "").localeCompare(b.student_full_name ?? "");
    });
  }, [data, search, status]);

  // Guruh bo'yicha guruhlash (tartiblangan ko'rinish)
  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = r.student_group_name ?? t("supervisorStudents.noGroup");
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [rows, t]);

  return (
    <main className="container py-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("supervisorStudents.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("supervisorStudents.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("supervisorStudents.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {t(s.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || status !== ALL) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatus(ALL);
              }}
            >
              {t("common.clear")}
            </Button>
          )}
        </div>

        {isPending && (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {data && rows.length === 0 && (
          <div className="rounded-lg border border-border">
            <EmptyState
              icon={Inbox}
              title={t("supervisorStudents.emptyTitle")}
              description={t("supervisorStudents.emptyDescription")}
            />
          </div>
        )}

        {data && rows.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground">
              <Trans
                i18nKey="supervisorStudents.totalSummary"
                values={{ count: rows.length, groups: grouped.length }}
                components={[<span key="0" className="font-medium text-foreground" />]}
              />
            </div>
            {grouped.map(([group, items]) => (
              <div key={group} className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                  <span className="font-medium">{group}</span>
                  <Badge variant="outline">
                    {t("supervisorStudents.countSuffix", { count: items.length })}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">№</TableHead>
                      <TableHead>{t("common.student")}</TableHead>
                      <TableHead className="w-[70px]">{t("common.course")}</TableHead>
                      <TableHead>{t("common.practiceType")}</TableHead>
                      <TableHead>{t("supervisorStudents.table.object")}</TableHead>
                      <TableHead className="w-[160px]">
                        {t("supervisorStudents.table.period")}
                      </TableHead>
                      <TableHead className="w-[120px]">{t("common.status")}</TableHead>
                      <TableHead className="w-[80px]">
                        {t("supervisorStudents.table.grade")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((a, i) => (
                      <TableRow
                        key={a.id}
                        onClick={() => setGrading(a)}
                        className="cursor-pointer"
                        title={t("supervisorStudents.rowClickHint")}
                      >
                        <TableCell className="text-sm text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{a.student_full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.student_hemis_id}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{a.student_course ?? "—"}</TableCell>
                        <TableCell className="text-sm">{a.practice_type_name}</TableCell>
                        <TableCell className="text-sm">
                          {a.organization_name ?? a.area_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(a.start_date).toLocaleDateString(dateLocale())} —{" "}
                          {new Date(a.end_date).toLocaleDateString(dateLocale())}
                        </TableCell>
                        <TableCell>
                          <AssignmentStatusBadge status={a.status} />
                        </TableCell>
                        <TableCell>
                          {a.final_grade !== null && a.final_grade !== undefined ? (
                            <Badge variant={a.credit_earned ? "success" : "secondary"}>
                              {a.final_grade}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Baholash — 12.07 qarori: yakuniy bahoni biriktirilgan amaliyot rahbari qo'yadi */}
      <Dialog open={!!grading} onOpenChange={(o) => !o && setGrading(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{grading?.student_full_name}</DialogTitle>
            <DialogDescription>
              {grading?.practice_type_name} ·{" "}
              {grading?.organization_name ?? grading?.area_name ?? "—"}
            </DialogDescription>
          </DialogHeader>
          {grading && <GradePanel assignmentId={grading.id} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}
