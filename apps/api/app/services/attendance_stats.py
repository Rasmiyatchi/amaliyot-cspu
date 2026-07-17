"""Davomat foizini hisoblash — yagona manba.

Bugungacha bo'lgan XATO: maxraj sifatida mavjud `attendance_days` yozuvlari soni
olinardi. Ya'ni talaba 30 kundan faqat 3 kun kelib, uchalasi ham tasdiqlansa —
3/3 = 100% chiqardi. Umuman kelmagan talaba esa 0 ta yozuv bilan "—" bo'lib turardi.

TO'G'RISI: maxraj — biriktirishda belgilangan majburiy hafta kunlariga
(`PracticeAssignment.required_weekdays`) tushadigan, BUGUNGACHA bo'lgan kunlar soni.
Kelajakdagi kunlar hisobga olinmaydi — talaba hali kelmagan kunni qoldirgan deb bo'lmaydi.

Kunlari belgilanmagan eski biriktirishlar uchun eski xatti-harakat saqlanadi
(maxraj = mavjud yozuvlar), aks holda ular birdan 0% bo'lib ketardi.
"""

from datetime import date, timedelta

__all__ = ["expected_days", "compute_percent"]


def expected_days(
    start: date,
    end: date,
    weekdays: list[int] | None,
    *,
    upto: date | None = None,
    since: date | None = None,
) -> int | None:
    """[start, min(end, upto)] oralig'ida `weekdays` ga tushadigan kunlar soni.

    weekdays — ISO raqamlash (1=Dushanba ... 7=Yakshanba). Bo'sh yoki None bo'lsa
    None qaytaradi — chaqiruvchi eski (yozuvlar soniga asoslangan) yo'lga tushadi.
    since — berilsa, oraliq boshi shu sanadan kechikmaydi (masalan "oxirgi 30 kun").
    """
    if not weekdays:
        return None

    first = max(start, since) if since else start
    last = min(end, upto or date.today())
    if last < first:
        return 0

    wanted = set(weekdays)
    total = (last - first).days + 1
    full_weeks, remainder = divmod(total, 7)
    count = full_weeks * len(wanted)
    # Qolgan (7 dan kam) kunlarni birma-bir sanaymiz — ko'pi bilan 6 ta iteratsiya.
    for i in range(remainder):
        if (first + timedelta(days=full_weeks * 7 + i)).isoweekday() in wanted:
            count += 1
    return count


def compute_percent(
    *,
    green: int,
    record_total: int,
    start: date,
    end: date,
    weekdays: list[int] | None,
    upto: date | None = None,
    since: date | None = None,
) -> int | None:
    """Davomat foizi. Hisoblab bo'lmasa (amaliyot hali boshlanmagan) None.

    green — tasdiqlangan (yashil) kunlar soni.
    record_total — mavjud yozuvlar soni; faqat `weekdays` belgilanmaganda maxraj bo'ladi.
    """
    denominator = expected_days(start, end, weekdays, upto=upto, since=since)
    if denominator is None:
        denominator = record_total
    if not denominator:
        return None
    # Majburiy bo'lmagan kunda ham kelib tasdiqlansa 100% dan oshib ketmasin.
    return min(100, round(green / denominator * 100))
