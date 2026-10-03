import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RotateCw,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { AttendanceStatusBadge } from "@/components/admin/attendance/attendance-status-badge";
import { ArchiveCard } from "@/components/archive-card";
import {
  addDays,
  formatTashkentDate,
  tashkentDayStartMs,
} from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import { useTashkentToday } from "@/components/attendance/use-tashkent-today";
import { AttendanceCalendarCard } from "@/components/student/attendance-calendar-card";
import { StudentAcademicPanel } from "@/components/student/academic-panel";
import { StudentApplicationCard } from "@/components/student/application-card";
import { CheckInButton } from "@/components/student/check-in-button";
import { StudentDocumentsCard } from "@/components/student/documents-card";
import { FinalReportCard } from "@/components/student/final-report-card";
import { StudentInquiryCard } from "@/components/student/inquiry-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { dateLocale } from "@/i18n";
import { useMyAssignments } from "@/lib/api/assignments";
import { useTodayStatus } from "@/lib/api/attendance";
import type { ISODate, PracticeAssignment } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

type Phase = "upcoming" | "ongoing" | "finished";
type StepState = "complete" | "current" | "pending";

const DAY_MS = 24 * 60 * 60 * 1000;

const isOpenAssignment = (a: PracticeAssignment) => a.status === "active" || a.status === "draft";

/**
 * Bosh sahifada ko'rsatiladigan biriktirish (API start_date bo'yicha kamayish tartibida beradi):
 *  1) hozir davom etayotgani (bugun oraliqda), 2) eng yaqin boshlanadigani,
 *  3) muddati tugagan, lekin hali yopilmagani, 4) oxirgi yakunlangani — natija/baho ko'rinsin.
 */
function pickFocusAssignment(
  list: readonly PracticeAssignment[],
  today: ISODate,
): PracticeAssignment | null {
  const open = list.filter(isOpenAssignment);
  const ongoing = open
    .filter((a) => a.start_date <= today && today <= a.end_date)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  if (ongoing[0]) return ongoing[0];
  const upcoming = open
    .filter((a) => a.start_date > today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (upcoming[0]) return upcoming[0];
  const ended = open
    .filter((a) => a.end_date < today)
    .sort((a, b) => b.end_date.localeCompare(a.end_date));
  if (ended[0]) return ended[0];
  const completed = list
    .filter((a) => a.status === "completed")
    .sort((a, b) => b.end_date.localeCompare(a.end_date));
  return completed[0] ?? null;
}

/**
 * Amaliyot jarayoni — Toshkent vaqti bo'yicha [start 00:00, end 24:00) oralig'idan o'tgan ulush.
 * Boshlanmagan → 0, tugagan yoki baholangan → 100.
 */
function practiceTimeline(
  a: PracticeAssignment,
  today: ISODate,
  nowMs: number,
): { phase: Phase; percent: number } {
  if (a.status === "completed" || a.end_date < today) return { phase: "finished", percent: 100 };
  if (today < a.start_date) return { phase: "upcoming", percent: 0 };
  const startMs = tashkentDayStartMs(a.start_date);
  const endMs = tashkentDayStartMs(a.end_date) + DAY_MS;
  const ratio = (nowMs - startMs) / (endMs - startMs);
  // 100% faqat haqiqatan tugaganda — jarayondagi amaliyot ko'pi bilan 99%
  return { phase: "ongoing", percent: Math.min(99, Math.max(0, Math.floor(ratio * 100))) };
}

type Step = { key: string; title: string; detail: string; state: StepState };

function StepBubble({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-black",
        state === "complete" &&
          "border-emerald-500/40 text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-400",
        state === "current" && "border-primary bg-primary text-primary-foreground",
        state === "pending" && "border-border text-muted-foreground",
      )}
    >
      {state === "complete" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        String(index + 1).padStart(2, "0")
      )}
    </span>
  );
}

