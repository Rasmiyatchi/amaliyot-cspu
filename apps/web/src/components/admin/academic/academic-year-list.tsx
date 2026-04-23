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
import { useAcademicYears } from "@/lib/api/academic";

export function AcademicYearList() {
  const { data, isPending, error } = useAcademicYears();

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
            <TableHead>Nomi</TableHead>
            <TableHead>Boshlanishi</TableHead>
            <TableHead>Tugashi</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data!.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Akademik yillar topilmadi
              </TableCell>
            </TableRow>
          )}
          {data!.map((ay) => (
            <TableRow key={ay.id}>
              <TableCell className="font-medium">{ay.name}</TableCell>
              <TableCell className="text-sm">
                {new Date(ay.start_date).toLocaleDateString("uz-UZ")}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(ay.end_date).toLocaleDateString("uz-UZ")}
              </TableCell>
              <TableCell>
                {ay.is_active ? (
                  <Badge variant="success">Aktiv</Badge>
                ) : (
                  <Badge variant="outline">Arxiv</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
