"""PracticeApplication service — talaba arizasi oqimi + QR tasdiq + ilova."""

from __future__ import annotations

import io
import secrets
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

import qrcode
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.academic import AcademicYear, Direction, Faculty, Group
from app.models.contract_template import ContractTemplateDoc
from app.models.enums import ApplicationStatus, ContractTemplateStatus, EducationForm
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
    img = qr.make_image(fill_color="black", back_color="white")
    try:
        img.save(buf, format="PNG")
    except (TypeError, ValueError, KeyError):
        img.save(buf)
    return buf.getvalue()


async def _next_contract_number(db: AsyncSession, year: int) -> str:
    """26000001 formatida takrorlanmas raqam."""
    prefix = "26"
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
            seq = int(last[len(prefix):]) + 1
        except (ValueError, IndexError):
            seq = 1
    return f"{prefix}{seq:06d}"


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

    # Deriving organization name dynamically from variable_values if standard column is empty
    org_name = app_obj.organization_name
    if not org_name and app_obj.variable_values:
        org_name = (
            app_obj.variable_values.get("organization_name")
            or app_obj.variable_values.get("company_name")
            or app_obj.variable_values.get("school_name")
            or ""
        )

    return {
        **{c.name: getattr(app_obj, c.name) for c in app_obj.__table__.columns},
        "organization_name": org_name,
        "student_name": (row.student_name or "").strip() or None,
        "direction_name": row.direction_name,
        "group_name": row.group_name,
        "course": row.course,
        "contract_template_name": row.contract_template_name,
        "has_contract_file": bool(app_obj.contract_file),
        "has_scan_file": bool(app_obj.scan_file),
        "contract_file": app_obj.contract_file,
        "scan_file": app_obj.scan_file,
    }


async def create_for_student(
    db: AsyncSession, user: User, data: ApplicationCreate
) -> dict[str, Any]:
    student = await _student_for_user(db, user)

    # Template validation
    tpl = await db.get(ContractTemplateDoc, data.contract_template_id)
    if not tpl:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shablon topilmadi")

    # Bir talabada bir vaqtda faqat bitta faol ariza bo'lsin
    active_statuses = [
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.RESUBMITTED,
        ApplicationStatus.APPROVED,
        ApplicationStatus.ACTIVE,
    ]
    existing = (
        await db.execute(
            select(PracticeApplication.id).where(
                PracticeApplication.student_id == student.id,
                PracticeApplication.status.in_(active_statuses),
            )
        )
    ).first()
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Sizda faol ariza allaqachon bor — avval uni yakunlang yoki bekor qiling",
        )

    variable_values = {}
    if data.variable_values:
        variable_values = ct_svc.validate_student_input(tpl, data.variable_values)

    app_obj = PracticeApplication(
        student_id=student.id,
        contract_template_id=data.contract_template_id,
        organization_type=data.organization_type,
        organization_name=data.organization_name or variable_values.get("organization_name", ""),
        region=data.region or student.region,
        district=data.district or student.district,
        note=data.note,
        status=ApplicationStatus.SUBMITTED,
        variable_values=variable_values,
    )
    db.add(app_obj)
    await db.commit()
    await db.refresh(app_obj)
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
            | func.lower(PracticeApplication.organization_name).like(like)
        )
    rows = (await db.execute(stmt.order_by(PracticeApplication.created_at.desc()))).all()
    return [_to_read(r) for r in rows]


async def return_application(
    db: AsyncSession, id_: UUID, user: User, reason: str
) -> dict[str, Any]:
    obj = await _get_obj(db, id_)
    obj.status = ApplicationStatus.REVISION_REQUIRED
    obj.reviewed_by_id = user.id
    obj.reviewed_at = datetime.now(UTC)
    obj.return_reason = reason
    await db.commit()
    return await get_one(db, id_)


async def resubmit(
    db: AsyncSession, id_: UUID, user: User, variable_values: dict[str, Any] | None
) -> dict[str, Any]:
    """Talaba "Tuzatish kerak" arizasini to'g'irlab qayta yuboradi."""
    obj = await _get_obj(db, id_)
    student = await _student_for_user(db, user)
    if obj.student_id != student.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ruxsat yo'q")
    if obj.status != ApplicationStatus.REVISION_REQUIRED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Faqat tuzatishga qaytarilgan arizani qayta yuborish mumkin"
        )
    if variable_values:
        tpl = await db.get(ContractTemplateDoc, obj.contract_template_id)
        if tpl:
            obj.variable_values = ct_svc.validate_student_input(tpl, variable_values)
    obj.status = ApplicationStatus.RESUBMITTED
    obj.return_reason = None
    await db.commit()
    return await get_one(db, id_)


