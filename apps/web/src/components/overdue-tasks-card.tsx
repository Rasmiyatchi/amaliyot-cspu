import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { dateLocale } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOverdueTasks } from "@/lib/api/tasks";

/**
 * Deadline o'tib ketgan, topshirilmagan topshiriqlar ogohlantirishi.
 * Admin/super_admin/supervisor uchun. Hech narsa bo'lmasa ko'rinmaydi.
 */
export function OverdueTasksCard() {
  const { t } = useTranslation();
  const { data, isPending } = useOverdueTasks();

  if (isPending || !data || data.length === 0) return null;

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-warning-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          {t("overdueTasksCard.title", { count: data.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {data.map((task) => (
            <div
              key={task.task_id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{task.template_title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {task.student_full_name ?? "—"}
                  {task.group_name ? ` · ${task.group_name}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(task.due_date).toLocaleDateString(dateLocale())}
                </span>
                <Badge variant="destructive">
                  {t("overdueTasksCard.daysOverdue", { count: task.days_overdue })}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
