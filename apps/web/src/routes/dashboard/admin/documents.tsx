import {
  BookOpen,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DocumentFormDialog } from "@/components/admin/documents/document-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePracticeTypes } from "@/lib/api/practice-types";
import { useDirections } from "@/lib/api/academic";
import {
  useDeleteDocument,
  useDocuments,
  type DocumentEntity,
  type DocumentKind,
} from "@/lib/api/documents";
import type { UUID } from "@/lib/api/types";
import { downloadAttachment } from "@/lib/api/uploads";

const ALL = "all";
const COURSES = [1, 2, 3, 4, 5];

const EDU_FORMS = [
  { value: "daytime", labelKey: "studentsStudentFormDialog.eduForm.daytime" },
  { value: "evening", labelKey: "studentsStudentFormDialog.eduForm.evening" },
  { value: "correspondence", labelKey: "studentsStudentFormDialog.eduForm.correspondence" },
  { value: "distance", labelKey: "studentsStudentFormDialog.eduForm.distance" },
];

function DocumentList({ kind }: { kind: DocumentKind }) {
  const { t } = useTranslation();
  const [course, setCourse] = useState<string>(ALL);
  const [educationForm, setEducationForm] = useState<string>(ALL);
  const [directionId, setDirectionId] = useState<string>(ALL);
  const [practiceTypeId, setPracticeTypeId] = useState<string>(ALL);

  const { data, isPending, error } = useDocuments({
    kind,
    course: course !== ALL ? Number(course) : undefined,
    educationForm: educationForm !== ALL ? educationForm : undefined,
    directionId: directionId !== ALL ? (directionId as UUID) : undefined,
    practiceTypeId: practiceTypeId !== ALL ? (practiceTypeId as UUID) : undefined,
  });
  const [editing, setEditing] = useState<DocumentEntity | null>(null);
  const [deletingId, setDeletingId] = useState<UUID | null>(null);
  const del = useDeleteDocument();
  const practiceTypes = usePracticeTypes();
  const directionsQ = useDirections(undefined, 1, 200);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await del.mutateAsync(deletingId);
      toast.success(t("adminDocuments.deletedToast"));
      setDeletingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const handleDownload = async (doc: DocumentEntity) => {
    try {
      await downloadAttachment(doc.file_attachment);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("adminDocuments.downloadError"));
    }
  };

  const hasFilters =
    course !== ALL || educationForm !== ALL || directionId !== ALL || practiceTypeId !== ALL;

  return (
    <div className="space-y-4">
      {/* Filtrlar har doim ko'rinadi — natija bo'sh bo'lsa ham tozalash mumkin bo'lsin */}
      {kind === "program" && (
        <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Label htmlFor="docs-filter-type" className="text-xs text-muted-foreground">
              {t("common.practiceType")}
            </Label>
            <Select value={practiceTypeId} onValueChange={setPracticeTypeId}>
              <SelectTrigger id="docs-filter-type" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("common.all")}</SelectItem>
                {(practiceTypes.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="docs-filter-course" className="text-xs text-muted-foreground">
              {t("common.course")}
            </Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger id="docs-filter-course" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("common.all")}</SelectItem>
                {COURSES.map((c) => (
                  <SelectItem key={c} value={String(c)}>
                    {t("common.courseN", { n: c })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="docs-filter-form" className="text-xs text-muted-foreground">
              {t("studentsStudentFormDialog.educationFormLabel")}
            </Label>
            <Select value={educationForm} onValueChange={setEducationForm}>
              <SelectTrigger id="docs-filter-form" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("common.all")}</SelectItem>
                {EDU_FORMS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {t(f.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="docs-filter-direction" className="text-xs text-muted-foreground">
              {t("common.direction")}
            </Label>
            <Select value={directionId} onValueChange={setDirectionId}>
              <SelectTrigger id="docs-filter-direction" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("common.all")}</SelectItem>
                {(directionsQ.data?.items ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <div className="sm:col-span-2 md:col-span-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCourse(ALL);
                  setEducationForm(ALL);
                  setDirectionId(ALL);
                  setPracticeTypeId(ALL);
                }}
              >
                {t("common.clear")}
              </Button>
            </div>
          )}
        </div>
      )}

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

      {data && data.length === 0 && (
        <EmptyState
          icon={kind === "regulation" ? ScrollText : BookOpen}
          title={
            kind === "regulation"
              ? t("adminDocuments.emptyRegulations")
              : t("adminDocuments.emptyPrograms")
          }
          description={t("adminDocuments.emptyDesc")}
          accent="muted"
        />
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((doc) => (
            <Card key={doc.id} className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start gap-3 text-base">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="break-words leading-snug">{doc.title}</div>
                    {doc.practice_type_name && (
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                        {doc.practice_type_name}
                      </div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc.description && (
                  <div className="text-sm text-muted-foreground">{doc.description}</div>
                )}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{doc.file_attachment.name}</span>
                  <span className="shrink-0">
                    {(doc.file_attachment.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(doc)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4" />
                    {t("common.download")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(doc)}
                    title={t("common.edit")}
                    aria-label={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingId(doc.id)}
                    title={t("common.delete")}
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DocumentFormDialog open={!!editing} document={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deletingId}
        title={t("adminDocuments.deleteTitle")}
        description={t("adminDocuments.deleteDesc")}
        confirmText={t("adminDocuments.deleteConfirmBtn")}
        variant="destructive"
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
        isPending={del.isPending}
      />
    </div>
  );
}

export function DocumentsPage() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<DocumentKind>("regulation");
  const [tab, setTab] = useState<DocumentKind>("regulation");

  const handleNew = () => {
    setCreateKind(tab);
    setCreateOpen(true);
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("adminDocuments.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("adminDocuments.subtitle")}</p>
          </div>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4" />
          {t("adminDocuments.newDocument")}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as DocumentKind)}>
        <TabsList>
          <TabsTrigger value="regulation">
            <ScrollText className="h-4 w-4" />
            {t("adminDocuments.tabRegulations")}
          </TabsTrigger>
          <TabsTrigger value="program">
            <BookOpen className="h-4 w-4" />
            {t("adminDocuments.tabPrograms")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="regulation">
          <DocumentList kind="regulation" />
        </TabsContent>
        <TabsContent value="program">
          <DocumentList kind="program" />
        </TabsContent>
      </Tabs>

      <DocumentFormDialog
        open={createOpen}
        defaultKind={createKind}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
