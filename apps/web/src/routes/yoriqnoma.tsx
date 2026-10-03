import {
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  FileCheck2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

const GUIDES: Array<{ key: string; icon: LucideIcon }> = [
  { key: "profile", icon: UserCheck },
  { key: "tasks", icon: ClipboardCheck },
  { key: "attendance", icon: CalendarCheck },
  { key: "report", icon: FileCheck2 },
];

export function YoriqnomaPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <SiteHeader />
      <main className="inner-page">
        <section className="page-intro container mx-auto px-4">
          <span className="section-index">{t("guidePage.index")}</span>
          <h1>
            {t("guidePage.titleLine1")}
            <br />
            <em>{t("guidePage.titleLine2")}</em>
          </h1>
          <p>{t("guidePage.description")}</p>
        </section>

        <section className="container mx-auto px-4 guide-grid">
          {GUIDES.map(({ key, icon: Icon }, i) => (
            <article key={key}>
              <span>0{i + 1}</span>
              <Icon aria-hidden="true" />
              <h2>{t(`guidePage.steps.${key}.title`)}</h2>
              <p>{t(`guidePage.steps.${key}.desc`)}</p>
            </article>
          ))}
        </section>

        <section className="container mx-auto px-4 guide-cta">
          <div>
            <h2>{t("guidePage.ctaTitle")}</h2>
            <p>{t("guidePage.ctaText")}</p>
          </div>
          <Button asChild size="lg">
            <Link to={user ? landingPathFor(user.role) : "/login"}>
              {user ? t("siteChrome.myDashboard") : t("siteChrome.login")} <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
