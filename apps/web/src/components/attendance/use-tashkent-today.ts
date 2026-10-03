import { useEffect, useState } from "react";

import {
  msUntilNextTashkentMidnight,
  todayStr,
} from "@/components/attendance/attendance-date-utils";
import type { ISODate } from "@/lib/api/types";

/** Taymer yarim tundan biroz erta uyg'onsa ham yangi kun aniq boshlangan bo'lsin. */
const MIDNIGHT_SLACK_MS = 1000;

/**
 * Toshkent bo'yicha bugungi sana (YYYY-MM-DD). Yarim tunda, shuningdek oyna/ilova qayta
 * faollashganda (fon rejimida taymerlar to'xtab qolishi mumkin) yangilanadi.
 */
export function useTashkentToday(): ISODate {
  const [today, setToday] = useState<ISODate>(todayStr);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sync = () => {
      setToday(todayStr());
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(sync, msUntilNextTashkentMidnight() + MIDNIGHT_SLACK_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };

    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return today;
}
