"""PracticeApplication service — talaba arizasi oqimi + QR tasdiq + ilova."""

from __future__ import annotations

import io
import secrets
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import qrcode
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.academic import Direction, Group
from app.models.contract_template import ContractTemplateDoc
from app.models.enums import ApplicationStatus, EducationForm
from app.models.practice_application import PracticeApplication
from app.models.student import Student
from app.models.user import User
from app.schemas.practice_application import ApplicationCreate
from app.services import contract_template as ct_svc

_EDU_FORM_LABEL = {
    EducationForm.DAYTIME: "Kunduzgi",
    EducationForm.EVENING: "Kechki",
    EducationForm.CORRESPONDENCE: "Sirtqi",
    EducationForm.DISTANCE: "Masofaviy",
}


def _qr_png(url: str) -> bytes:
    qr = qrcode.QRCode(box_size=4, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    buf = io.BytesIO()
    qr.make_image(fill_color="black", back_color="white").save(buf, format="PNG")
    return buf.getvalue()


async def _next_contract_number(db: AsyncSession, year: int) -> str:
    """CHDPU-SH-{yil}-{0001} formatida takrorlanmas raqam."""
    prefix = f"CHDPU-SH-{year}-"
    last = (
        await db.execute(
            select(PracticeApplication.contract_number)
            .where(PracticeApplication.contract_number.like(f"{prefix}%"))
            .order_by(PracticeApplication.contract_number.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    seq = 1
    if last:
        try:
            seq = int(last.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    return f"{prefix}{seq:04d}"


async def _student_for_user(db: AsyncSession, user: User) -> Student:
    student = (
        await db.execute(select(Student).where(Student.user_id == user.id))
    ).scalar_one_or_none()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talaba profili topilmadi")
    return student


def _read_select():
    return (
        select(
            PracticeApplication,
            (User.last_name + " " + User.first_name).label("student_name"),
            Direction.name.label("direction_name"),
            Group.name.label("group_name"),
            Group.course.label("course"),
            ContractTemplateDoc.name.label("contract_template_name"),
        )
        .join(Student, Student.id == PracticeApplication.student_id)
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .outerjoin(
            ContractTemplateDoc,
            ContractTemplateDoc.id == PracticeApplication.contract_template_id,
        )
    )


def _to_read(row: Any) -> dict[str, Any]:
    app_obj = row[0]
    return {
        **{c.name: getattr(app_obj, c.name) for c in app_obj.__table__.columns},
        "student_name": (row.student_name or "").strip() or None,
        "direction_name": row.direction_name,
        "group_name": row.group_name,
        "course": row.course,
        "contract_template_name": row.contract_template_name,
        "has_contract_file": bool(app_obj.contract_file),
    }


async def create_for_student(
    db: AsyncSession, user: User, data: ApplicationCreate
) -> dict[str, Any]:
    student = await _student_for_user(db, user)
    app_obj = PracticeApplication(
        student_id=student.id,
        contract_template_id=data.contract_template_id,
        object_name=data.object_name,
        object_location=data.object_location,
        manager_name=data.manager_name,
        manager_phone=data.manager_phone,
        region=data.region or student.region,
        district=data.district or student.district,
        note=data.note,
        status=ApplicationStatus.PENDING,
    )
    db.add(app_obj)
    await db.commit()
    return await get_one(db, app_obj.id)


async def list_my(db: AsyncSession, user: User) -> list[dict[str, Any]]:
    student = await _student_for_user(db, user)
    rows = (
        await db.execute(
            _read_select()
            .where(PracticeApplication.student_id == student.id)
            .order_by(PracticeApplication.created_at.desc())
        )
    ).all()
    return [_to_read(r) for r in rows]


async def list_all(
    db: AsyncSession,
    *,
    status_filter: ApplicationStatus | None = None,
    region: str | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    stmt = _read_select()
    if status_filter:
        stmt = stmt.where(PracticeApplication.status == status_filter)
    if region:
        stmt = stmt.where(PracticeApplication.region == region)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(User.last_name).like(like)
            | func.lower(User.first_name).like(like)
            | func.lower(PracticeApplication.object_name).like(like)
        )
    rows = (await db.execute(stmt.order_by(PracticeApplication.created_at.desc()))).all()
    return [_to_read(r) for r in rows]


async def get_one(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    row = (
        await db.execute(_read_select().where(PracticeApplication.id == id_))
    ).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")
    return _to_read(row)


async def _get_obj(db: AsyncSession, id_: UUID) -> PracticeApplication:
    obj = await db.get(PracticeApplication, id_)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")
    return obj


async def _generate_contract(db: AsyncSession, obj: PracticeApplication) -> None:
    """Tasdiqlangan ariza uchun DOCX shartnoma generatsiya qiladi (raqam+QR+ilova)."""
    tpl = await db.get(ContractTemplateDoc, obj.contract_template_id)
    if not tpl:
        return  # shablon o'chirilgan bo'lsa — generatsiya qilinmaydi

    # Talaba ma'lumotlari (ilova uchun)
    row = (
        await db.execute(
            select(
                User.last_name,
                User.first_name,
                User.middle_name,
                Direction.name.label("direction_name"),
                Direction.code.label("direction_code"),
                Group.name.label("group_name"),
                Group.course,
                Student.education_form,
            )
            .join(Student, Student.user_id == User.id)
            .outerjoin(Group, Group.id == Student.group_id)
            .outerjoin(Direction, Direction.id == Group.direction_id)
            .where(Student.id == obj.student_id)
        )
    ).first()

    now = datetime.now(UTC)
    number = await _next_contract_number(db, now.year)
    fish = ""
    edu_form = ""
    ctx: dict[str, Any] = {
        "raqam": number,
        "sana": now.strftime("%d.%m.%Y"),
        "obyekt": obj.object_name,
        "manzil": obj.object_location,
        "rahbar": obj.manager_name or "",
        "telefon": obj.manager_phone,
        "shartnoma_turi": tpl.name,
    }
    if row:
        parts = [row.last_name, row.first_name, row.middle_name]
        fish = " ".join(p for p in parts if p)
        edu_form = _EDU_FORM_LABEL.get(row.education_form, "") if row.education_form else ""
        ctx.update(
            {
                "fish": fish,
                "ism": fish,
                "yonalish": row.direction_name or "",
                "shifr": row.direction_code or "",
                "kurs": row.course or "",
                "guruh": row.group_name or "",
                "talim_shakli": edu_form,
            }
        )

    verify_url = f"{settings.WEB_URL.rstrip('/')}/verify/{obj.qr_token}"
    docx_bytes = ct_svc.render_docx(tpl, ctx, qr_png=_qr_png(verify_url))
    attachment = ct_svc._save_docx(docx_bytes, f"{number}.docx")  # noqa: SLF001

    obj.contract_number = number
    obj.contract_file = attachment


async def approve(db: AsyncSession, id_: UUID, user: User) -> dict[str, Any]:
    obj = await _get_obj(db, id_)
    if obj.status == ApplicationStatus.APPROVED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ariza allaqachon tasdiqlangan")
    obj.status = ApplicationStatus.APPROVED
    obj.qr_token = obj.qr_token or secrets.token_urlsafe(12)
    obj.reviewed_by_id = user.id
    obj.reviewed_at = datetime.now(UTC)

    # Shartnoma turi tanlangan bo'lsa — DOCX shartnoma generatsiya qilamiz.
    if obj.contract_template_id and not obj.contract_file:
        try:
            await _generate_contract(db, obj)
        except Exception as e:  # noqa: BLE001
            # Generatsiya muvaffaqiyatsiz bo'lsa ham tasdiq saqlanadi (admin qayta urinadi)
            from loguru import logger

            logger.warning(f"Shartnoma generatsiya xatosi (ariza {id_}): {e}")

    await db.commit()
    return await get_one(db, id_)


async def reject(
    db: AsyncSession, id_: UUID, user: User, note: str | None
) -> dict[str, Any]:
    obj = await _get_obj(db, id_)
    obj.status = ApplicationStatus.REJECTED
    obj.reviewed_by_id = user.id
    obj.reviewed_at = datetime.now(UTC)
    obj.review_note = note
    await db.commit()
    return await get_one(db, id_)


async def list_contract_types(db: AsyncSession) -> list[dict[str, Any]]:
    """Talaba tanlashi mumkin bo'lgan faol shartnoma turlari (shablonlar)."""
    rows = (
        await db.execute(
            select(
                ContractTemplateDoc.id,
                ContractTemplateDoc.name,
                ContractTemplateDoc.description,
                ContractTemplateDoc.practice_type_id,
            )
            .where(ContractTemplateDoc.is_active.is_(True))
            .order_by(ContractTemplateDoc.name)
        )
    ).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "practice_type_id": r.practice_type_id,
        }
        for r in rows
    ]


async def contract_file_path(db: AsyncSession, user: User, id_: UUID):
    """Generatsiya qilingan shartnoma faylining yo'li (kirish tekshiruvi bilan)."""
    from app.models.enums import UserRole

    obj = await _get_obj(db, id_)
    if user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        student = await _student_for_user(db, user)
        if obj.student_id != student.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ruxsat yo'q")
    if not obj.contract_file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shartnoma fayli hali yo'q")
    return ct_svc._abs_path(obj.contract_file["path"]), obj.contract_number  # noqa: SLF001


async def appendix_by_region(db: AsyncSession) -> list[dict[str, Any]]:
    """Tasdiqlangan arizalarni hudud bo'yicha guruhlaydi (ilova).

    Faqat bir hududda 2+ talaba bo'lsa ilovaga kiradi.
    """
    rows = await list_all(db, status_filter=ApplicationStatus.APPROVED)
    groups: dict[str, list[dict[str, Any]]] = {}
    for r in rows:
        key = r.get("region") or "—"
        groups.setdefault(key, []).append(r)
    result = []
    for region, students in sorted(groups.items()):
        if len(students) < 2:
            continue
        result.append(
            {
                "region": region,
                "count": len(students),
                "students": [
                    {
                        "student_name": s["student_name"],
                        "direction_name": s["direction_name"],
                        "course": s["course"],
                        "object_name": s["object_name"],
                        "object_location": s["object_location"],
                    }
                    for s in students
                ],
            }
        )
    return result
