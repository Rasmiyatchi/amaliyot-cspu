import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOverdueTasks } from "@/lib/api/tasks";

/**
 * Deadline o'tib ketgan, topshirilmagan topshiriqlar ogohlantirishi.
 * Admin/super_admin/supervisor uchun. Hech narsa bo'lmasa ko'rinmaydi.
 */
export function OverdueTasksCard() {
  const { data, isPending } = useOverdueTasks();

  if (isPending || !data || data.length === 0) return null;

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-warning-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Muddati o'tgan topshiriqlar ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {data.map((t) => (
            <div
              key={t.task_id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.template_title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.student_full_name ?? "—"}
                  {t.group_name ? ` · ${t.group_name}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(t.due_date).toLocaleDateString("uz-UZ")}
                </span>
                <Badge variant="destructive">{t.days_overdue} kun</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
