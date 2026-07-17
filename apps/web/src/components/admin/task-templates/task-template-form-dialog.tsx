import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePracticeTypes } from "@/lib/api/practice-types";
import {
  useCreateTaskTemplate,
  useUpdateTaskTemplate,
  type TaskTemplateCreatePayload,
} from "@/lib/api/tasks";
import type { TaskTemplate, TaskCategory, TaskType, UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  template?: TaskTemplate | null;
  defaultPracticeTypeId?: UUID;
  onClose: () => void;
};

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  spiritual: "taskTemplatesTaskTemplateFormDialog.category.spiritual",
  academic: "taskTemplatesTaskTemplateFormDialog.category.academic",
  report: "taskTemplatesTaskTemplateFormDialog.category.report",
};

const TYPE_LABEL: Record<TaskType, string> = {
  essay: "taskTemplatesTaskTemplateFormDialog.type.essay",
  event_scenario: "taskTemplatesTaskTemplateFormDialog.type.eventScenario",
  event_participation: "taskTemplatesTaskTemplateFormDialog.type.eventParticipation",
  analytical_note: "taskTemplatesTaskTemplateFormDialog.type.analyticalNote",
  plan: "taskTemplatesTaskTemplateFormDialog.type.plan",
  protocol: "taskTemplatesTaskTemplateFormDialog.type.protocol",
  presentation: "taskTemplatesTaskTemplateFormDialog.type.presentation",
  open_lesson: "taskTemplatesTaskTemplateFormDialog.type.openLesson",
  test_lesson: "taskTemplatesTaskTemplateFormDialog.type.testLesson",
  lesson_analysis_batch: "taskTemplatesTaskTemplateFormDialog.type.lessonAnalysisBatch",
  interactive_pack: "taskTemplatesTaskTemplateFormDialog.type.interactivePack",
  other: "taskTemplatesTaskTemplateFormDialog.type.other",
};

type FormState = {
  practice_type_id: string;
  course: string;
  semester: "fall" | "spring";
  category: TaskCategory;
  type: TaskType;
  title: string;
  description: string;
  points: string;
  quantity: string;
  month_hint: string;
  display_order: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  practice_type_id: "",
  course: "3",
  semester: "fall",
  category: "academic",
  type: "essay",
  title: "",
  description: "",
  points: "5",
  quantity: "1",
  month_hint: "",
  display_order: "0",
  is_active: true,
};

export function TaskTemplateFormDialog({
  open,
  template,
  defaultPracticeTypeId,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const isEdit = !!template;
  const [form, setForm] = useState<FormState>(EMPTY);
  const create = useCreateTaskTemplate();
  const update = useUpdateTaskTemplate();
  const practiceTypes = usePracticeTypes();

  useEffect(() => {
    if (!open) return;
    if (template) {
      setForm({
        practice_type_id: template.practice_type_id,
        course: String(template.course),
        semester: template.semester,
        category: template.category,
        type: template.type,
        title: template.title,
        description: template.description ?? "",
        points: String(template.points),
        quantity: String(template.quantity),
        month_hint: template.month_hint ?? "",
        display_order: String(template.display_order),
        is_active: template.is_active,
      });
    } else {
      setForm({ ...EMPTY, practice_type_id: defaultPracticeTypeId ?? "" });
    }
  }, [open, template, defaultPracticeTypeId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error(t("taskTemplatesTaskTemplateFormDialog.errors.titleRequired"));
      return;
    }
    if (!form.practice_type_id) {
      toast.error(t("taskTemplatesTaskTemplateFormDialog.errors.practiceTypeRequired"));
      return;
    }
    const points = Number(form.points);
    if (Number.isNaN(points) || points < 0) {
      toast.error(t("taskTemplatesTaskTemplateFormDialog.errors.invalidPoints"));
      return;
    }

    const payload: TaskTemplateCreatePayload = {
      practice_type_id: form.practice_type_id as UUID,
      course: Number(form.course),
      semester: form.semester,
      category: form.category,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      points,
      quantity: Number(form.quantity) || 1,
      month_hint: form.month_hint.trim() || null,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
    };

    try {
      if (isEdit && template) {
        const { practice_type_id: _ignore, ...rest } = payload;
        void _ignore;
        await update.mutateAsync({ id: template.id, data: rest });
        toast.success(t("taskTemplatesTaskTemplateFormDialog.toasts.updated"));
      } else {
        await create.mutateAsync(payload);
        toast.success(t("taskTemplatesTaskTemplateFormDialog.toasts.created"));
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : t("common.error"));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("taskTemplatesTaskTemplateFormDialog.editTitle")
              : t("taskTemplatesTaskTemplateFormDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("taskTemplatesTaskTemplateFormDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("common.practiceType")} *</Label>
            <Select
              value={form.practice_type_id}
              onValueChange={(v) => set("practice_type_id", v)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("taskTemplatesTaskTemplateFormDialog.selectPlaceholder")}
                />
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
            <Label>{t("common.course")} *</Label>
            <Select value={form.course} onValueChange={(v) => set("course", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((c) => (
                  <SelectItem key={c} value={String(c)}>
                    {t("common.courseN", { n: c })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("common.semester")} *</Label>
            <Select
              value={form.semester}
              onValueChange={(v) => set("semester", v as "fall" | "spring")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fall">{t("common.semesterFall")}</SelectItem>
                <SelectItem value="spring">{t("common.semesterSpring")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("taskTemplatesTaskTemplateFormDialog.categoryLabel")} *</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set("category", v as TaskCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABEL) as TaskCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(CATEGORY_LABEL[c])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("taskTemplatesTaskTemplateFormDialog.typeLabel")} *</Label>
            <Select
              value={form.type}
              onValueChange={(v) => set("type", v as TaskType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABEL) as TaskType[]).map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {t(TYPE_LABEL[ty])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label>{t("taskTemplatesTaskTemplateFormDialog.titleLabel")} *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={t("taskTemplatesTaskTemplateFormDialog.titlePlaceholder")}
              maxLength={500}
            />
          </div>

          <div className="sm:col-span-2">
            <Label>{t("taskTemplatesTaskTemplateFormDialog.descriptionLabel")}</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("taskTemplatesTaskTemplateFormDialog.descriptionPlaceholder")}
              maxLength={10000}
            />
          </div>

          <div>
            <Label>{t("taskTemplatesTaskTemplateFormDialog.pointsLabel")} *</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.points}
              onChange={(e) => set("points", e.target.value)}
            />
          </div>

          <div>
            <Label>{t("taskTemplatesTaskTemplateFormDialog.quantityLabel")}</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </div>

          <div>
            <Label>{t("taskTemplatesTaskTemplateFormDialog.monthHintLabel")}</Label>
            <Input
              value={form.month_hint}
              onChange={(e) => set("month_hint", e.target.value)}
              placeholder={t("taskTemplatesTaskTemplateFormDialog.monthHintPlaceholder")}
              maxLength={50}
            />
          </div>

          <div>
            <Label>{t("taskTemplatesTaskTemplateFormDialog.displayOrderLabel")}</Label>
            <Input
              type="number"
              min={0}
              value={form.display_order}
              onChange={(e) => set("display_order", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
            />
            <Label htmlFor="is_active">
              {t("taskTemplatesTaskTemplateFormDialog.isActiveLabel")}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit
              ? t("common.save")
              : t("taskTemplatesTaskTemplateFormDialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
