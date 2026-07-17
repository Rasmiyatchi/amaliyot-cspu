import { HTTPError } from "ky";
import { Calendar, Check, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  TaskCategoryBadge,
  TaskTypeLabel,
} from "@/components/admin/tasks/task-type-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useAddTasks,
  useAvailableTemplates,
  type TaskAssignItem,
} from "@/lib/api/tasks";
import type { TaskTemplate, UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  assignmentId: UUID | null;
  onClose: () => void;
};

type TaskConfig = {
  selected: boolean;
  due_date: string; // YYYY-MM-DD
  notes: string;
};

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TasksAddDialog({ open, assignmentId, onClose }: Props) {
  const { t } = useTranslation();
  const { data: templates, isPending } = useAvailableTemplates(
    open ? assignmentId : null,
  );
  const addTasks = useAddTasks();
  const [configs, setConfigs] = useState<Record<UUID, TaskConfig>>({});
  const [bulkDueDate, setBulkDueDate] = useState<string>("");

  const grouped = useMemo(() => {
    if (!templates) return new Map<string, TaskTemplate[]>();
    const m = new Map<string, TaskTemplate[]>();
    for (const t of templates) {
      const key = `${t.semester}|${t.category}`;
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [templates]);

  const selectedCount = Object.values(configs).filter((c) => c.selected).length;

  const toggle = (id: UUID) => {
    setConfigs((prev) => {
      const cur = prev[id] ?? { selected: false, due_date: "", notes: "" };
      return {
        ...prev,
        [id]: {
          ...cur,
          selected: !cur.selected,
          due_date: cur.selected ? cur.due_date : cur.due_date || todayPlusDays(14),
        },
      };
    });
  };

  const updateConfig = (id: UUID, patch: Partial<TaskConfig>) => {
    setConfigs((prev) => {
      const cur: TaskConfig = prev[id] ?? { selected: true, due_date: "", notes: "" };
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  };

  const toggleAll = () => {
    if (!templates) return;
    if (selectedCount === templates.length) {
      setConfigs({});
    } else {
      const next: Record<UUID, TaskConfig> = {};
      for (const t of templates) {
        const cur = configs[t.id];
        next[t.id] = {
          selected: true,
          due_date: cur?.due_date || todayPlusDays(14),
          notes: cur?.notes ?? "",
        };
      }
      setConfigs(next);
    }
  };

  const applyBulkDueDate = () => {
    if (!bulkDueDate) {
      toast.error(t("assignmentsTasksAddDialog.selectBulkDeadlineFirst"));
      return;
    }
    setConfigs((prev) => {
      const next: Record<UUID, TaskConfig> = {};
      for (const [id, cfg] of Object.entries(prev)) {
        next[id as UUID] = cfg.selected
          ? { ...cfg, due_date: bulkDueDate }
          : cfg;
      }
      return next;
    });
    toast.success(t("assignmentsTasksAddDialog.bulkApplied"));
  };

  const handleSave = async () => {
    if (!assignmentId) return;

    const items: TaskAssignItem[] = [];
    const today = todayDate();
    for (const [id, cfg] of Object.entries(configs)) {
      if (!cfg.selected) continue;
      if (!cfg.due_date) {
        toast.error(t("assignmentsTasksAddDialog.deadlineRequired"));
        return;
      }
      if (cfg.due_date < today) {
        toast.error(t("assignmentsTasksAddDialog.deadlinePast"));
        return;
      }
      items.push({
        template_id: id as UUID,
        due_date: cfg.due_date,
        notes: cfg.notes.trim() || null,
      });
    }

    if (items.length === 0) {
      toast.error(t("assignmentsTasksAddDialog.selectAtLeastOne"));
      return;
    }

    try {
      const res = await addTasks.mutateAsync({ assignmentId, items });
      toast.success(t("assignmentsTasksAddDialog.tasksAdded", { count: res.created }));
      setConfigs({});
      setBulkDueDate("");
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const handleClose = () => {
    setConfigs({});
    setBulkDueDate("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("assignmentsTasksAddDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("assignmentsTasksAddDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {templates && templates.length === 0 && (
          <Alert>
            <AlertDescription>
              {t("assignmentsTasksAddDialog.allAlreadyAdded")}
            </AlertDescription>
          </Alert>
        )}

        {templates && templates.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {t("assignmentsTasksAddDialog.selectedLabel")}{" "}
                <strong>{selectedCount}</strong> / {templates.length}
              </span>
              <Button size="sm" variant="outline" onClick={toggleAll}>
                {selectedCount === templates.length
                  ? t("assignmentsTasksAddDialog.selectNone")
                  : t("assignmentsTasksAddDialog.selectAll")}
              </Button>
            </div>

            {selectedCount > 0 && (
              <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs">
                    {t("assignmentsTasksAddDialog.bulkDeadlineLabel")}
                  </Label>
                  <Input
                    type="date"
                    value={bulkDueDate}
                    onChange={(e) => setBulkDueDate(e.target.value)}
                    min={todayDate()}
                  />
                </div>
                <Button size="sm" variant="outline" onClick={applyBulkDueDate}>
                  <Calendar className="h-4 w-4" />
                  {t("assignmentsTasksAddDialog.apply")}
                </Button>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              {Array.from(grouped.keys())
                .sort()
                .map((key) => {
                  const [sem, cat] = key.split("|");
                  const items = grouped.get(key)!;
                  return (
                    <div key={key} className="rounded-md border border-border">
                      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
                        <span className="font-medium">
                          {sem === "fall"
                            ? t("common.semesterFall")
                            : t("common.semesterSpring")}
                        </span>
                        <TaskCategoryBadge
                          category={cat as "spiritual" | "academic" | "report"}
                        />
                        <span className="ml-auto text-xs text-muted-foreground">
                          {t("assignmentsTasksAddDialog.points", {
                            points: items.reduce((a, x) => a + x.points, 0),
                          })}
                        </span>
                      </div>
                      <div>
                        {items.map((tpl) => {
                          const cfg = configs[tpl.id];
                          const isChecked = cfg?.selected ?? false;
                          return (
                            <div
                              key={tpl.id}
                              className={
                                "border-b border-border last:border-0 " +
                                (isChecked ? "bg-primary/5" : "")
                              }
                            >
                              <button
                                onClick={() => toggle(tpl.id)}
                                className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/30"
                              >
                                <div
                                  className={
                                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border " +
                                    (isChecked
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-input")
                                  }
                                >
                                  {isChecked && <Check className="h-3.5 w-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium leading-snug">
                                    {tpl.title}
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <TaskTypeLabel type={tpl.type} />
                                    {tpl.quantity > 1 && (
                                      <Badge variant="outline">
                                        {t("assignmentsTasksAddDialog.quantity", {
                                          count: tpl.quantity,
                                        })}
                                      </Badge>
                                    )}
                                    {tpl.month_hint && <span>{tpl.month_hint}</span>}
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="shrink-0 font-mono"
                                >
                                  {t("assignmentsTasksAddDialog.points", {
                                    points: tpl.points,
                                  })}
                                </Badge>
                              </button>

                              {isChecked && cfg && (
                                <div className="grid gap-2 border-t border-border bg-muted/20 px-3 py-3 sm:grid-cols-2">
                                  <div>
                                    <Label className="text-xs">
                                      {t("assignmentsTasksAddDialog.deadline")}{" "}
                                      <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                      type="date"
                                      value={cfg.due_date}
                                      min={todayDate()}
                                      onChange={(e) =>
                                        updateConfig(tpl.id, { due_date: e.target.value })
                                      }
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">
                                      {t("assignmentsTasksAddDialog.notesOptional")}
                                    </Label>
                                    <Input
                                      placeholder={t("assignmentsTasksAddDialog.notesPlaceholder")}
                                      value={cfg.notes}
                                      onChange={(e) =>
                                        updateConfig(tpl.id, { notes: e.target.value })
                                      }
                                      maxLength={2000}
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={addTasks.isPending || selectedCount === 0}
          >
            {addTasks.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="h-4 w-4" />
            {t("common.add")} ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
