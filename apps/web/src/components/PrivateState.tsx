import { LayoutDashboard, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

/**
 * Shaxsiy amaliyot ma'lumotlari ochiq sahifada ko'rsatilmaydi — mehmonga kirish,
 * tizimga kirgan foydalanuvchiga esa o'z kabineti taklif qilinadi.
 */
export function PrivateState() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="private-state">
        <div className="state-icon">
          <LockKeyhole aria-hidden="true" />
        </div>
        <h3>{t("privateState.loginTitle")}</h3>
        <p>{t("privateState.loginText")}</p>
        <Button asChild size="lg" className="mt-4">
          <Link to="/login">{t("siteChrome.login")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="private-state">
      <div className="state-icon">
        <LayoutDashboard aria-hidden="true" />
      </div>
      <h3>{t("privateState.dashboardTitle")}</h3>
      <p>{t("privateState.dashboardText")}</p>
      <Button asChild size="lg" className="mt-4">
        <Link to={landingPathFor(user.role)}>{t("siteChrome.myDashboard")}</Link>
      </Button>
    </div>
  );
}
