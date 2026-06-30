import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
  spiritual: "Ma'naviy-marifiy",
  academic: "Akademik",
  report: "Hisobot",
};

const TYPE_LABEL: Record<TaskType, string> = {
  essay: "Insho",
  event_scenario: "Tadbir ssenariysi",
  event_participation: "Tadbir ishtiroki",
  analytical_note: "Analitik xulosa",
  plan: "Reja",
  protocol: "Protokol",
  presentation: "Prezentatsiya",
  open_lesson: "Ochiq dars",
  test_lesson: "Sinov darsi",
  lesson_analysis_batch: "Dars tahlili to'plami",
  interactive_pack: "Interaktiv to'plam",
  other: "Boshqa",
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
      toast.error("Sarlavha majburiy");
      return;
    }
    if (!form.practice_type_id) {
      toast.error("Amaliyot turini tanlang");
      return;
    }
    const points = Number(form.points);
    if (Number.isNaN(points) || points < 0) {
      toast.error("Ball noto'g'ri");
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
        toast.success("Topshiriq shabloni yangilandi");
      } else {
        await create.mutateAsync(payload);
        toast.success("Topshiriq shabloni yaratildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Shablonni tahrirlash" : "Yangi topshiriq shabloni"}
          </DialogTitle>
          <DialogDescription>
            Sillabusdan namunaviy topshiriq. Yaratilganda bu turdagi barcha
            biriktirishlarga tarqatish mumkin bo'ladi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Amaliyot turi *</Label>
            <Select
              value={form.practice_type_id}
              onValueChange={(v) => set("practice_type_id", v)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tanlang" />
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
            <Label>Kurs *</Label>
            <Select value={form.course} onValueChange={(v) => set("course", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((c) => (
                  <SelectItem key={c} value={String(c)}>
                    {c}-kurs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Semestr *</Label>
            <Select
              value={form.semester}
              onValueChange={(v) => set("semester", v as "fall" | "spring")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fall">Kuzgi</SelectItem>
                <SelectItem value="spring">Bahorgi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Kategoriya *</Label>
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
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tur *</Label>
            <Select
              value={form.type}
              onValueChange={(v) => set("type", v as TaskType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABEL) as TaskType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label>Sarlavha *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Topshiriq nomi"
              maxLength={500}
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Tavsif</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Qo'shimcha izoh (ixtiyoriy)"
              maxLength={10000}
            />
          </div>

          <div>
            <Label>Maksimal ball *</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.points}
              onChange={(e) => set("points", e.target.value)}
            />
          </div>

          <div>
            <Label>Soni</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </div>

          <div>
            <Label>Oy ko'rsatkichi</Label>
            <Input
              value={form.month_hint}
              onChange={(e) => set("month_hint", e.target.value)}
              placeholder="masalan: Sentyabr-Oktyabr"
              maxLength={50}
            />
          </div>

          <div>
            <Label>Tartib raqami</Label>
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
            <Label htmlFor="is_active">Faol (yangi biriktirishlarda paydo bo'ladi)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Saqlash" : "Yaratish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
