import { ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { landingPathFor } from "@/lib/routing";
import { useAuthStore } from "@/stores/auth";

const ITEMS = ["practiceSearch.item1", "practiceSearch.item2", "practiceSearch.item3"] as const;

/**
 * Bosh sahifadagi "Amaliyotingizni toping" bloki. Amaliyot yozuvlari shaxsiy ma'lumot —
 * ochiq qidiruv yo'q, shuning uchun soxta qidiruv maydoni o'rniga kabinetga yo'l ko'rsatiladi.
 */
export function PracticeSearch() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <ul className="grid min-w-0 gap-1.5 text-sm text-muted-foreground">
        {ITEMS.map((key) => (
          <li key={key} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <Button asChild size="lg" className="shrink-0">
        <Link to={user ? landingPathFor(user.role) : "/login"}>
          {user ? t("siteChrome.myDashboard") : t("siteChrome.login")} <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