async def confirm_scan(db: AsyncSession, id_: UUID, user: User) -> dict[str, Any]:
    """Admin imzolangan skanni tasdiqlaydi — shartnoma yopiladi (ACTIVE).

    Shundan keyin talaba skanni qayta yuklay olmaydi.
    """
    obj = await _get_obj(db, id_)
    if not obj.scan_file:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Skan hali yuklanmagan")
    if obj.status == ApplicationStatus.ACTIVE:
        raise HTTPException(status.HTTP_409_CONFLICT, "Shartnoma allaqachon yopilgan")
    if obj.status != ApplicationStatus.APPROVED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ariza tasdiqlanmagan")
    obj.status = ApplicationStatus.ACTIVE
    await db.commit()
    return await get_one(db, id_)


async def get_one(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    row = (await db.execute(_read_select().where(PracticeApplication.id == id_))).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")
    return _to_read(row)


async def _get_obj(db: AsyncSession, id_: UUID) -> PracticeApplication:
    obj = await db.get(PracticeApplication, id_)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")
    return obj


async def _build_contract_context(
    db: AsyncSession, obj: PracticeApplication
) -> tuple[ContractTemplateDoc, dict[str, Any], str]:
    """Shartnoma generatsiya konteksti (preview va generate uchun umumiy)."""
    tpl = await db.get(ContractTemplateDoc, obj.contract_template_id)
    if not tpl:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shartnoma shabloni topilmadi")

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
                Faculty.name.label("faculty_name"),
                AcademicYear.name.label("academic_year_name"),
            )
            .join(Student, Student.user_id == User.id)
            .outerjoin(Group, Group.id == Student.group_id)
            .outerjoin(Direction, Direction.id == Group.direction_id)
            .outerjoin(Faculty, Faculty.id == Direction.faculty_id)
            .outerjoin(AcademicYear, AcademicYear.id == Group.academic_year_id)
            .where(Student.id == obj.student_id)
        )
    ).first()

    now = datetime.now(UTC)
    fish = ""
    edu_form = ""
    ctx: dict[str, Any] = {
        "contract_no": "PREVIEW",
        "contract_number": "PREVIEW",
        "day": now.strftime("%d"),
        "contract_day": now.strftime("%d"),
        "month": now.strftime("%m"),
        "contract_month": now.strftime("%m"),
        "year": str(now.year)[-2:],
        "contract_year": str(now.year),
        "contract_date": now.strftime("%d.%m.%Y"),
        "obyekt": obj.object_name or "",
        "manzil": obj.object_location or "",
        "rahbar": obj.manager_name or "",
        "telefon": obj.manager_phone or "",
        "shartnoma_turi": tpl.name,
        "university_name": "Chirchiq davlat pedagogika universiteti",
        "university_rector_full_name": "",  # Rektor ismi
    }
    if row:
        parts = [row.last_name, row.first_name, row.middle_name]
        fish = " ".join(p for p in parts if p)
        edu_form = _EDU_FORM_LABEL.get(row.education_form, "") if row.education_form else ""
        ctx.update(
            {
                "fish": fish,
                "ism": fish,
                "student_name": fish,
                "student_full_name": fish,
                "student_first_name": row.first_name or "",
                "student_last_name": row.last_name or "",
                "yonalish": row.direction_name or "",
                "student_field": row.direction_name or "",
                "specialty_name": row.direction_name or "",
                "speciality_name": row.direction_name or "",
                "shifr": row.direction_code or "",
                "kurs": row.course or "",
                "course": row.course or "",
                "guruh": row.group_name or "",
                "group_name": row.group_name or "",
                "talim_shakli": edu_form,
                "education_form": edu_form,
                "faculty_name": row.faculty_name or "",
                "academic_year": row.academic_year_name or "",
            }
        )
    # XAVFSIZLIK: placeholders_data ATAYLAB o'qilmaydi — talaba yuborgan xom dict
    # tizim maydonlarini (F.I.Sh, rektor...) bosib, imzolanadigan hujjatga istalgan
    # HTML kiritishga yo'l ochardi. Yagona qonuniy yo'l — validate_student_input
    # dan o'tgan variable_values.

    if obj.variable_values:
        ctx.update(obj.variable_values)

    return tpl, ctx, fish


