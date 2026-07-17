import { BookOpen, FileText, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { PracticeType } from "@/lib/api/types";

const OBJECT_KIND_LABEL_KEY = {
  organization: "practiceTypesPracticeTypeDetailDialog.objectKind.organization",
  area: "practiceTypesPracticeTypeDetailDialog.objectKind.area",
  any: "practiceTypesPracticeTypeDetailDialog.objectKind.any",
};

const GRADER_LABEL_KEY: Record<string, string> = {
  system: "practiceTypesPracticeTypeDetailDialog.graders.system",
  supervisor: "practiceTypesPracticeTypeDetailDialog.graders.supervisor",
  organization: "practiceTypesPracticeTypeDetailDialog.graders.organization",
  department_head: "practiceTypesPracticeTypeDetailDialog.graders.departmentHead",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

type Props = {
  practiceType: PracticeType | null;
  onClose: () => void;
};

export function PracticeTypeDetailDialog({ practiceType, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!practiceType} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {practiceType && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div>{practiceType.name}</div>
                  <div className="mt-0.5 font-mono text-xs font-normal text-muted-foreground">
                    {practiceType.code}
                  </div>
                </div>
                {!practiceType.is_active && (
                  <Badge variant="outline">
                    {t("practiceTypesPracticeTypeDetailDialog.inactive")}
                  </Badge>
                )}
              </DialogTitle>
              {practiceType.description && (
                <DialogDescription>{practiceType.description}</DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4">
              {/* Asosiy ma'lumot */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="mr-1 inline h-3 w-3" />{" "}
                  {t("practiceTypesPracticeTypeDetailDialog.contractAndObject")}
                </h3>
                <dl className="space-y-1.5">
                  <Row
                    label={t("practiceTypesPracticeTypeDetailDialog.contract")}
                    value={
                      practiceType.requires_contract ? (
                        <Badge variant="default">
                          {t("practiceTypesPracticeTypeDetailDialog.required")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t("practiceTypesPracticeTypeDetailDialog.notRequired")}
                        </Badge>
                      )
                    }
                  />
                  {practiceType.contract_template_ref && (
                    <Row
                      label={t("practiceTypesPracticeTypeDetailDialog.contractTemplate")}
                      value={
                        <Badge variant="outline" className="font-mono">
                          {practiceType.contract_template_ref}
                        </Badge>
                      }
                    />
                  )}
                  <Row
                    label={t("practiceTypesPracticeTypeDetailDialog.objectType")}
                    value={t(OBJECT_KIND_LABEL_KEY[practiceType.object_kind])}
                  />
                </dl>
              </section>

              <Separator />

              {/* Davomiylik */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="mr-1 inline h-3 w-3" />{" "}
                  {t("practiceTypesPracticeTypeDetailDialog.durationAndCourses")}
                </h3>
                <dl className="space-y-1.5">
                  <Row
                    label={t("practiceTypesPracticeTypeDetailDialog.weeks")}
                    value={
                      practiceType.min_weeks === practiceType.max_weeks
                        ? t("practiceTypesPracticeTypeDetailDialog.weeksValue", {
                            n: practiceType.min_weeks,
                          })
                        : t("practiceTypesPracticeTypeDetailDialog.weeksRange", {
                            min: practiceType.min_weeks,
                            max: practiceType.max_weeks,
                          })
                    }
                  />
                  {practiceType.days_per_week && (
                    <Row
                      label={t("practiceTypesPracticeTypeDetailDialog.daysPerWeek")}
                      value={t("practiceTypesPracticeTypeDetailDialog.daysValue", {
                        n: practiceType.days_per_week,
                      })}
                    />
                  )}
                  {practiceType.hours_per_day && (
                    <Row
                      label={t("practiceTypesPracticeTypeDetailDialog.hoursPerDay")}
                      value={t("practiceTypesPracticeTypeDetailDialog.hoursValue", {
                        n: practiceType.hours_per_day,
                      })}
                    />
                  )}
                  <Row
                    label={t("practiceTypesPracticeTypeDetailDialog.allowedCourses")}
                    value={
                      <div className="flex flex-wrap gap-1">
                        {practiceType.allowed_courses.map((c) => (
                          <Badge key={c} variant="secondary">
                            {t("common.courseN", { n: c })}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                </dl>
              </section>

              <Separator />

              {/* Baholash */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("practiceTypesPracticeTypeDetailDialog.gradingTitle")}
                </h3>
                <div className="rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">
                          {t("practiceTypesPracticeTypeDetailDialog.criterion")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("practiceTypesPracticeTypeDetailDialog.grader")}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t("practiceTypesPracticeTypeDetailDialog.maxPoints")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {practiceType.grading_rules.criteria?.map((c) => (
                        <tr key={c.key} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{c.name}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {GRADER_LABEL_KEY[c.grader] ? t(GRADER_LABEL_KEY[c.grader]!) : c.grader}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{c.max}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30">
                        <td colSpan={2} className="px-3 py-2 text-xs font-medium">
                          {t("practiceTypesPracticeTypeDetailDialog.minTotal")}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          {practiceType.grading_rules.min_total}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
