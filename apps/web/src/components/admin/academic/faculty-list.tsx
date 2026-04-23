import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFaculties } from "@/lib/api/academic";

export function FacultyList() {
  const { data, isPending, error } = useFaculties();

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

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kod</TableHead>
            <TableHead>Nomi</TableHead>
            <TableHead className="w-[200px]">Yaratilgan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data!.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Fakultetlar topilmadi
              </TableCell>
            </TableRow>
          )}
          {data!.items.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-mono text-xs">{f.code ?? "—"}</TableCell>
              <TableCell className="font-medium">{f.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(f.created_at).toLocaleDateString("uz-UZ")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
