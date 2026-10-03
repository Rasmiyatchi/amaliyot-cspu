import { Building, GraduationCap, Layers, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { FacultyList } from "@/components/admin/academic/faculty-list";
import { Button } from "@/components/ui/button";
import { useDepartments, useDirections, useFaculties } from "@/lib/api/academic";

export function FacultiesPage() {
  const { t } = useTranslation();
  // Faqat jami sonlar kerak — har biridan bitta qator so'raymiz (`total` serverdan keladi)
  const { data: faculties } = useFaculties(1, 1);
  const { data: departments } = useDepartments(undefined, 1, 1);
  const { data: directions } = useDirections(undefined, 1, 1);
  const [creating, setCreating] = useState(false);

  const stats = [
    {
      label: t("adminAcademic.tabs.faculties"),
      value: faculties?.total,
      icon: Building,
      iconClass: "text-blue-500",
    },
    {
      label: t("adminAcademic.tabs.departments"),
      value: departments?.total,
      icon: Layers,
      iconClass: "text-purple-500",
    },
    {
      label: t("adminAcademic.tabs.directions"),
      value: directions?.total,
      icon: GraduationCap,
      iconClass: "text-emerald-500",
    },
  ];

  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">
                {t("adminAcademic.tabs.faculties")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("adminStructure.facultiesSubtitle")}
              </p>
            </div>
          </div>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("academicFacultyList.newFaculty")}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                <s.icon className={`h-4 w-4 ${s.iconClass}`} aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-2xl font-bold">{s.value ?? "—"}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link to="/admin/structure/departments">
              <Layers className="h-3.5 w-3.5" />
              {t("adminAcademic.tabs.departments")} →
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link to="/admin/structure/directions">
              <GraduationCap className="h-3.5 w-3.5" />
              {t("adminAcademic.tabs.directions")} →
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4">
          <FacultyList createOpen={creating} onCreateOpenChange={setCreating} />
        </div>
      </div>
    </div>
  );
}
