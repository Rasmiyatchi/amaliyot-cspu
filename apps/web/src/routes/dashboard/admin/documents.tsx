import { HTTPError } from "ky";
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
import { toast } from "sonner";

import { DocumentFormDialog } from "@/components/admin/documents/document-form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDeleteDocument,
  useDocuments,
  type DocumentEntity,
  type DocumentKind,
} from "@/lib/api/documents";
import { downloadAttachment } from "@/lib/api/uploads";

function DocumentList({ kind }: { kind: DocumentKind }) {
  const { data, isPending, error } = useDocuments({ kind });
  const [editing, setEditing] = useState<DocumentEntity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const del = useDeleteDocument();

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await del.mutateAsync(deletingId as never);
      toast.success("Hujjat o'chirildi");
      setDeletingId(null);
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const handleDownload = async (doc: DocumentEntity) => {
    try {
      await downloadAttachment(doc.file_attachment);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklab olishda xato");
    }
  };

  if (isPending) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={kind === "regulation" ? ScrollText : BookOpen}
        title={kind === "regulation" ? "Normativ hujjatlar yo'q" : "Amaliyot dasturlari yo'q"}
        description="Yangi hujjat qo'shish uchun yuqoridagi tugmani bosing"
        accent="muted"
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((doc) => (
          <Card key={doc.id} className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start gap-3 text-base">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="leading-snug">{doc.title}</div>
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
                  Yuklab olish
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(doc)}
                  title="Tahrirlash"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeletingId(doc.id)}
                  title="O'chirish"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DocumentFormDialog
        open={!!editing}
        document={editing}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={!!deletingId}
        title="Hujjatni o'chirish"
        description="Bu amal qaytarilmaydi. Fayl ham o'chiriladimi?"
        confirmText="Ha, o'chirish"
        variant="destructive"
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
        isPending={del.isPending}
      />
    </>
  );
}

export function DocumentsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<DocumentKind>("regulation");
  const [tab, setTab] = useState<DocumentKind>("regulation");

  const handleNew = () => {
    setCreateKind(tab);
    setCreateOpen(true);
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Hujjatlar</h1>
            <p className="text-sm text-muted-foreground">
              Normativ hujjatlar va amaliyot dasturlari
            </p>
          </div>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4" />
          Yangi hujjat
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as DocumentKind)}>
        <TabsList>
          <TabsTrigger value="regulation">
            <ScrollText className="h-4 w-4" />
            Normativ hujjatlar
          </TabsTrigger>
          <TabsTrigger value="program">
            <BookOpen className="h-4 w-4" />
            Amaliyot dasturlari
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
