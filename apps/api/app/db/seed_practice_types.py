"""8 ta standart amaliyot turi seed — TZ + 4+2 sillabusga mos.

Bu seed har muhitda (dev/prod) ishlaydi — reference data.
Idempotent: code bo'yicha tekshirib, yo'qligini yaratadi.
"""

from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.practice_type import PracticeType

# ─── Baholash shablon'lari ────────────────────────────────

# 4+2 va pedagogik sillabus bo'yicha — 4 mezon, 100 ball
GRADING_4_PLUS_2: dict[str, Any] = {
    "min_total": 60,
    "criteria": [
        {"key": "attendance", "name": "Davomat", "max": 10, "grader": "system"},
        {"key": "events", "name": "Tadbirlar ishtiroki", "max": 20, "grader": "organization"},
        {"key": "tasks", "name": "O'quv topshiriqlar", "max": 60, "grader": "supervisor"},
        {"key": "defense", "name": "Hisobot himoyasi", "max": 10, "grader": "department_head"},
    ],
}

# Dala (tabiiy) amaliyotlari — tashkilotda tadbir yo'q, 3 mezon
GRADING_FIELD: dict[str, Any] = {
    "min_total": 60,
    "criteria": [
        {"key": "attendance", "name": "Davomat", "max": 20, "grader": "system"},
        {"key": "practical", "name": "Amaliy vazifalar", "max": 60, "grader": "supervisor"},
        {"key": "report", "name": "Hisobot", "max": 20, "grader": "department_head"},
    ],
}

# Pedagogik / malakaviy (umumiy) amaliyot — 4+2 ga o'xshash
GRADING_PEDAGOGICAL: dict[str, Any] = {
    "min_total": 60,
    "criteria": [
        {"key": "attendance", "name": "Davomat", "max": 10, "grader": "system"},
        {"key": "events", "name": "Tadbirlar ishtiroki", "max": 20, "grader": "organization"},
        {"key": "tasks", "name": "O'quv topshiriqlar", "max": 60, "grader": "supervisor"},
        {"key": "defense", "name": "Hisobot himoyasi", "max": 10, "grader": "department_head"},
    ],
}

# ─── 8 ta standart tur ────────────────────────────────────

