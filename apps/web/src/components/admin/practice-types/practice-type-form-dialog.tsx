import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePracticeType, useUpdatePracticeType } from "@/lib/api/practice-types";
import type { PracticeType } from "@/lib/api/types";

const schema = z
  .object({
    code: z
      .string()
      .regex(/^[a-z0-9_]+$/, "Faqat kichik harf, raqam va _")
      .min(2)
      .max(64),
    name: z.string().min(2).max(200),
    description: z.string().max(2000).optional(),
    object_kind: z.enum(["organization", "area", "any"]),
    requires_contract: z.boolean(),
    min_weeks: z.coerce.number().int().min(1).max(52),
    max_weeks: z.coerce.number().int().min(1).max(52),
    days_per_week: z.coerce.number().int().min(1).max(7).optional(),
    hours_per_day: z.coerce.number().int().min(1).max(12).optional(),
    allowed_courses: z.array(z.number()).min(1, "Kamida bitta kurs tanlang"),
    allowed_education_forms: z.array(z.string()),
    display_order: z.coerce.number().int().min(0).max(999),
    is_active: z.boolean(),
  })
  .refine((v) => v.max_weeks >= v.min_weeks, {
    message: "Maksimal hafta minimaldan kichik bo'lmasligi kerak",
    path: ["max_weeks"],
  });

type Values = z.infer<typeof schema>;

type Props = { open: boolean; existing: PracticeType | null; onClose: () => void };

const COURSES = [1, 2, 3, 4, 5];
const EDU_FORMS = [
  { value: "daytime", label: "Kunduzgi" },
  { value: "evening", label: "Kechki" },
  { value: "correspondence", label: "Sirtqi" },
  { value: "distance", label: "Masofaviy" },
];

export function PracticeTypeFormDialog({ open, existing, onClose }: Props) {
  const create = useCreatePracticeType();
  const update = useUpdatePracticeType();
  const isEdit = !!existing;

  const form = useForm<Values>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      code: "",
      name: "",
      description: "",
      object_kind: "organization",
      requires_contract: true,
      min_weeks: 1,
      max_weeks: 1,
      days_per_week: undefined,
      hours_per_day: undefined,
      allowed_courses: [],
      allowed_education_forms: [],
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && existing) {
      form.reset({
        code: existing.code,
        name: existing.name,
        description: existing.description ?? "",
        object_kind: existing.object_kind,
        requires_contract: existing.requires_contract,
        min_weeks: existing.min_weeks,
        max_weeks: existing.max_weeks,
        days_per_week: existing.days_per_week ?? undefined,
        hours_per_day: existing.hours_per_day ?? undefined,
        allowed_courses: existing.allowed_courses,
        allowed_education_forms: existing.allowed_education_forms ?? [],
        display_order: existing.display_order,
        is_active: existing.is_active,
      });
    } else if (open) {
      form.reset();
    }
  }, [open, existing, form]);

  const onSubmit = async (v: Values) => {
    const payload = {
      ...v,
      description: v.description || null,
      days_per_week: v.days_per_week ?? null,
      hours_per_day: v.hours_per_day ?? null,
    };
    try {
      if (isEdit && existing) {
        // code o'zgartirilmaydi (unique identifikator)
        const { code: _code, ...rest } = payload;
        void _code;
        await update.mutateAsync({ id: existing.id, data: rest });
        toast.success("Amaliyot turi yangilandi");
      } else {
        await create.mutateAsync(payload);
        toast.success("Amaliyot turi yaratildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Amaliyot turini tahrirlash" : "Yangi amaliyot turi"}
          </DialogTitle>
          <DialogDescription>
            Amaliyot turi konfiguratsiyasi (muddat, obyekt, kurslar)
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kod *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="malakaviy_umumiy"
                        className="font-mono"
                        disabled={isEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tartib raqami</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomi *</FormLabel>
                  <FormControl>
                    <Input placeholder="Malakaviy amaliyot (umumiy)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tavsif</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Qisqacha izoh..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="object_kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Obyekt turi *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="organization">Tashkilot</SelectItem>
                      <SelectItem value="area">Hudud</SelectItem>
                      <SelectItem value="any">Ikkalasi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="min_weeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min hafta *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={52} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_weeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max hafta *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={52} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="days_per_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kun/hafta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={7}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hours_per_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Soat/kun</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="allowed_courses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruxsat etilgan kurslar *</FormLabel>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {COURSES.map((c) => (
                      <label key={c} className="flex cursor-pointer items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={field.value.includes(c)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.checked
                                ? [...field.value, c].sort((a, b) => a - b)
                                : field.value.filter((x) => x !== c),
                            )
                          }
                        />
                        {c}-kurs
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowed_education_forms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ta'lim shakllari (bo'sh = barchasi)</FormLabel>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {EDU_FORMS.map((f) => (
                      <label
                        key={f.value}
                        className="flex cursor-pointer items-center gap-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={field.value.includes(f.value)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.checked
                                ? [...field.value, f.value]
                                : field.value.filter((x) => x !== f.value),
                            )
                          }
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requires_contract"
              render={({ field }) => (
                <FormItem>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Shartnoma majburiy</span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Aktiv</span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Saqlash" : "Yaratish"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
