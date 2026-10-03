import { useTranslation } from "react-i18next";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Accordion, type AccordionItemProps } from "@/components/ui/accordion";

const QUESTIONS = ["q1", "q2", "q3", "q4", "q5"] as const;

export function FaqPage() {
  const { t } = useTranslation();

  const faqs: AccordionItemProps[] = QUESTIONS.map((q, i) => ({
    id: `item-${i}`,
    number: `0${i + 1}`,
    question: t(`faqPage.items.${q}.question`),
    answer: t(`faqPage.items.${q}.answer`),
  }));

  return (
    <>
      <SiteHeader />
      <main className="inner-page">
        <section className="page-intro container mx-auto px-4">
          <span className="section-index">{t("faqPage.index")}</span>
          <h1>
            {t("faqPage.titleLine1")}
            <br />
            <em>{t("faqPage.titleLine2")}</em>
          </h1>
          <p>{t("faqPage.description")}</p>
        </section>

        <section className="container mx-auto px-4">
          <Accordion items={faqs} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
