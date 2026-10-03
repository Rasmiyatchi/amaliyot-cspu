import { Calendar, CheckCircle, Plus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AcademicYearList } from "@/components/admin/academic/academic-year-list";
import { Button } from "@/components/ui/button";
import { useAcademicYears, useGroups } from "@/lib/api/academic";

export function AcademicYearsPage() {
  const { t } = useTranslation();
  const { data: academicYears } = useAcademicYears();
  const { data: groups } = useGroups({}, 1, 1);
  const [creating, setCreating] = useState(false);

  const activeYear = academicYears?.find((y) => y.is_active);

  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
              <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">
                {t("adminAcademic.tabs.academicYears")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("adminStructure.academicYearsSubtitle")}
              </p>
            </div>
          </div>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("academicAcademicYearList.newYear")}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 text-sky-500" aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wide">
                {t("adminStructure.statTotal")}
              </span>
            </div>
            <p className="text-2xl font-bold">{academicYears?.length ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wide">
                {t("adminStructure.statActiveYear")}
              </span>
            </div>
            <p className="truncate text-lg font-bold">{activeYear?.name ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-orange-500" aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wide">
                {t("adminAcademic.tabs.groups")}
              </span>
            </div>
            <p className="text-2xl font-bold">{groups?.total ?? "—"}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link to="/admin/structure/groups">
              <Users className="h-3.5 w-3.5" />
              {t("adminAcademic.tabs.groups")} →
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4">
          <AcademicYearList createOpen={creating} onCreateOpenChange={setCreating} />
        </div>
      </div>
    </div>
  );
}
