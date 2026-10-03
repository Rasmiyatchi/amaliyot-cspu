"""Universitet vaqti — barcha "bugun" hisoblari Toshkent (UTC+5) bo'yicha.

Server UTC'da ishlaydi; `date.today()` yoki `datetime.now(UTC).date()` 00:00–05:00 orasida
kechagi sanani beradi (muddati o'tgan topshiriqlar, davomat foizi va h.k. bir kun siljiydi).
"""

from datetime import date, datetime, timedelta, timezone

UZB_TZ = timezone(timedelta(hours=5))


def today_uzb() -> date:
    return datetime.now(UZB_TZ).date()
