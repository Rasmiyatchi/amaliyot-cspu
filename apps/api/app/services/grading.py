"""Yakuniy baho — 100 ballik tizim, sillabus mezonlari asosida.

Bugungacha `practice_types.grading_rules` JSONB faqat konfiguratsiya sifatida
saqlanardi — uni HECH BIR kod o'qimasdi, `final_grade` esa qo'lda PATCH qilinadigan
bo'sh son edi. Bu modul o'sha bo'shliqni to'ldiradi.

Mezon qanday baholanadi (12.07 qarori: yakuniy hisobotni biriktirilgan amaliyot
rahbari baholaydi, tizim yakunda umumiy ballni chiqaradi):

  * grader="system"  → AVTOMATIK, davomat foizidan (pastdagi shkala).
  * "tasks"/"practical" → AVTOMATIK, supervizor har topshiriqqa qo'ygan ballardan
    (Task.points_earned) — ikki marta baholash shart emas.
  * qolgani (tadbirlar, hisobot himoyasi) → QO'LDA, `criteria_scores` JSONB da.

Davomat shkalasi — CLAUDE.md sillabusi (10 ballik mezon uchun):
    90-100% → 10 · 70-80% → 5 · 60-70% → 3 · <60% → 0
Shkala max ga NISBATAN ulush sifatida saqlanadi, chunki mezon max'i turlicha
bo'lishi mumkin (4+2 da davomat 10 ball, dala amaliyotida 20 ball).
DIQQAT: sillabusda 80-90% oralig'i ko'rsatilmagan — 0.7 (10 ballik mezonda 7)
qilib olindi, monoton bo'lishi uchun.
"""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import AttendanceDay
from app.models.enums import AssignmentStatus, AttendanceDayStatus, UserRole
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.supervisor import Supervisor
from app.models.task import Task, TaskTemplate
from app.models.user import User
from app.services.attendance_stats import compute_percent

# Topshiriq ballaridan avtomatik hisoblanadigan mezon kalitlari (seed'dagi nomlar).
# Admin grading_rules'ga boshqa kalit qo'shsa — u qo'lda baholanadi (xavfsiz default).
TASK_CRITERION_KEYS = frozenset({"tasks", "practical"})

# (eng kam foiz, max'dan ulush) — kamayish tartibida.
_ATTENDANCE_BANDS: list[tuple[int, float]] = [
    (90, 1.0),
    (80, 0.7),
    (70, 0.5),
    (60, 0.3),
]


def attendance_score(percent: int | None, max_points: int) -> int:
    """Davomat foizini mezon ballariga o'giradi."""
    if percent is None:
        return 0
    for threshold, share in _ATTENDANCE_BANDS:
        if percent >= threshold:
            return round(max_points * share)
    return 0


def _criteria_of(pt: PracticeType) -> list[dict[str, Any]]:
    rules = pt.grading_rules or {}
    criteria = rules.get("criteria") or []
    return [c for c in criteria if isinstance(c, dict) and c.get("key")]


def _min_total(pt: PracticeType) -> int:
    return int((pt.grading_rules or {}).get("min_total") or 0)


def is_auto(criterion: dict[str, Any]) -> bool:
    return criterion.get("grader") == "system" or criterion["key"] in TASK_CRITERION_KEYS


