import { Loader2 } from "lucide-react";

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
import { useAcademicYears, useDirections, useGroups } from "@/lib/api/academic";

export function GroupList() {
  const groups = useGroups();
  const directions = useDirections();
  const academicYears = useAcademicYears();

  if (groups.isPending) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (groups.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{groups.error.message}</AlertDescription>
      </Alert>
    );
  }

  const dirById = new Map((directions.data?.items ?? []).map((d) => [d.id, d]));
  const ayById = new Map((academicYears.data ?? []).map((ay) => [ay.id, ay]));

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guruh</TableHead>
            <TableHead>Kurs</TableHead>
            <TableHead>Yo'nalish</TableHead>
            <TableHead>Akademik yil</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.data!.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Guruhlar topilmadi
              </TableCell>
            </TableRow>
          )}
          {groups.data!.items.map((g) => {
            const d = dirById.get(g.direction_id);
            return (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{g.course}-kurs</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {d ? `${d.code} — ${d.name}` : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ayById.get(g.academic_year_id)?.name ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
