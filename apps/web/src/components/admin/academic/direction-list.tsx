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
import { useDirections, useFaculties } from "@/lib/api/academic";

export function DirectionList() {
  const faculties = useFaculties();
  const directions = useDirections();

  if (directions.isPending) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (directions.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{directions.error.message}</AlertDescription>
      </Alert>
    );
  }

  const facultyById = new Map((faculties.data?.items ?? []).map((f) => [f.id, f]));

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Kod</TableHead>
            <TableHead>Nomi</TableHead>
            <TableHead>Fakultet</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {directions.data!.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Yo'nalishlar topilmadi
              </TableCell>
            </TableRow>
          )}
          {directions.data!.items.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                <Badge variant="secondary" className="font-mono">
                  {d.code}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {facultyById.get(d.faculty_id)?.name ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
