import { HTTPError } from "ky";
import { BookOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { TaskTemplateFormDialog } from "@/components/admin/task-templates/task-template-form-dialog";
import {
  TaskCategoryBadge,
  TaskTypeLabel,
} from "@/components/admin/tasks/task-type-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePracticeTypes } from "@/lib/api/practice-types";
import {
  useDeleteTaskTemplate,
  useTaskTemplates,
} from "@/lib/api/tasks";
import type { Semester, TaskCategory, TaskTemplate, UUID } from "@/lib/api/types";

const ALL = "__all__";

const SEMESTER_LABEL_KEY: Record<Semester, string> = {
  fall: "common.semesterFall",
  spring: "common.semesterSpring",
};

export function TaskTemplatesPage() {
  const { t } = useTranslation();
  const practiceTypes = usePracticeTypes();
  const [practiceTypeId, setPracticeTypeId] = useState<string>("");
  const [course, setCourse] = useState<string>(ALL);
  const [semester, setSemester] = useState<string>(ALL);

  // Default: 4+2 (maktab) tanlansin — uning templatelari bor
  const effectivePracticeTypeId = useMemo(() => {
    if (practiceTypeId) return practiceTypeId;
    const found = practiceTypes.data?.find((p) => p.code === "4_plus_2_school");
    return found?.id ?? "";
  }, [practiceTypeId, practiceTypes.data]);

  const { data: templates, isPending, error } = useTaskTemplates({
    practice_type_id: effectivePracticeTypeId || undefined,
    course: course !== ALL ? Number(course) : undefined,
    semester: semester !== ALL ? (semester as Semester) : undefined,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<UUID | null>(null);
  const deleteTemplate = useDeleteTaskTemplate();

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteTemplate.mutateAsync(deletingId);
      toast.success(t("adminTaskTemplates.templateDeleted"));
      setDeletingId(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  // Grouping: course → semester → category
  const grouped = useMemo(() => {
    if (!templates) return new Map<string, TaskTemplate[]>();
    const m = new Map<string, TaskTemplate[]>();
    for (const t of templates) {
      const key = `${t.course}|${t.semester}|${t.category}`;
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [templates]);

  const groupKeys = Array.from(grouped.keys()).sort();

  const totalByGroup = (key: string) =>
    grouped.get(key)!.reduce((acc, t) => acc + t.points, 0);

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("adminTaskTemplates.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("adminTaskTemplates.subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("adminTaskTemplates.newTemplate")}
        </Button>
      </div>

      {/* Filtrlar */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">{t("common.practiceType")}</Label>
          <Select
            value={effectivePracticeTypeId}
            onValueChange={setPracticeTypeId}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.practiceType")} />
            </SelectTrigger>
            <SelectContent>
              {(practiceTypes.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t("common.course")}</Label>
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              <SelectItem value="3">{t("common.courseN", { n: 3 })}</SelectItem>
              <SelectItem value="4">{t("common.courseN", { n: 4 })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t("common.semester")}</Label>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.all")}</SelectItem>
              <SelectItem value="fall">{t("common.semesterFall")}</SelectItem>
              <SelectItem value="spring">{t("common.semesterSpring")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {templates && templates.length === 0 && (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={BookOpen}
            title={t("adminTaskTemplates.emptyTitle")}
            description={t("adminTaskTemplates.emptyDescription")}
          />
        </div>
      )}

      <TaskTemplateFormDialog
        open={createOpen}
        defaultPracticeTypeId={effectivePracticeTypeId as UUID | undefined}
        onClose={() => setCreateOpen(false)}
      />
      <TaskTemplateFormDialog
        open={!!editing}
        template={editing}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={!!deletingId}
        title={t("adminTaskTemplates.deleteTitle")}
        description={t("adminTaskTemplates.deleteDescription")}
        confirmText={t("adminTaskTemplates.deleteConfirm")}
        variant="destructive"
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
        isPending={deleteTemplate.isPending}
      />

      {templates && templates.length > 0 && (
        <div className="space-y-4">
          {groupKeys.map((key) => {
            const [course_, sem_, cat_] = key.split("|");
            const items = grouped.get(key)!;
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <span className="font-semibold">
                      {t("common.courseN", { n: course_ })}
                    </span>
                    <span className="text-muted-foreground">
                      · {t(SEMESTER_LABEL_KEY[sem_ as Semester])}
                    </span>
                    <TaskCategoryBadge category={cat_ as TaskCategory} />
                    <span className="ml-auto text-xs text-muted-foreground">
                      {t("adminTaskTemplates.totalPoints", { points: totalByGroup(key) })}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="flex items-start gap-3 rounded-md border border-border p-3"
                      >
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {tpl.display_order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium leading-snug">{tpl.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <TaskTypeLabel type={tpl.type} />
                            {tpl.quantity > 1 && (
                              <Badge variant="outline">
                                {t("adminTaskTemplates.quantityN", { n: tpl.quantity })}
                              </Badge>
                            )}
                            {tpl.month_hint && (
                              <span>{tpl.month_hint}</span>
                            )}
                          </div>
                          {tpl.description && (
                            <div className="mt-1.5 text-xs text-muted-foreground">
                              {tpl.description}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0 font-mono">
                          {t("adminTaskTemplates.pointsN", { n: tpl.points })}
                        </Badge>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditing(tpl)}
                            title={t("common.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingId(tpl.id)}
                            title={t("common.delete")}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