async def preview_contract_pdf(db: AsyncSession, id_: UUID) -> bytes:
    """Shartnomani tasdiqlashdan OLDIN PDF ko'rinishda ko'rish (bazaga saqlamaydi)."""
    obj = await _get_obj(db, id_)
    if not obj.contract_template_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Shartnoma shabloni tanlanmagan")

    tpl, ctx, _ = await _build_contract_context(db, obj)

    if tpl.html_content:
        from app.services.pdf import render_student_contract_pdf

        str_ctx = {k: str(v) for k, v in ctx.items()}
        return render_student_contract_pdf(tpl.html_content, str_ctx, "")
    verify_url = "https://chdpu.uz/verify/preview"
    return ct_svc.render_docx(tpl, ctx, qr_png=_qr_png(verify_url))


async def _generate_contract(db: AsyncSession, obj: PracticeApplication) -> None:
    """Tasdiqlangan ariza uchun DOCX shartnoma generatsiya qiladi (raqam+QR+ilova)."""
    tpl = await db.get(ContractTemplateDoc, obj.contract_template_id)
    if not tpl:
        return  # shablon o'chirilgan bo'lsa — generatsiya qilinmaydi

    now = datetime.now(UTC)
    number = await _next_contract_number(db, now.year)

    # Build common context
    _, ctx, fish = await _build_contract_context(db, obj)
    ctx["contract_no"] = number
    ctx["contract_number"] = number

    verify_url = f"{settings.WEB_URL.rstrip('/')}/verify/{obj.qr_token}"

    if tpl.html_content:
        # Yangi HTML tahrirlagich orqali qilingan shablon
        from app.services.pdf import render_student_contract_pdf

        # WeasyPrint PDF generatsiyasi HTML'dan
        str_ctx = {k: str(v) for k, v in ctx.items()}
        appendix_students = [
            {
                "full_name": ctx.get("student_full_name") or "",
                "faculty_name": ctx.get("faculty_name") or "",
                "course": ctx.get("course") or "",
                "direction_name": ctx.get("specialty_name") or "",
                # Ariza bosqichida amaliyot rahbari hali biriktirilmagan
                "supervisor_name": None,
                "start_date": ctx.get("practice_start_date") or "",
                "end_date": ctx.get("practice_end_date") or "",
            }
        ]
        pdf_bytes = render_student_contract_pdf(
            tpl.html_content,
            str_ctx,
            obj.qr_token or "",
            appendix_students=appendix_students,
            contract_number=number,
            contract_date=ctx.get("contract_date", ""),
        )

        import hashlib

        obj.document_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # PDF ni faylga saqlash
        from app.services.pdf import STORAGE_DIR as PDF_STORAGE_DIR

        PDF_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{number}.pdf"
        path = PDF_STORAGE_DIR / filename
        path.write_bytes(pdf_bytes)

        attachment = {
            "name": filename,
            "path": str(path.relative_to(PDF_STORAGE_DIR.parent.parent)),
            "mime": "application/pdf",
            "size": len(pdf_bytes),
            "uploaded_at": now.isoformat(),
        }
    else:
        # Eski docxtpl orqali shablon
        docx_bytes = ct_svc.render_docx(tpl, ctx, qr_png=_qr_png(verify_url))
        import hashlib

        obj.document_hash = hashlib.sha256(docx_bytes).hexdigest()
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


async def reject(db: AsyncSession, id_: UUID, user: User, note: str | None) -> dict[str, Any]:
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
                ContractTemplateDoc.placeholders,
            )
            .where(ContractTemplateDoc.status == ContractTemplateStatus.ACTIVE)
            .order_by(ContractTemplateDoc.name)
        )
    ).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "practice_type_id": r.practice_type_id,
            "placeholders": r.placeholders or [],
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

    # Ikki saqlash formati bor: HTML-PDF "storage/contracts/N.pdf" (apps/api ga
    # nisbatan), eski DOCX esa yalang'och fayl nomi (storage/contract_templates da).
    base = Path(__file__).parent.parent.parent
    rel = str(obj.contract_file["path"])
    if rel.startswith("storage/"):
        file_path = base / rel
    else:
        file_path = base / "storage" / "contract_templates" / rel
    if not file_path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shartnoma fayli topilmadi")
    return file_path, obj.contract_number


