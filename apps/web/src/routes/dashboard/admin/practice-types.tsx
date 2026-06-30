import { BookOpen, Loader2, Pencil, Plus, Sliders, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GradingRulesDialog } from "@/components/admin/practice-types/grading-rules-dialog";
import { PracticeTypeDetailDialog } from "@/components/admin/practice-types/practice-type-detail-dialog";
import { PracticeTypeFormDialog } from "@/components/admin/practice-types/practice-type-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useDeletePracticeType, usePracticeTypes } from "@/lib/api/practice-types";
import { useAuthStore } from "@/stores/auth";
import type { PracticeType } from "@/lib/api/types";

const OBJECT_KIND_LABEL = {
  organization: "Tashkilot",
  area: "Hudud",
  any: "Ikkalasi",
};

const ALL = "__all__";
const COURSES = [1, 2, 3, 4, 5];
const EDU_FORMS = [
  { value: "daytime", label: "Kunduzgi" },
  { value: "evening", label: "Kechki" },
  { value: "correspondence", label: "Sirtqi" },
  { value: "distance", label: "Masofaviy" },
];
const EDU_FORM_LABEL: Record<string, string> = Object.fromEntries(
  EDU_FORMS.map((f) => [f.value, f.label]),
);

export function PracticeTypesPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const { data, isPending, error } = usePracticeTypes();
  const [selected, setSelected] = useState<PracticeType | null>(null);
  const [editingGrading, setEditingGrading] = useState<PracticeType | null>(null);
  const [editing, setEditing] = useState<PracticeType | null>(null);
  const [creating, setCreating] = useState(false);
  const [formFilter, setFormFilter] = useState<string>(ALL);
  const [courseFilter, setCourseFilter] = useState<string>(ALL);
  const del = useDeletePracticeType();

  const filtered = (data ?? []).filter((pt) => {
    if (
      formFilter !== ALL &&
      pt.allowed_education_forms.length > 0 &&
      !pt.allowed_education_forms.includes(formFilter)
    ) {
      return false;
    }
    if (courseFilter !== ALL && !pt.allowed_courses.includes(Number(courseFilter))) {
      return false;
    }
    return true;
  });

  const handleDelete = async (pt: PracticeType) => {
    if (!confirm(`"${pt.name}" amaliyot turini o'chirishni tasdiqlang?`)) return;
    try {
      await del.mutateAsync(pt.id);
      toast.success("O'chirildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Amaliyot turlari</h1>
            <p className="text-sm text-muted-foreground">
              Standart turlar: 4+2, dala, pedagogik, malakaviy va boshqalar
            </p>
          </div>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Yangi amaliyot turi
          </Button>
        )}
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

      {data && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select value={formFilter} onValueChange={setFormFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ta'lim shakli" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Barcha ta'lim shakli</SelectItem>
              {EDU_FORMS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Kurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Barcha kurslar</SelectItem>
              {COURSES.map((c) => (
                <SelectItem key={c} value={String(c)}>
                  {c}-kurs
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(formFilter !== ALL || courseFilter !== ALL) && (
            <Button
              variant="ghost"
              onClick={() => {
                setFormFilter(ALL);
                setCourseFilter(ALL);
              }}
            >
              Tozalash
            </Button>
          )}
        </div>
      )}

      {data && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">№</TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead className="w-[120px]">Shartnoma</TableHead>
                <TableHead className="w-[110px]">Obyekt</TableHead>
                <TableHead className="w-[120px]">Haftalar</TableHead>
                <TableHead>Kurslar</TableHead>
                {isSuperAdmin && <TableHead className="w-[140px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pt) => (
                <TableRow
                  key={pt.id}
                  onClick={() => setSelected(pt)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {pt.display_order}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{pt.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{pt.code}</div>
                  </TableCell>
                  <TableCell>
                    {pt.requires_contract ? (
                      <Badge variant="default">Majburiy</Badge>
                    ) : (
                      <Badge variant="secondary">Yo'q</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {OBJECT_KIND_LABEL[pt.object_kind]}
                  </TableCell>
                  <TableCell className="text-sm">
                    {pt.min_weeks === pt.max_weeks
                      ? `${pt.min_weeks} hafta`
                      : `${pt.min_weeks}–${pt.max_weeks} hafta`}
                    {pt.days_per_week && (
                      <div className="text-xs text-muted-foreground">
                        {pt.days_per_week} kun/hafta
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {pt.allowed_courses.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                    </div>
                    {pt.allowed_education_forms.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {pt.allowed_education_forms.map((f) => (
                          <Badge key={f} variant="secondary" className="text-xs">
                            {EDU_FORM_LABEL[f] ?? f}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Tahrirlash"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(pt);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Baho shkalasi"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGrading(pt);
                          }}
                        >
                          <Sliders className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="O'chirish"
                          disabled={del.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(pt);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PracticeTypeDetailDialog
        practiceType={selected}
        onClose={() => setSelected(null)}
      />
      <GradingRulesDialog
        open={!!editingGrading}
        practiceType={editingGrading}
        onClose={() => setEditingGrading(null)}
      />
      <PracticeTypeFormDialog
        open={creating || !!editing}
        existing={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
