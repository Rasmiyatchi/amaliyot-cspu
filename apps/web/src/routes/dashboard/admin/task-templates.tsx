import { BookOpen, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  TaskCategoryBadge,
  TaskTypeLabel,
} from "@/components/admin/tasks/task-type-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useTaskTemplates } from "@/lib/api/tasks";
import type { Semester, TaskCategory, TaskTemplate } from "@/lib/api/types";

const ALL = "__all__";

const SEMESTER_LABEL: Record<Semester, string> = {
  fall: "Kuzgi",
  spring: "Bahorgi",
};

export function TaskTemplatesPage() {
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
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Topshiriqlar katalogi</h1>
          <p className="text-sm text-muted-foreground">
            Sillabus asosida amaliyot turlari uchun topshiriqlar
          </p>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Amaliyot turi</Label>
          <Select
            value={effectivePracticeTypeId}
            onValueChange={setPracticeTypeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Amaliyot turi" />
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
          <Label className="text-xs">Kurs</Label>
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Barchasi</SelectItem>
              <SelectItem value="3">3-kurs</SelectItem>
              <SelectItem value="4">4-kurs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Semestr</Label>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Barchasi</SelectItem>
              <SelectItem value="fall">Kuzgi</SelectItem>
              <SelectItem value="spring">Bahorgi</SelectItem>
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
            title="Topshiriqlar yo'q"
            description="Bu amaliyot turi uchun hali topshiriq belgilanmagan"
          />
        </div>
      )}

      {templates && templates.length > 0 && (
        <div className="space-y-4">
          {groupKeys.map((key) => {
            const [course_, sem_, cat_] = key.split("|");
            const items = grouped.get(key)!;
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <span className="font-semibold">{course_}-kurs</span>
                    <span className="text-muted-foreground">
                      · {SEMESTER_LABEL[sem_ as Semester]}
                    </span>
                    <TaskCategoryBadge category={cat_ as TaskCategory} />
                    <span className="ml-auto text-xs text-muted-foreground">
                      Jami: {totalByGroup(key)} ball
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-start gap-3 rounded-md border border-border p-3"
                      >
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {t.display_order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium leading-snug">{t.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <TaskTypeLabel type={t.type} />
                            {t.quantity > 1 && (
                              <Badge variant="outline">
                                {t.quantity} ta
                              </Badge>
                            )}
                            {t.month_hint && (
                              <span>{t.month_hint}</span>
                            )}
                          </div>
                          {t.description && (
                            <div className="mt-1.5 text-xs text-muted-foreground">
                              {t.description}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0 font-mono">
                          {t.points} ball
                        </Badge>
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
