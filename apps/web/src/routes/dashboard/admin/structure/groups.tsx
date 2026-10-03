import { Calendar, GraduationCap, Plus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { GroupList } from "@/components/admin/academic/group-list";
import { Button } from "@/components/ui/button";
import { useAcademicYears, useDirections, useGroups } from "@/lib/api/academic";

export function GroupsPage() {
  const { t } = useTranslation();
  // Faqat jami sonlar kerak — har biridan bitta qator so'raymiz (`total` serverdan keladi)
  const { data: groups } = useGroups({}, 1, 1);
  const { data: directions } = useDirections(undefined, 1, 1);
  const { data: academicYears } = useAcademicYears();
  const [creating, setCreating] = useState(false);

  const stats = [
    {
      label: t("adminAcademic.tabs.groups"),
      value: groups?.total,
      icon: Users,
      iconClass: "text-orange-500",
    },
    {
      label: t("adminAcademic.tabs.directions"),
      value: directions?.total,
      icon: GraduationCap,
      iconClass: "text-emerald-500",
    },
    {
      label: t("adminAcademic.tabs.academicYears"),
      value: academicYears?.length,
      icon: Calendar,
      iconClass: "text-sky-500",
    },
  ];

  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 ring-1 ring-orange-500/20">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{t("adminAcademic.tabs.groups")}</h1>
              <p className="text-sm text-muted-foreground">{t("adminStructure.groupsSubtitle")}</p>
            </div>
          </div>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("academicGroupList.newGroup")}
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
            <Link to="/admin/structure/directions">
              <GraduationCap className="h-3.5 w-3.5" />
              {t("adminAcademic.tabs.directions")} →
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link to="/admin/structure/students">
              <Users className="h-3.5 w-3.5" />
              {t("adminAcademic.tabs.students")} →
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4">
          <GroupList createOpen={creating} onCreateOpenChange={setCreating} />
        </div>
      </div>
    </div>
  );
}