export function StudentDashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const todayIso = useTashkentToday();
  const {
    data: assignments,
    isPending: assignmentsPending,
    isError: assignmentsFailed,
    error: assignmentsError,
    refetch: refetchAssignments,
    isFetching: assignmentsFetching,
  } = useMyAssignments();

  const focus = useMemo(
    () => pickFocusAssignment(assignments ?? [], todayIso),
    [assignments, todayIso],
  );
  const timeline = useMemo(
    () => (focus ? practiceTimeline(focus, todayIso, Date.now()) : null),
    [focus, todayIso],
  );
  const isOpen = !!focus && isOpenAssignment(focus);
  const isOngoing = isOpen && timeline?.phase === "ongoing";
  // Oxirgi kuni kech kelgan talaba yarim tundan keyin ham "Ketdim" bosa olishi kerak (server ochiq
  // smenani 20 soatgacha yopishga ruxsat beradi) — shuning uchun end_date'dan keyingi kun ham so'raymiz.
  const watchToday =
    isOpen &&
    !!focus &&
    !!timeline &&
    timeline.phase !== "upcoming" &&
    todayIso <= addDays(focus.end_date, 1);

  const { data: today } = useTodayStatus(watchToday && focus ? focus.id : null);
  const hasOpenShift = !!today && !!today.check_in_at && !today.check_out_at;
  const canCheckIn = isOngoing || hasOpenShift;

  const locale = dateLocale();
  const objectName = focus ? (focus.organization_name ?? focus.area_name) : null;

  const steps: Step[] =
    focus && timeline
      ? [
          {
            key: "placement",
            title: t("studentDashboard.steps.placement"),
            detail: objectName ?? t("studentDashboard.steps.placementMissing"),
            state: objectName ? "complete" : "pending",
          },
          {
            key: "practice",
            title: t("studentDashboard.steps.practice"),
            detail:
              timeline.phase === "upcoming"
                ? t("studentDashboard.steps.startsOn", {
                    date: formatTashkentDate(focus.start_date, locale),
                  })
                : timeline.phase === "ongoing"
                  ? t("studentDashboard.steps.endsOn", {
                      date: formatTashkentDate(focus.end_date, locale),
                    })
                  : t("studentDashboard.steps.endedOn", {
                      date: formatTashkentDate(focus.end_date, locale),
                    }),
            state:
              timeline.phase === "finished"
                ? "complete"
                : timeline.phase === "ongoing"
                  ? "current"
                  : "pending",
          },
          {
            key: "result",
            title: t("studentDashboard.steps.result"),
            detail:
              focus.final_grade !== null
                ? focus.credit_earned
                  ? t("studentDashboard.steps.gradeWithCredit", { grade: focus.final_grade })
                  : t("studentDashboard.steps.gradeNoCredit", { grade: focus.final_grade })
                : timeline.phase === "finished"
                  ? t("studentDashboard.steps.awaitingGrade")
                  : t("studentDashboard.steps.resultPending"),
            state:
              focus.final_grade !== null
                ? "complete"
                : timeline.phase === "finished"
                  ? "current"
                  : "pending",
          },
        ]
      : [];

  // Holat qatori: yakunlangan kun va oldindan qizil kun tugma ichida ko'rsatiladi
  const showStatusRow =
    !!today && !today.check_out_at && !(today.status === "red" && !today.check_in_at);

  return (
    <main className="container mx-auto overflow-x-hidden px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <section className="dash-welcome gap-4">
          <div className="min-w-0">
            <span className="uppercase">
              {focus?.practice_type_name ?? t("studentDashboard.kickerDefault")}
            </span>
            <h2 className="break-words">{t("student.welcome", { name: user?.first_name })}</h2>
            <p className="break-words">
              {focus
                ? `${objectName ?? t("studentDashboard.steps.placementMissing")} · ${formatTashkentDate(focus.start_date, locale)} — ${formatTashkentDate(focus.end_date, locale)}`
                : !assignmentsPending && t("student.notAssigned")}
            </p>
          </div>
          {timeline && (
            <div className="progress-score shrink-0">
              <strong>
                {timeline.percent}
                <small>%</small>
              </strong>
              <span className="uppercase">{t(`studentDashboard.phase.${timeline.phase}`)}</span>
            </div>
          )}
        </section>
        {timeline && (
          <div
            className="dash-progress mb-6 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={timeline.percent}
            aria-label={t("studentDashboard.progressLabel")}
          >
            <i style={{ width: `${timeline.percent}%` }} />
          </div>
        )}

        {focus && steps.length > 0 && (
          <article className="dash-card">
            <div className="card-title">
              <div>
                <span className="uppercase">{t("studentDashboard.statusKicker")}</span>
                <h3>{t("studentDashboard.statusTitle")}</h3>
              </div>
              <GraduationCap className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <ol className="space-y-1">
              {steps.map((step, idx) => (
                <li
                  key={step.key}
                  className="flex items-center gap-3.5 py-2.5"
                  aria-current={step.state === "current" ? "step" : undefined}
                >
                  <StepBubble state={step.state} index={idx} />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-foreground">
                      {step.title}
                      <span className="sr-only">
                        {" "}
                        — {t(`studentDashboard.stepState.${step.state}`)}
                      </span>
                    </p>
                    <p className="mt-0.5 break-words text-[11px] text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        )}

        {assignmentsPending && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {assignmentsFailed && !assignments && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{describeRequestError(assignmentsError, t)}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void refetchAssignments()}
                disabled={assignmentsFetching}
              >
                <RotateCw className={cn("h-4 w-4", assignmentsFetching && "animate-spin")} />
                {t("studentDashboard.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!assignmentsPending && !assignmentsFailed && !focus && (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={CalendarDays}
                title={t("student.emptyTitle")}
                description={t("student.emptyDescription")}
              />
            </CardContent>
          </Card>
        )}

        {focus && timeline && (
          <>
            {isOpen && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("student.todayAttendance")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canCheckIn ? (
                    <CheckInButton
                      assignmentId={focus.id}
                      today={today}
                      locationOptional={!focus.organization_id}
                    />
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>
                        {timeline.phase === "upcoming"
                          ? t("studentDashboard.checkInNotStarted", {
                              date: formatTashkentDate(focus.start_date, locale),
                            })
                          : t("studentDashboard.checkInEnded", {
                              date: formatTashkentDate(focus.end_date, locale),
                            })}
                      </span>
                    </div>
                  )}
                  {canCheckIn && today && showStatusRow && (
                    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{t("common.status")}:</span>
                      <AttendanceStatusBadge status={today.status} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* To'liq davomat va taqvim (kalendar + statistika + ro'yxat) */}
            <AttendanceCalendarCard assignment={focus} />

            {/* Amaliyot muddati */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("student.practicePeriod")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">{t("student.startDate")}</div>
                  <div>{formatTashkentDate(focus.start_date, locale)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("student.endDate")}</div>
                  <div>{formatTashkentDate(focus.end_date, locale)}</div>
                </div>
                {focus.supervisor_full_name && (
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted-foreground">
                      {t("student.supervisorLabel")}
                    </div>
                    <div className="break-words">{focus.supervisor_full_name}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Academic panel — tasks/journal/analyses */}
            <StudentAcademicPanel assignmentId={focus.id} />

            {/* Hujjatlarim — barcha attachments */}
            <StudentDocumentsCard assignmentId={focus.id} />

            {/* Yakuniy hisobot — arxivga yo'l */}
            <FinalReportCard assignmentId={focus.id} />

            {/* Yig'ma jild */}
            <ArchiveCard assignmentId={focus.id} />
          </>
        )}

        {/* Amaliyot arizalari — biriktirishdan mustaqil, har doim ko'rinadi */}
        <StudentApplicationCard />

        {/* Adminga murojaat (chat) */}
        <StudentInquiryCard />
      </div>
    </main>
  );
}
