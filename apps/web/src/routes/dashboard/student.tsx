import { CalendarDays, GraduationCap, Loader2 } from "lucide-react";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { ArchiveCard } from "@/components/archive-card";
import { NotificationsBell } from "@/components/notifications-bell";
import { StudentAcademicPanel } from "@/components/student/academic-panel";
import { CheckInButton } from "@/components/student/check-in-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAttendanceDays, useTodayStatus } from "@/lib/api/attendance";
import { useMyAssignments } from "@/lib/api/assignments";
import { useAuthStore } from "@/stores/auth";

export function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: assignments, isPending: assignmentsPending } = useMyAssignments();

  // Hozircha 1-assignmentga fokus (active'lardan)
  const activeAssignment =
    assignments?.find((a) => a.status === "active" || a.status === "draft") ?? null;

  const { data: today } = useTodayStatus(activeAssignment?.id ?? null);
  const { data: recent } = useAttendanceDays(
    activeAssignment ? { assignment_id: activeAssignment.id } : {},
    1,
    7,
  );

  return (
    <main className="container py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <GraduationCap className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Salom, {user?.first_name}</h2>
            <p className="text-sm text-muted-foreground">
              {activeAssignment
                ? `${activeAssignment.practice_type_name} · ${
                    activeAssignment.organization_name ?? activeAssignment.area_name
                  }`
                : "Amaliyotga biriktirilmagansiz"}
            </p>
          </div>
          <NotificationsBell />
        </div>

        {assignmentsPending && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!assignmentsPending && !activeAssignment && (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={CalendarDays}
                title="Amaliyot yo'q"
                description="Sizga hali hech qanday amaliyot biriktirilmagan"
              />
            </CardContent>
          </Card>
        )}

        {activeAssignment && (
          <>
            {/* Check-in tugma */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bugungi davomat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CheckInButton assignmentId={activeAssignment.id} today={today} />
                {today && (
                  <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <AttendanceStatusBadge status={today.status} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Oxirgi 7 kun */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Oxirgi kunlar</CardTitle>
              </CardHeader>
              <CardContent>
                {recent && recent.items.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    Hali davomat yozuvi yo'q
                  </div>
                )}
                {recent && recent.items.length > 0 && (
                  <div className="space-y-2">
                    {recent.items.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {d.date}
                          </div>
                          {d.check_in_at && (
                            <div className="text-xs">
                              {new Date(d.check_in_at).toLocaleTimeString("uz-UZ", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {d.check_out_at &&
                                ` — ${new Date(d.check_out_at).toLocaleTimeString("uz-UZ", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`}
                            </div>
                          )}
                        </div>
                        <AttendanceStatusBadge status={d.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Amaliyot muddati */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Amaliyot muddati</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Boshlanish</div>
                  <div>{new Date(activeAssignment.start_date).toLocaleDateString("uz-UZ")}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tugash</div>
                  <div>{new Date(activeAssignment.end_date).toLocaleDateString("uz-UZ")}</div>
                </div>
                {activeAssignment.supervisor_full_name && (
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Rahbar</div>
                    <div>{activeAssignment.supervisor_full_name}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Academic panel — tasks/journal/analyses */}
            <StudentAcademicPanel assignmentId={activeAssignment.id} />

            {/* Yig'ma jild */}
            <ArchiveCard assignmentId={activeAssignment.id} />
          </>
        )}
      </div>
    </main>
  );
}