DEFAULT_PRACTICE_TYPES: list[dict[str, Any]] = [
    {
        "code": "4_plus_2_school",
        "name": "4+2 amaliyoti (maktab)",
        "description": (
            "Pedagogik OTM 2-4 bosqich talabalari uchun 30 haftalik amaliyot. "
            "Haftasiga 2 kun umumiy o'rta ta'lim muassasasida. Umumiy: 300 soat, 10 kredit."
        ),
        "requires_contract": True,
        "contract_template_ref": "4_plus_2",
        "object_kind": "organization",
        "min_weeks": 30,
        "max_weeks": 30,
        "days_per_week": 2,
        "hours_per_day": 5,
        "allowed_courses": [2, 3, 4],
        "grading_rules": GRADING_4_PLUS_2,
        "display_order": 1,
    },
    {
        "code": "4_plus_2_mtt",
        "name": "4+2 amaliyoti (MTT va maxsus pedagoglar)",
        "description": (
            "Maktabgacha ta'lim muassasalari (MTT) va maxsus pedagogika yo'nalishlari uchun "
            "4+2 tartibidagi 30 haftalik amaliyot."
        ),
        "requires_contract": True,
        "contract_template_ref": "4_plus_2",
        "object_kind": "organization",
        "min_weeks": 30,
        "max_weeks": 30,
        "days_per_week": 2,
        "hours_per_day": 5,
        "allowed_courses": [2, 3, 4],
        "grading_rules": GRADING_4_PLUS_2,
        "display_order": 2,
    },
    {
        "code": "field_general",
        "name": "Malakaviy amaliyot (dala)",
        "description": (
            "Tabiiy yo'nalishlar uchun 1-2 haftalik dala amaliyoti. "
            "Shartnoma talab etilmaydi, hudud biriktiriladi (masalan Chimyon tog'i)."
        ),
        "requires_contract": False,
        "contract_template_ref": None,
        "object_kind": "area",
        "min_weeks": 1,
        "max_weeks": 2,
        "days_per_week": None,
        "hours_per_day": None,
        "allowed_courses": [1, 2],
        "grading_rules": GRADING_FIELD,
        "display_order": 3,
    },
    {
        "code": "field_zoology",
        "name": "Malakaviy amaliyot (zoologiya)",
        "description": "Zoologiya yo'nalishi uchun 1-2 haftalik dala amaliyoti.",
        "requires_contract": False,
        "contract_template_ref": None,
        "object_kind": "area",
        "min_weeks": 1,
        "max_weeks": 2,
        "days_per_week": None,
        "hours_per_day": None,
        "allowed_courses": [1, 2],
        "grading_rules": GRADING_FIELD,
        "display_order": 4,
    },
    {
        "code": "field_botany",
        "name": "Malakaviy amaliyot (botanika)",
        "description": "Botanika yo'nalishi uchun 1-2 haftalik dala amaliyoti.",
        "requires_contract": False,
        "contract_template_ref": None,
        "object_kind": "area",
        "min_weeks": 1,
        "max_weeks": 2,
        "days_per_week": None,
        "hours_per_day": None,
        "allowed_courses": [1, 2],
        "grading_rules": GRADING_FIELD,
        "display_order": 5,
    },
    {
        "code": "plein_air",
        "name": "Malakaviy (plener) amaliyot",
        "description": (
            "Tasviriy san'at yo'nalishlari uchun 1-4 haftalik plener amaliyoti. "
            "Ochiq havoda natura bilan ishlash."
        ),
        "requires_contract": False,
        "contract_template_ref": None,
        "object_kind": "area",
        "min_weeks": 1,
        "max_weeks": 4,
        "days_per_week": None,
        "hours_per_day": None,
        "allowed_courses": [1, 2],
        "grading_rules": GRADING_FIELD,
        "display_order": 6,
    },
    {
        "code": "pedagogical",
        "name": "Pedagogik amaliyot (bitiruvchi)",
        "description": (
            "Bitiruvchi kurslar uchun 2-15 haftalik pedagogik amaliyot. "
            "Maktab yoki boshqa ta'lim tashkilotlarida shartnoma asosida."
        ),
        "requires_contract": True,
        "contract_template_ref": "pedagogical",
        "object_kind": "organization",
        "min_weeks": 2,
        "max_weeks": 15,
        "days_per_week": None,
        "hours_per_day": None,
        "allowed_courses": [4],
        "grading_rules": GRADING_PEDAGOGICAL,
        "display_order": 7,
    },
    {
        "code": "qualifying_general",
        "name": "Malakaviy amaliyot (umumiy)",
        "description": (
            "Barcha kurslarda mavjud 1-8 haftalik malakaviy amaliyot. "
            "Maktab yoki tashkilotlarda, shartnoma bilan."
        ),
        "requires_contract": True,
        "contract_template_ref": "qualifying",
        "object_kind": "any",
        "min_weeks": 1,
        "max_weeks": 8,
        "days_per_week": None,
        "hours_per_day": None,
        "allowed_courses": [1, 2, 3, 4],
        "grading_rules": GRADING_PEDAGOGICAL,
        "display_order": 8,
    },
]


async def ensure_practice_types(db: AsyncSession) -> None:
    """8 ta standart amaliyot turini tekshiradi, yo'qligini yaratadi."""
    existing_codes: set[str] = set((await db.execute(select(PracticeType.code))).scalars().all())

    created = 0
    for data in DEFAULT_PRACTICE_TYPES:
        if data["code"] in existing_codes:
            continue
        pt = PracticeType(**data)
        db.add(pt)
        created += 1
        logger.info(f"📚 PracticeType yaratildi: {pt.code} — {pt.name}")

    if created:
        await db.commit()