async def compute_breakdown(db: AsyncSession, assignment_id: UUID) -> dict[str, Any]:
    """Mezonlar bo'yicha ball tarkibi. Hech nima saqlamaydi — faqat hisoblaydi."""
    asn = await db.get(PracticeAssignment, assignment_id)
    if not asn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Biriktirish topilmadi: {assignment_id}")
    pt = await db.get(PracticeType, asn.practice_type_id)
    if not pt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Amaliyot turi topilmadi")

    # Davomat
    att_rows = (
        await db.execute(
            select(AttendanceDay.status, func.count(AttendanceDay.id))
            .where(AttendanceDay.assignment_id == assignment_id)
            .group_by(AttendanceDay.status)
        )
    ).all()
    att = {s.value: 0 for s in AttendanceDayStatus}
    for s, c in att_rows:
        att[s.value] = c
    att_percent = compute_percent(
        green=att["green"],
        record_total=sum(att.values()),
        start=asn.start_date,
        end=asn.end_date,
        weekdays=asn.required_weekdays,
    )

    # Topshiriq ballari
    task_row = (
        await db.execute(
            select(
                func.coalesce(func.sum(Task.points_earned), 0),
                func.coalesce(func.sum(TaskTemplate.points), 0),
            )
            .join(TaskTemplate, TaskTemplate.id == Task.template_id)
            .where(Task.assignment_id == assignment_id)
        )
    ).first()
    task_earned = int(task_row[0]) if task_row else 0
    task_max = int(task_row[1]) if task_row else 0

    manual = asn.criteria_scores or {}
    out: list[dict[str, Any]] = []
    for c in _criteria_of(pt):
        key = str(c["key"])
        cmax = int(c.get("max") or 0)
        entry: dict[str, Any] = {
            "key": key,
            "name": c.get("name") or key,
            "max": cmax,
            "grader": c.get("grader"),
            "auto": is_auto(c),
        }
        if c.get("grader") == "system":
            entry["score"] = attendance_score(att_percent, cmax)
            entry["detail"] = (
                f"{att_percent}% davomat" if att_percent is not None else "Davomat ma'lumoti yo'q"
            )
        elif key in TASK_CRITERION_KEYS:
            # Topshiriq ballari mezon max'iga normallashtiriladi
            entry["score"] = round(task_earned / task_max * cmax) if task_max else 0
            entry["detail"] = f"Topshiriqlar: {task_earned}/{task_max} ball"
        else:
            score = manual.get(key)
            entry["score"] = int(score) if score is not None else None
            entry["detail"] = None
        out.append(entry)

    missing = [c["key"] for c in out if c["score"] is None]
    total = sum(c["score"] or 0 for c in out)
    min_total = _min_total(pt)

    return {
        "assignment_id": str(assignment_id),
        "practice_type_name": pt.name,
        "criteria": out,
        "total": total,
        "max_total": sum(c["max"] for c in out),
        "min_total": min_total,
        "passed": total >= min_total if min_total else None,
        "missing_criteria": missing,
        "complete": not missing,
        "attendance_percent": att_percent,
        "final_grade": asn.final_grade,
        "credit_earned": asn.credit_earned,
        "status": asn.status.value,
    }


async def authorize(db: AsyncSession, assignment_id: UUID, user: User) -> PracticeAssignment:
    """Admin/Super Admin — hammasi. Supervizor — faqat o'ziga biriktirilgan talaba."""
    asn = await db.get(PracticeAssignment, assignment_id)
    if not asn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Biriktirish topilmadi: {assignment_id}")
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return asn
    if user.role != UserRole.SUPERVISOR:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Baholashga ruxsat yo'q")
    owns = (
        await db.execute(
            select(Supervisor.id).where(
                Supervisor.id == asn.supervisor_id, Supervisor.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if not owns:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Bu talaba sizga biriktirilmagan"
        )
    return asn


async def set_criterion_score(
    db: AsyncSession, assignment_id: UUID, key: str, score: int, user: User
) -> dict[str, Any]:
    """Qo'lda baholanadigan mezonga ball qo'yadi."""
    asn = await authorize(db, assignment_id, user)
    pt = await db.get(PracticeType, asn.practice_type_id)
    if not pt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Amaliyot turi topilmadi")

    criterion = next((c for c in _criteria_of(pt) if str(c["key"]) == key), None)
    if not criterion:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Bunday mezon yo'q: {key}")
    if is_auto(criterion):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"'{criterion.get('name') or key}' avtomatik hisoblanadi — qo'lda qo'yib bo'lmaydi",
        )
    cmax = int(criterion.get("max") or 0)
    if not 0 <= score <= cmax:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Ball 0 va {cmax} oralig'ida bo'lishi kerak"
        )

    # JSONB — o'rnida o'zgartirish SQLAlchemy tomonidan sezilmaydi, qayta tayinlaymiz.
    asn.criteria_scores = {**(asn.criteria_scores or {}), key: score}
    await db.commit()
    return await compute_breakdown(db, assignment_id)


async def finalize_grade(db: AsyncSession, assignment_id: UUID, user: User) -> dict[str, Any]:
    """Amaliyotni yakunlaydi: umumiy ballni chiqaradi va kredit holatini belgilaydi."""
    await authorize(db, assignment_id, user)
    breakdown = await compute_breakdown(db, assignment_id)

    if breakdown["missing_criteria"]:
        names = [
            c["name"] for c in breakdown["criteria"] if c["key"] in breakdown["missing_criteria"]
        ]
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Avval barcha mezonlarni baholang: {', '.join(names)}",
        )

    asn = await db.get(PracticeAssignment, assignment_id)
    if not asn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Biriktirish topilmadi: {assignment_id}")
    if asn.status == AssignmentStatus.CANCELLED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Bekor qilingan amaliyotni baholab bo'lmaydi")

    total = int(breakdown["total"])
    min_total = int(breakdown["min_total"])
    asn.final_grade = total
    asn.credit_earned = total >= min_total if min_total else False
    asn.status = AssignmentStatus.COMPLETED
    await db.commit()

    return await compute_breakdown(db, assignment_id)
