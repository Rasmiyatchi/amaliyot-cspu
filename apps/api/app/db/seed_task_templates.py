"""Task template seed — 4+2 sillabusidan topshiriqlar.

Hozircha faqat 4+2 (maktab) amaliyoti uchun. Boshqalari keyinroq.
Idempotent: slot (practice_type + course + semester + category + display_order)
bo'yicha tekshiriladi.
"""

from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import Semester, TaskCategory, TaskType
from app.models.practice_type import PracticeType
from app.models.task import TaskTemplate

TEMPLATES_4PLUS2: list[dict[str, Any]] = [
    # ─── 3-KURS · KUZGI · Ma'naviy (20 ball) ─────────────────
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 1,
        "type": TaskType.PROTOCOL,
        "title": "Konferensiyada ishtirok va amaliyot guruhi bayonnomasi",
        "points": 2,
        "month_hint": "oktyabr",
        "description": (
            "O'quv amaliyotini o'tkazish bo'yicha konferensiyada ishtirok etish. "
            "Biriktirilgan amaliyot rahbari, bajariladigan ishlarning umumiy "
            "rejasi bilan tanishish. Bayonnoma tayyorlash."
        ),
    },
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 2,
        "type": TaskType.ESSAY,
        "title": "100 so'zli ESSE — ta'lim muassasasi bilan tanishish",
        "points": 4,
        "month_hint": "oktyabr",
        "description": (
            "Ta'lim muassasasi va pedagogik jamoa bilan tanishish, ichki tartib qoidalari "
            "bilan tanishish. 100 so'zdan iborat ESSE yozish."
        ),
    },
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 3,
        "type": TaskType.PLAN,
        "title": "Shaxsiy tadbir rejasi",
        "points": 4,
        "month_hint": "oktyabr",
        "description": (
            "Maktabning ma'naviy-ma'rifiy ishlari bo'yicha tadbirlar rejasi bilan tanishish "
            "va nusxalarini olish. Shaxsiy tadbir rejasini tuzish."
        ),
    },
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 4,
        "type": TaskType.EVENT_SCENARIO,
        "title": "8-dekabr Konstitutsiya kuni tadbiri ssenariysi",
        "points": 5,
        "month_hint": "dekabr",
        "description": (
            "8-dekabr Konstitutsiya kuniga bag'ishlangan tadbirda ishtirok etish. "
            "Tadbir ssenariysini tuzish, biriktirilgan sinflarda ishlash."
        ),
    },
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 5,
        "type": TaskType.PROTOCOL,
        "title": "Ota-onalar yig'ilishi bayonnomasi",
        "points": 5,
        "month_hint": "noyabr",
        "description": (
            "Ota-onalar yig'ilishida qatnashish (sinf rahbari ishtirokida). "
            "Yig'ilish bayonnomasini tayyorlash."
        ),
    },
    # ─── 3-KURS · KUZGI · O'quv ishlari (60 ball) ────────────
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 1,
        "type": TaskType.LESSON_ANALYSIS_BATCH,
        "title": "Fan o'qituvchisi darsini tahlil qilish (12 ta)",
        "points": 24,
        "quantity": 12,
        "month_hint": "oktyabr-dekabr",
        "description": (
            "Fan o'qituvchisining darsini kuzatish, tahlil qilish. "
            "Har chorakda 6 ta (jami 12 ta) dars tahlili."
        ),
    },
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 2,
        "type": TaskType.TEST_LESSON,
        "title": "Mutaxassislik fanidan sinov darsi (2 ta)",
        "points": 12,
        "quantity": 2,
        "month_hint": "oktyabr, dekabr",
        "description": "Mutaxassislik fanidan sinov darsini o'tish. Har chorakda 1 ta (jami 2 ta).",
    },
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 3,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "Maktab oshxonasida gigiyena me'yorlari — tahliliy ma'lumotnoma",
        "points": 5,
        "month_hint": "noyabr",
        "description": (
            "Maktab oshxonasida gigiyena me'yorlarini o'rganish. "
            "Tanqidiy-tahliliy ma'lumotnoma tayyorlash."
        ),
    },
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 4,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "Maktab dars jadvali tuzilishi — tahliliy ma'lumot",
        "points": 5,
        "month_hint": "dekabr",
        "description": (
            "Maktab dars jadvali va uning tuzilishi, "
            "unga qo'yiladigan talablarini o'rganish."
        ),
    },
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 5,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "Sinf xonalarida sanitariya-gigiyena me'yorlari",
        "points": 4,
        "month_hint": "noyabr",
        "description": (
            "Maktab sinf xonalarida sanitariya-gigiyena me'yorlarini o'rganish. "
            "Tahliliy ma'lumotnoma."
        ),
    },
    {
        "course": 3,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 6,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "Past o'zlashtiruvchi o'quvchilar bilan ish jarayoni",
        "points": 10,
        "month_hint": "dekabr",
        "description": (
            "Biriktirilgan sinfda fanlarni o'zlashtirishi past bo'lgan "
            "o'quvchilar bilan o'qituvchining ish jarayonini o'rganish."
        ),
    },
    # ─── 3-KURS · BAHORGI · Ma'naviy (20 ball) ───────────────
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 1,
        "type": TaskType.EVENT_SCENARIO,
        "title": "8-mart Xalqaro xotin-qizlar kuni tadbiri",
        "points": 5,
        "month_hint": "mart",
    },
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 2,
        "type": TaskType.EVENT_SCENARIO,
        "title": "21-mart Navro'z bayrami tadbiri",
        "points": 5,
        "month_hint": "mart",
    },
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 3,
        "type": TaskType.EVENT_SCENARIO,
        "title": "9-may Xotira va qadrlash kuni tadbiri",
        "points": 5,
        "month_hint": "may",
    },
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 4,
        "type": TaskType.EVENT_SCENARIO,
        "title": '"ZAKOVAT" intellektual tanlovi',
        "points": 5,
        "month_hint": "aprel",
        "description": "Biriktirilgan sinf o'quvchilari ishtirokida tanlov o'tkazish.",
    },
    # ─── 3-KURS · BAHORGI · O'quv ishlari (60 ball) ──────────
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 1,
        "type": TaskType.LESSON_ANALYSIS_BATCH,
        "title": "Fan o'qituvchisi darsini tahlil qilish (12 ta)",
        "points": 24,
        "quantity": 12,
        "month_hint": "fevral-may",
    },
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 2,
        "type": TaskType.TEST_LESSON,
        "title": "Mutaxassislik fanidan sinov darsi (2 ta)",
        "points": 12,
        "quantity": 2,
        "month_hint": "fevral, aprel",
    },
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 3,
        "type": TaskType.INTERACTIVE_PACK,
        "title": "Interfaol metodlar — topshiriqlar to'plami (2 ta)",
        "points": 8,
        "quantity": 2,
        "month_hint": "fevral, may",
        "description": "Klaster, Venn diagrammasi, Aqliy hujum, Muammoli vaziyat.",
    },
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 4,
        "type": TaskType.PRESENTATION,
        "title": "Maktab kutubxonasi — prezentatsiya",
        "points": 3,
        "month_hint": "mart",
        "description": "Darsliklar, elektron resurslar hamda fan xonalari jihozlanishi.",
    },
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 5,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "eMaktab.uz platformasi — ma'lumot",
        "points": 5,
        "month_hint": "aprel",
    },
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 6,
        "type": TaskType.PLAN,
        "title": "Fan to'garagi ish rejasi",
        "points": 3,
        "month_hint": "fevral",
    },
    {
        "course": 3,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 7,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "Baholash mezonlari (ChsB, BSB, formativ/summativ)",
        "points": 5,
        "month_hint": "mart",
    },
    # ─── 4-KURS · KUZGI · Ma'naviy (20 ball) ─────────────────
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 1,
        "type": TaskType.PROTOCOL,
        "title": "Konferensiya + amaliyot guruhi bayonnomasi",
        "points": 2,
        "month_hint": "oktyabr",
    },
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 2,
        "type": TaskType.ESSAY,
        "title": "100 so'zli ESSE",
        "points": 4,
        "month_hint": "oktyabr",
    },
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 3,
        "type": TaskType.PLAN,
        "title": "Shaxsiy tadbir rejasi",
        "points": 4,
        "month_hint": "oktyabr",
    },
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 4,
        "type": TaskType.EVENT_SCENARIO,
        "title": "8-dekabr Konstitutsiya kuni tadbiri",
        "points": 5,
        "month_hint": "dekabr",
    },
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 5,
        "type": TaskType.PROTOCOL,
        "title": "Ota-onalar yig'ilishi bayonnomasi",
        "points": 5,
        "month_hint": "noyabr",
    },
    # ─── 4-KURS · KUZGI · O'quv ishlari (60 ball) ────────────
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 1,
        "type": TaskType.LESSON_ANALYSIS_BATCH,
        "title": "Fan o'qituvchisi darsini tahlil qilish (20 ta)",
        "points": 20,
        "quantity": 20,
        "month_hint": "oktyabr-dekabr",
    },
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 2,
        "type": TaskType.TEST_LESSON,
        "title": "Mutaxassislik fanidan sinov darsi (3 ta)",
        "points": 12,
        "quantity": 3,
        "month_hint": "oktyabr, noyabr, dekabr",
    },
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 3,
        "type": TaskType.OPEN_LESSON,
        "title": "Mutaxassislik fanidan ochiq dars (2 ta)",
        "points": 12,
        "quantity": 2,
        "month_hint": "oktyabr, noyabr",
    },
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 4,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "Sanitar-gigiyenik me'yorlar (oshxona, sinf xonasi)",
        "points": 6,
        "month_hint": "noyabr",
    },
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 5,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "Maktab dars jadvali tuzilishi",
        "points": 6,
        "month_hint": "dekabr",
    },
    {
        "course": 4,
        "semester": Semester.FALL,
        "category": TaskCategory.ACADEMIC,
        "display_order": 6,
        "type": TaskType.INTERACTIVE_PACK,
        "title": "Interfaol metodlar — topshiriqlar to'plami (1 ta)",
        "points": 4,
        "quantity": 1,
        "month_hint": "dekabr",
    },
    # ─── 4-KURS · BAHORGI · Ma'naviy (20 ball) ──────────────
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 1,
        "type": TaskType.EVENT_SCENARIO,
        "title": "8-mart tadbiri",
        "points": 5,
        "month_hint": "mart",
    },
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 2,
        "type": TaskType.EVENT_SCENARIO,
        "title": "21-mart Navro'z tadbiri",
        "points": 5,
        "month_hint": "mart",
    },
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 3,
        "type": TaskType.EVENT_SCENARIO,
        "title": "9-may Xotira kuni tadbiri",
        "points": 5,
        "month_hint": "may",
    },
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.SPIRITUAL,
        "display_order": 4,
        "type": TaskType.EVENT_SCENARIO,
        "title": "Kasbga yo'naltirish tadbiri",
        "points": 5,
        "month_hint": "aprel",
    },
    # ─── 4-KURS · BAHORGI · O'quv ishlari (60 ball) ──────────
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 1,
        "type": TaskType.LESSON_ANALYSIS_BATCH,
        "title": "Fan o'qituvchisi darsini tahlil qilish (20 ta)",
        "points": 20,
        "quantity": 20,
        "month_hint": "fevral-may",
    },
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 2,
        "type": TaskType.TEST_LESSON,
        "title": "Mutaxassislik fanidan sinov darsi (3 ta)",
        "points": 12,
        "quantity": 3,
        "month_hint": "fevral, aprel, may",
    },
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 3,
        "type": TaskType.OPEN_LESSON,
        "title": "Mutaxassislik fanidan ochiq dars (2 ta)",
        "points": 12,
        "quantity": 2,
        "month_hint": "fevral, aprel",
    },
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 4,
        "type": TaskType.INTERACTIVE_PACK,
        "title": "Interfaol metodlar — topshiriqlar to'plami (2 ta)",
        "points": 8,
        "quantity": 2,
        "month_hint": "mart, may",
    },
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 5,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "eMaktab.uz platformasi",
        "points": 4,
        "month_hint": "aprel",
    },
    {
        "course": 4,
        "semester": Semester.SPRING,
        "category": TaskCategory.ACADEMIC,
        "display_order": 6,
        "type": TaskType.ANALYTICAL_NOTE,
        "title": "Baholash mezonlari (ChsB, BSB, formativ/summativ)",
        "points": 4,
        "month_hint": "mart",
    },
]


async def ensure_task_templates(db: AsyncSession) -> None:
    """4+2 sillabus topshiriqlarini seed qiladi."""
    pt = (
        await db.execute(
            select(PracticeType).where(PracticeType.code == "4_plus_2_school")
        )
    ).scalar_one_or_none()
    if not pt:
        logger.warning(
            "PracticeType '4_plus_2_school' topilmadi — "
            "task template seed o'tkazilmaydi"
        )
        return

    existing_slots = {
        (r[0], r[1], r[2], r[3])
        for r in (
            await db.execute(
                select(
                    TaskTemplate.course,
                    TaskTemplate.semester,
                    TaskTemplate.category,
                    TaskTemplate.display_order,
                ).where(TaskTemplate.practice_type_id == pt.id)
            )
        ).all()
    }

    created = 0
    for data in TEMPLATES_4PLUS2:
        slot = (data["course"], data["semester"], data["category"], data["display_order"])
        if slot in existing_slots:
            continue
        template = TaskTemplate(practice_type_id=pt.id, **data)
        db.add(template)
        created += 1

    if created:
        await db.commit()
        logger.success(f"📚 {created} ta task template yaratildi (4+2)")
    else:
        logger.debug("Task template'lar allaqachon mavjud")
