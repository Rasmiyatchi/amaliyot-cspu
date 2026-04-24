import { HTTPError } from "ky";
import { Check, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useAddTasks, useAvailableTemplates } from "@/lib/api/tasks";
import type { TaskTemplate, UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  assignmentId: UUID | null;
  onClose: () => void;
};

export function TasksAddDialog({ open, assignmentId, onClose }: Props) {
  const { data: templates, isPending } = useAvailableTemplates(
    open ? assignmentId : null,
  );
  const addTasks = useAddTasks();
  const [selected, setSelected] = useState<Set<UUID>>(new Set());

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

  const toggle = (id: UUID) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (!templates) return;
    if (selected.size === templates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(templates.map((t) => t.id)));
    }
  };

  const handleSave = async () => {
    if (!assignmentId || selected.size === 0) {
      toast.error("Kamida bitta topshiriq tanlang");
      return;
    }
    try {
      const res = await addTasks.mutateAsync({
        assignmentId,
        templateIds: Array.from(selected),
      });
      toast.success(`${res.created} ta topshiriq qo'shildi`);
      setSelected(new Set());
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleClose = () => {
    setSelected(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Topshiriq qo'shish
          </DialogTitle>
          <DialogDescription>
            Talabaga qo'shiladigan topshiriqlarni tanlang. Allaqachon qo'shilganlar bu ro'yxatda yo'q.
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
              Barcha mos topshiriqlar allaqachon qo'shilgan.
            </AlertDescription>
          </Alert>
        )}

        {templates && templates.length > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Tanlangan: <strong>{selected.size}</strong> / {templates.length}
              </span>
              <Button size="sm" variant="outline" onClick={toggleAll}>
                {selected.size === templates.length ? "Hech birini" : "Barchasini"}
              </Button>
            </div>

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
                          {sem === "fall" ? "Kuzgi" : "Bahorgi"}
                        </span>
                        <TaskCategoryBadge category={cat as "spiritual" | "academic" | "report"} />
                        <span className="ml-auto text-xs text-muted-foreground">
                          {items.reduce((a, t) => a + t.points, 0)} ball
                        </span>
                      </div>
                      <div>
                        {items.map((t) => {
                          const isChecked = selected.has(t.id);
                          return (
                            <button
                              key={t.id}
                              onClick={() => toggle(t.id)}
                              className={
                                "flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors last:border-0 " +
                                (isChecked ? "bg-primary/5" : "hover:bg-muted/30")
                              }
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
                                <div className="font-medium leading-snug">{t.title}</div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  <TaskTypeLabel type={t.type} />
                                  {t.quantity > 1 && (
                                    <Badge variant="outline">{t.quantity} ta</Badge>
                                  )}
                                  {t.month_hint && <span>{t.month_hint}</span>}
                                </div>
                              </div>
                              <Badge variant="secondary" className="shrink-0 font-mono">
                                {t.points} ball
                              </Badge>
                            </button>
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
            Bekor
          </Button>
          <Button
            onClick={handleSave}
            disabled={addTasks.isPending || selected.size === 0}
          >
            {addTasks.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="h-4 w-4" />
            Qo'shish ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
