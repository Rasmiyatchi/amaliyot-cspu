import {
  ArrowRight,
  ArrowUpRight,
  Check,
  GraduationCap,
  Info,
  School,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { DashboardPreview } from "@/components/DashboardPreview";
import { PracticeSearch } from "@/components/PracticeSearch";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

/** Platformaning o'zi haqidagi faktlar (konfiguratsiya) — foydalanish statistikasi emas. */
const STATS = [
  { value: "08", labelKey: "home.statsBand.practiceTypes" },
  { value: "43+", labelKey: "home.statsBand.syllabusTasks" },
  { value: "100", labelKey: "home.statsBand.gradingScale" },
  { value: "04", labelKey: "home.statsBand.userRoles" },
] as const;

const STEPS = ["s1", "s2", "s3", "s4", "s5"] as const;

const ROLES = [
  { key: "student", icon: GraduationCap },
  { key: "supervisor", icon: UserRoundCheck },
  { key: "faculty", icon: School },
  { key: "department", icon: ShieldCheck },
] as const;

const ROLE_ITEMS = ["c1", "c2", "c3", "c4"] as const;

export function Home() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const primaryCta = user
    ? { to: landingPathFor(user.role), label: t("siteChrome.myDashboard") }
    : { to: "/login", label: t("siteChrome.login") };

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-spot" />
          <div className="container mx-auto px-4 hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> {t("home.hero.eyebrow")}
              </div>
              <h1>
                <span className="hero-number" aria-hidden="true">
                  <i>4</i>
                  <b>+</b>
                  <i>2</i>
                </span>
                <span>
                  {t("home.hero.titleLine1")}
                  <br />
                  {t("home.hero.titleLine2")}
                </span>
              </h1>
              <p>{t("home.hero.description")}</p>
              <div className="hero-actions">
                <Button asChild size="lg">
                  <Link to={primaryCta.to}>
                    {primaryCta.label} <ArrowUpRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/amaliyot">
                    {t("home.hero.practiceInfo")} <Info />
                  </Link>
                </Button>
              </div>
              <div className="hero-note">
                <span>
                  <Check /> {t("home.hero.noteSecure")}
                </span>
                <span>
                  <Check /> {t("home.hero.noteRealtime")}
                </span>
              </div>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* Amaliyot ma'lumotlari — shaxsiy kabinetda (ochiq qidiruv yo'q) */}
        <section className="search-band">
          <div className="container mx-auto px-4 search-card">
            <div>
              <span className="section-index">{t("home.search.index")}</span>
              <h2>{t("home.search.title")}</h2>
              <p>{t("home.search.description")}</p>
            </div>
            <PracticeSearch />
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="container mx-auto px-4">
            <div className="section-heading">
              <div>
                <span className="section-index">{t("home.statsBand.index")}</span>
                <h2>
                  {t("home.statsBand.titleLine1")}
                  <br />
                  <em>{t("home.statsBand.titleLine2")}</em>
                </h2>
              </div>
              <p>{t("home.statsBand.description")}</p>
            </div>
            <div className="stats-row">
              {STATS.map((s, i) => (
                <div className="stat" key={s.labelKey}>
                  <small>0{i + 1}</small>
                  <strong>{s.value}</strong>
                  <span>{t(s.labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Journey Timeline */}
        <section className="journey">
          <div className="container mx-auto px-4">
            <span className="section-index light">{t("home.journey.index")}</span>
            <div className="section-heading dark">
              <h2>
                {t("home.journey.titleLine1")}
                <br />
                <em>{t("home.journey.titleLine2")}</em>
              </h2>
              <p>{t("home.journey.description")}</p>
            </div>
            <ol className="timeline">
              {STEPS.map((step, i) => (
                <li className="timeline-step" key={step}>
                  <div className="timeline-dot">
                    <span>{i === 0 ? <Check size={15} /> : `0${i + 1}`}</span>
                  </div>
                  <h3>{t(`home.journey.steps.${step}.title`)}</h3>
                  <p>{t(`home.journey.steps.${step}.desc`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Ecosystem Roles */}
        <section className="ecosystem">
          <div className="container mx-auto px-4">
            <div className="section-heading">
              <div>
                <span className="section-index">{t("home.ecosystem.index")}</span>
                <h2>
                  {t("home.ecosystem.titleLine1")}
                  <br />
                  <em>{t("home.ecosystem.titleLine2")}</em>
                </h2>
              </div>
              <p>{t("home.ecosystem.description")}</p>
            </div>
            <div className="role-grid">
              {ROLES.map((r, idx) => {
                const title = t(`home.ecosystem.roles.${r.key}.title`);
                return (
                  <article className="role-card" key={r.key}>
                    <div className="role-top">
                      <span>0{idx + 1}</span>
                      <r.icon aria-hidden="true" />
                    </div>
                    <h3>{title}</h3>
                    <ul>
                      {ROLE_ITEMS.map((item) => (
                        <li key={item}>
                          <Check size={15} aria-hidden="true" />
                          {t(`home.ecosystem.roles.${r.key}.${item}`)}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={primaryCta.to}
                      aria-label={
                        user ? primaryCta.label : t("home.ecosystem.loginAs", { role: title })
                      }
                    >
                      <ArrowUpRight />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Campus Photo Banner */}
        <section className="campus-section">
          <img
            src="/chdpu-campus.jpg"
            alt={t("home.campus.imageAlt")}
            onError={(e) => {
              // Rasm topilmasa — buzilgan rasm belgisi ko'rinmasin
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="campus-overlay" />
          <div className="campus-content">
            <span className="section-index light">{t("home.campus.index")}</span>
            <h2>
              {t("home.campus.line1")}
              <br />
              {t("home.campus.line2")}
              <br />
              <em>{t("home.campus.line3")}</em>
            </h2>
            <p>{t("home.campus.description")}</p>
            <Button asChild variant="secondary">
              <a
                href="https://cspu.uz/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2"
              >
                {t("home.campus.aboutUniversity")} <ArrowUpRight />
              </a>
            </Button>
          </div>
        </section>

        {/* CTA Band */}
        <section className="cta-band">
          <div className="container mx-auto px-4 cta-inner">
            <div>
              <span className="section-index">{t("home.ctaBand.index")}</span>
              <h2>
                {t("home.ctaBand.line1")}
                <br />
                {t("home.ctaBand.line2")}
              </h2>
            </div>
            <Button asChild size="lg">
              <Link to={primaryCta.to}>
                {primaryCta.label} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