async def upload_scan(
    db: AsyncSession, id_: UUID, user: User, content: bytes, filename: str
) -> dict[str, Any]:
    from app.models.enums import UserRole

    obj = await _get_obj(db, id_)
    if user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        student = await _student_for_user(db, user)
        if obj.student_id != student.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Ruxsat yo'q")

    if obj.status == ApplicationStatus.ACTIVE:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Shartnoma yopilgan — skanni o'zgartirib bo'lmaydi"
        )
    if obj.status != ApplicationStatus.APPROVED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ariza tasdiqlanmagan")

    import secrets

    from app.services.pdf import STORAGE_DIR as PDF_STORAGE_DIR

    ext = Path(filename).suffix.lower()
    if ext not in [".pdf", ".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Faqat PDF va rasm (JPG, PNG) qabul qilinadi"
        )
    # Magic-byte tekshiruvi — kengaytmani almashtirib exe/html yuklashning oldini oladi
    magic_by_ext = {
        ".pdf": (b"%PDF",),
        ".jpg": (b"\xff\xd8\xff",),
        ".jpeg": (b"\xff\xd8\xff",),
        ".png": (b"\x89PNG",),
    }
    if not any(content.startswith(m) for m in magic_by_ext[ext]):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Fayl mazmuni kengaytmaga mos emas"
        )

    file_name = f"{obj.contract_number or 'shartnoma'}_scan_{secrets.token_hex(4)}{ext}"
    path = PDF_STORAGE_DIR / file_name
    path.write_bytes(content)

    obj.scan_file = {
        "name": filename,
        "path": str(path.relative_to(PDF_STORAGE_DIR.parent.parent)),
        "mime": "application/pdf" if ext == ".pdf" else f"image/{ext.strip('.')}",
        "size": len(content),
        "uploaded_at": datetime.now(UTC).isoformat(),
    }

    await db.commit()
    return await get_one(db, id_)


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


async def verify_by_token(db: AsyncSession, qr_token: str) -> dict[str, Any]:
    from sqlalchemy import or_

    # UUID yoki token yoki shartnoma raqami orqali qidirish
    conds = [
        PracticeApplication.qr_token == qr_token,
        PracticeApplication.contract_number == qr_token,
    ]
    try:
        parsed_uuid = UUID(qr_token)
        conds.append(PracticeApplication.id == parsed_uuid)
    except (ValueError, TypeError, AttributeError):
        pass

    row = (
        await db.execute(
            select(
                PracticeApplication.contract_number,
                PracticeApplication.status,
                PracticeApplication.organization_name,
                PracticeApplication.variable_values,
                PracticeApplication.created_at,
                PracticeApplication.reviewed_at,
                ContractTemplateDoc.name.label("contract_template_name"),
            )
            .outerjoin(
                ContractTemplateDoc,
                ContractTemplateDoc.id == PracticeApplication.contract_template_id,
            )
            .where(or_(*conds))
        )
    ).first()

    if not row:
        from fastapi import HTTPException, status

        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")

    var_vals = row.variable_values or {}
    org_name = (
        row.organization_name
        or var_vals.get("organization_name")
        or var_vals.get("company_name")
        or var_vals.get("school_name")
        or "Amaliyot tashkiloti"
    )

    is_active = row.status in (ApplicationStatus.APPROVED, ApplicationStatus.ACTIVE)

    return {
        "number": row.contract_number or "Kutilmoqda",
        "template_ref": row.contract_template_name or "Amaliyot shartnomasi",
        "status": "active" if is_active else "draft",
        "organization_name": org_name,
        "practice_type_name": "Talaba arizasi asosida",
        "start_date": row.created_at.date(),
        "end_date": row.created_at.date(),
        "students_count": 1,
        "generated_at": row.reviewed_at or row.created_at,
        "signed_at_org": None,
        "revoked_reason": None,
        "revoked_at": None,
        "is_valid": is_active,
    }
