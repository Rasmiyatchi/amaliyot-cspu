import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "react-router-dom";

import { cn } from "@/lib/utils";

/** Birinchi yuklanishda bo'lim kodi kelguncha (route `HydrateFallback`). */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2
        className="h-6 w-6 animate-spin text-muted-foreground"
        aria-label={t("common.loading")}
      />
    </div>
  );
}

/**
 * Sahifalar orasida o'tishda yuqoridagi ingichka chiziq — keyingi bo'lim kodi yuklanayotganini
 * bildiradi (sekin internetda tugma "ishlamayapti" degan taassurot qolmasin).
 */
export function NavigationProgress() {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-200",
        busy ? "opacity-100" : "opacity-0",
      )}
    >
      {busy && <div className="nav-progress-bar h-full w-1/3 bg-primary" />}
    </div>
  );
}
