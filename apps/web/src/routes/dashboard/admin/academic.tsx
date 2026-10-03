import { Navigate, useSearchParams } from "react-router-dom";

const STRUCTURE_TABS = ["faculties", "departments", "directions", "groups", "academic-years"] as const;
type StructureTab = (typeof STRUCTURE_TABS)[number];

function isStructureTab(tab: string | null): tab is StructureTab {
  return tab !== null && (STRUCTURE_TABS as readonly string[]).includes(tab);
}

/**
 * Eski `/admin/academic?tab=...` manzili (buyruqlar palitrasi, eski havolalar) — endi har bir
 * bo'lim alohida sahifada (`/admin/structure/...`). Takroriy sahifa o'rniga yo'naltiramiz.
 */
export function AcademicPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  return <Navigate to={`/admin/structure/${isStructureTab(tab) ? tab : "faculties"}`} replace />;
}
