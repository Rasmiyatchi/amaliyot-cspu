import {
  CalendarCheck,
  ClipboardCheck,
  FileCheck2,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { PrivateState } from "@/components/PrivateState";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

const SECTIONS: Array<{ key: string; icon: LucideIcon }> = [
  { key: "placement", icon: MapPin },
  { key: "attendance", icon: CalendarCheck },
  { key: "tasks", icon: ClipboardCheck },
  { key: "documents", icon: FileCheck2 },
];

/**
 * "Amaliyot" sahifasi. Amaliyot yozuvlari shaxsiy ma'lumot bo'lgani uchun ochiq qidiruv
 * yo'q — sahifa ma'lumotlar qayerda ekanini tushuntiradi va kabinetga yo'naltiradi.
 */
export function AmaliyotPage() {
  const { t } = useTranslation();

  return (
    <>
      <SiteHeader />
      <main className="inner-page">
        <section className="page-intro container mx-auto px-4">
          <span className="section-index">{t("amaliyotPage.index")}</span>
          <h1>
            {t("amaliyotPage.titleLine1")}
            <br />
            <em>{t("amaliyotPage.titleLine2")}</em>
          </h1>
          <p>{t("amaliyotPage.description")}</p>
        </section>

        <section className="container mx-auto px-4 guide-grid">
          {SECTIONS.map(({ key, icon: Icon }, i) => (
            <article key={key}>
              <span>0{i + 1}</span>
              <Icon aria-hidden="true" />
              <h2>{t(`amaliyotPage.sections.${key}.title`)}</h2>
              <p>{t(`amaliyotPage.sections.${key}.desc`)}</p>
            </article>
          ))}
        </section>

        <section className="container mx-auto px-4 result-area">
          <PrivateState />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
