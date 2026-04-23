import { BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";

import { PracticeTypeDetailDialog } from "@/components/admin/practice-types/practice-type-detail-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePracticeTypes } from "@/lib/api/practice-types";
import type { PracticeType } from "@/lib/api/types";

const OBJECT_KIND_LABEL = {
  organization: "Tashkilot",
  area: "Hudud",
  any: "Ikkalasi",
};

export function PracticeTypesPage() {
  const { data, isPending, error } = usePracticeTypes();
  const [selected, setSelected] = useState<PracticeType | null>(null);

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Amaliyot turlari</h1>
          <p className="text-sm text-muted-foreground">
            8 ta standart tur: 4+2, dala, pedagogik, malakaviy va boshqalar
          </p>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((pt) => (
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
                  </TableCell>
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
    </div>
  );
}
