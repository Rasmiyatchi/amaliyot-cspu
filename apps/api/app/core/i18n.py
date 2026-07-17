"""Backend xato xabarlarini tarjima qilish (Accept-Language: ru).

Xabarlar kodda o'zbekcha yoziladi (asosiy til). Frontend `Accept-Language: ru`
yuborsa, HTTPException detail'i shu katalog orqali ruschaga o'giriladi:

  1. EXACT — aniq moslik (statik xabarlar).
  2. PATTERNS — f-string bilan qurilgan dinamik xabarlar uchun regex shablonlar;
     named group'lar rus shabloniga {name} bo'lib qo'yiladi.

Katalogda yo'q xabar o'zbekcha qaytadi — xavfsiz default. Yangi HTTPException
qo'shganda shu katalogga ham qo'shish shart (test_i18n_catalog qamrovni kuzatadi).
Katalogning o'zi: app/core/i18n_catalog.py (generatsiya qilingan, tartiblangan).
"""

import re

from app.core.i18n_catalog import EXACT, PATTERNS

_COMPILED: list[tuple[re.Pattern[str], str]] = [
    (re.compile(pattern), template) for pattern, template in PATTERNS
]


def pick_lang(accept_language: str | None) -> str:
    """Accept-Language header'idan qo'llab-quvvatlanadigan tilni tanlaydi."""
    if accept_language and accept_language.strip().lower().startswith("ru"):
        return "ru"
    return "uz"


def translate_detail(detail: str, lang: str) -> str:
    """Xato matnini so'ralgan tilga o'giradi. Topilmasa — asl matn."""
    if lang != "ru" or not isinstance(detail, str):
        return detail

    exact = EXACT.get(detail)
    if exact is not None:
        return exact

    for pattern, template in _COMPILED:
        m = pattern.fullmatch(detail)
        if m:
            try:
                return template.format(**m.groupdict())
            except (KeyError, IndexError):
                return detail
    return detail
