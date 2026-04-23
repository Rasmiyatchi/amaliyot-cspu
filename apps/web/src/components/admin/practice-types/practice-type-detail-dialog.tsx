import { BookOpen, FileText, Users } from "lucide-react";

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

const OBJECT_KIND_LABEL = {
  organization: "Tashkilot (maktab/MTT)",
  area: "Hudud (dala)",
  any: "Tashkilot yoki hudud",
};

const GRADER_LABEL: Record<string, string> = {
  system: "Tizim (avto)",
  supervisor: "Amaliyot rahbari",
  organization: "Tashkilot rahbariyati",
  department_head: "Kafedra mudiri",
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
                {!practiceType.is_active && <Badge variant="outline">Deaktiv</Badge>}
              </DialogTitle>
              {practiceType.description && (
                <DialogDescription>{practiceType.description}</DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4">
              {/* Asosiy ma'lumot */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="mr-1 inline h-3 w-3" /> Shartnoma va obyekt
                </h3>
                <dl className="space-y-1.5">
                  <Row
                    label="Shartnoma"
                    value={
                      practiceType.requires_contract ? (
                        <Badge variant="default">Majburiy</Badge>
                      ) : (
                        <Badge variant="secondary">Talab qilinmaydi</Badge>
                      )
                    }
                  />
                  {practiceType.contract_template_ref && (
                    <Row
                      label="Shartnoma shabloni"
                      value={
                        <Badge variant="outline" className="font-mono">
                          {practiceType.contract_template_ref}
                        </Badge>
                      }
                    />
                  )}
                  <Row label="Obyekt turi" value={OBJECT_KIND_LABEL[practiceType.object_kind]} />
                </dl>
              </section>

              <Separator />

              {/* Davomiylik */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="mr-1 inline h-3 w-3" /> Davomiylik va kurslar
                </h3>
                <dl className="space-y-1.5">
                  <Row
                    label="Haftalar"
                    value={
                      practiceType.min_weeks === practiceType.max_weeks
                        ? `${practiceType.min_weeks} hafta`
                        : `${practiceType.min_weeks}–${practiceType.max_weeks} hafta`
                    }
                  />
                  {practiceType.days_per_week && (
                    <Row label="Haftada kun" value={`${practiceType.days_per_week} kun`} />
                  )}
                  {practiceType.hours_per_day && (
                    <Row label="Kunlik soat" value={`${practiceType.hours_per_day} soat`} />
                  )}
                  <Row
                    label="Ruxsat etilgan kurslar"
                    value={
                      <div className="flex flex-wrap gap-1">
                        {practiceType.allowed_courses.map((c) => (
                          <Badge key={c} variant="secondary">
                            {c}-kurs
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
                  Baholash qoidalari (100 ball tizimi)
                </h3>
                <div className="rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Mezon</th>
                        <th className="px-3 py-2 font-medium">Baholaydi</th>
                        <th className="px-3 py-2 text-right font-medium">Maks ball</th>
                      </tr>
                    </thead>
                    <tbody>
                      {practiceType.grading_rules.criteria?.map((c) => (
                        <tr key={c.key} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{c.name}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {GRADER_LABEL[c.grader] ?? c.grader}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{c.max}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30">
                        <td colSpan={2} className="px-3 py-2 text-xs font-medium">
                          Minimal kredit olish uchun
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
