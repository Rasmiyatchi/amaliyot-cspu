import {
  BookOpen,
  Download,
  FileText,
  Loader2,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useDocuments,
  type DocumentEntity,
  type DocumentKind,
} from "@/lib/api/documents";
import { downloadAttachment } from "@/lib/api/uploads";

function DocumentList({ kind }: { kind: DocumentKind }) {
  const { data, isPending, error } = useDocuments({ kind });

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
        title={
          kind === "regulation"
            ? "Normativ hujjatlar yo'q"
            : "Amaliyot dasturlari yo'q"
        }
        description="Adminlar yuklagandan so'ng bu yerda ko'rinadi"
        accent="muted"
      />
    );
  }

  return (
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload(doc)}
              className="w-full"
            >
              <Download className="h-4 w-4" />
              Yuklab olish
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SupervisorRegulationsPage() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ScrollText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Normativ hujjatlar</h1>
          <p className="text-sm text-muted-foreground">
            Amaliyot bo'yicha rasmiy hujjatlar
          </p>
        </div>
      </div>
      <DocumentList kind="regulation" />
    </div>
  );
}

export function SupervisorProgramsPage() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Amaliyot dasturlari</h1>
          <p className="text-sm text-muted-foreground">
            Har amaliyot turi uchun batafsil dastur
          </p>
        </div>
      </div>
      <DocumentList kind="program" />
    </div>
  );
}
