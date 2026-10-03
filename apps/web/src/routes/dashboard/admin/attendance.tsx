import { CalendarCheck, CalendarDays, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AttendanceDaysTab,
  type DaysAssignmentPreset,
} from "@/components/admin/attendance/attendance-days-tab";
import { AttendanceStudentsTab } from "@/components/admin/attendance/attendance-students-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabKey = "students" | "days";

export function AttendancePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("students");
  const [daysPreset, setDaysPreset] = useState<DaysAssignmentPreset | null>(null);

  return (
    <div className="container max-w-7xl py-6 sm:py-8">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <CalendarCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">{t("adminAttendance.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("adminAttendance.subtitle")}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="students" className="flex-1 gap-1.5 sm:flex-none">
            <Users className="h-4 w-4" />
            {t("adminAttendance.tabStudents", { defaultValue: "Talabalar" })}
          </TabsTrigger>
          <TabsTrigger value="days" className="flex-1 gap-1.5 sm:flex-none">
            <CalendarDays className="h-4 w-4" />
            {t("adminAttendance.tabDays", { defaultValue: "Kunlar" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <AttendanceStudentsTab
            onOpenInDaysList={(row) => {
              setDaysPreset({ assignment_id: row.assignment_id, label: row.student_full_name });
              setTab("days");
            }}
          />
        </TabsContent>
        <TabsContent value="days">
          <AttendanceDaysTab preset={daysPreset} onClearPreset={() => setDaysPreset(null)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
