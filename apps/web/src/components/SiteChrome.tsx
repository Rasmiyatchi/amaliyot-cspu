import { useEffect, useState } from "react";
import { ArrowUpRight, LogOut, Menu, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ProfileDialog } from "@/components/profile-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/lib/auth-api";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

const NAV_LINKS = [
  { to: "/", labelKey: "siteChrome.nav.home" },
  { to: "/amaliyot", labelKey: "siteChrome.nav.practice" },
  { to: "/yoriqnoma", labelKey: "siteChrome.nav.guide" },
  { to: "/faq", labelKey: "siteChrome.nav.faq" },
] as const;

export function SiteHeader() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Sahifa o'zgarganda menyuni avtomatik yopish. Body scroll'ini Radix Dialog o'zi bloklaydi —
  // qo'lda `overflow` yozish uning tiklash tartibi bilan to'qnashib, sahifani qotirib qo'yardi.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <>
      {/* `.site-header` — sticky, z-40: mobil drawer overlay'i (z-50) uni ham qoplaydi */}
      <header className="site-header">
        <div className="site-header-inner">
          {/* Logo / Brand */}
          <Link to="/" className="brand shrink-0">
            <img src="/chdpu-logo.png" alt="CHDPU" className="brand-img" />
            <span className="brand-divider" />
            <span className="brand-label">
              {t("siteChrome.brandTitle")}
              <span>{t("siteChrome.brandSubtitle")}</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="nav-links hidden md:flex" aria-label={t("siteChrome.mainNavigation")}>
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={location.pathname === item.to ? "active" : ""}
                aria-current={location.pathname === item.to ? "page" : undefined}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="header-actions hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 font-semibold"
                  onClick={() => setProfileOpen(true)}
                  title={t("rootLayout.myProfile")}
                >
                  <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{user.first_name}</span>
                </Button>
                <Button asChild size="sm" className="header-login">
                  <Link to={landingPathFor(user.role)}>
                    {t("siteChrome.myDashboard")} <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-500 hover:text-red-600"
                  onClick={handleLogout}
                  title={t("rootLayout.logout")}
                  aria-label={t("rootLayout.logout")}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button asChild className="header-login" size="sm">
                <Link to="/login">
                  {t("siteChrome.login")} <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Right Controls: Faqat toza minimal tugmalar va Gamburger */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-foreground hover:bg-muted"
                  aria-label={open ? t("siteChrome.closeMenu") : t("siteChrome.openMenu")}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                aria-describedby={undefined}
                className="w-[85vw] max-w-[360px] p-0 flex flex-col justify-between bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800"
              >
                <div className="p-6 flex flex-col gap-5 overflow-y-auto">
                  {/* Sarlavha & Logo */}
                  <SheetTitle className="flex items-center gap-3 pb-3 pr-6 border-b border-slate-100 dark:border-slate-800 text-left">
                    <img src="/chdpu-logo.png" alt="" className="h-8 w-auto object-contain" />
                    <span className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                        {t("siteChrome.drawerBrand")}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold tracking-wider">
                        {t("siteChrome.brandSubtitle")}
                      </span>
                    </span>
                  </SheetTitle>

                  {/* Foydalanuvchi statusi / Kirish bloki */}
                  {user ? (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-3.5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-white font-bold text-sm shadow-xs">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              (user.first_name[0] ?? "?").toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{user.full_name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {t(`userRoles.${user.role}`)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-3 shrink-0 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          onClick={() => {
                            setOpen(false);
                            setProfileOpen(true);
                          }}
                        >
                          {t("rootLayout.myProfile")}
                        </Button>
                      </div>
                      <Button asChild className="w-full justify-center gap-2 font-bold h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm" size="sm">
                        <Link to={landingPathFor(user.role)} onClick={() => setOpen(false)}>
                          {t("siteChrome.myDashboard")} <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Button asChild className="w-full justify-center gap-2 font-bold h-11 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md" size="default">
                        <Link to="/login" onClick={() => setOpen(false)}>
                          {t("siteChrome.login")} <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )}

                  {/* Navigatsiya havolalari */}
                  <nav className="space-y-1.5 pt-1" aria-label={t("siteChrome.mainNavigation")}>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">
                      {t("siteChrome.sections")}
                    </span>
                    {NAV_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        aria-current={location.pathname === item.to ? "page" : undefined}
                        className={`flex items-center h-11 px-4 rounded-xl text-base font-semibold transition-all ${
                          location.pathname === item.to
                            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        {t(item.labelKey)}
                      </Link>
                    ))}
                  </nav>
                </div>

                {/* Pastki sozlamalar: Til va Chiqish */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t("common.language")}:
                    </span>
                    <LanguageSwitcher />
                  </div>

                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 gap-1.5 h-9 px-3 rounded-lg font-semibold"
                      onClick={() => {
                        setOpen(false);
                        void handleLogout();
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t("rootLayout.logout")}</span>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {user && (
        <ProfileDialog
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="site-footer">
      <div className="container mx-auto px-4 footer-inner">
        <div>
          <div className="footer-name">
            CHDPU<span> / </span>
            {t("siteChrome.footerProduct")}
          </div>
          <p>
            {t("siteChrome.footerUniversity")}
            <br />
            {t("siteChrome.footerTagline")}
          </p>
        </div>
        <nav className="footer-links" aria-label={t("siteChrome.footerNavigation")}>
          {NAV_LINKS.map((item) => (
            <Link key={item.to} to={item.to}>
              {t(item.labelKey)}
            </Link>
          ))}
          <a
            href="https://cspu.uz/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1"
          >
            {t("siteChrome.university")} <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </nav>
      </div>
      <div className="container mx-auto px-4 footer-bottom">
        <span>{t("siteChrome.rights", { year: new Date().getFullYear() })}</span>
        <span>{t("siteChrome.location")}</span>
      </div>
    </footer>
  );
}
