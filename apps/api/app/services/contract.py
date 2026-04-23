"""Contract service — CRUD + validation + number generation."""

import secrets
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import AcademicYear, Direction, Group
from app.models.contract import Contract
from app.models.enums import ContractStatus, ContractTemplate
from app.models.organization import Organization
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.student import Student
from app.models.user import User

TEMPLATE_SHORT_CODES: dict[ContractTemplate, str] = {
    ContractTemplate.FOUR_PLUS_TWO: "4+2",
    ContractTemplate.PEDAGOGICAL: "PED",
    ContractTemplate.QUALIFYING: "MAL",
    ContractTemplate.INTERNSHIP_PRODUCTION: "IP",
    ContractTemplate.PARTNERSHIP: "HAM",
}


# ─── Number generator ─────────────────────────────────────


async def _next_contract_number(db: AsyncSession, template: ContractTemplate, year: int) -> str:
    """CHDPU-4+2-2025-0001 formatida raqam yaratadi."""
    short = TEMPLATE_SHORT_CODES[template]
    prefix = f"CHDPU-{short}-{year}-"

    # O'sha yildagi shu template'ning eng katta sequence'ini topamiz
    stmt = (
        select(Contract.number)
        .where(Contract.number.like(f"{prefix}%"))
        .order_by(Contract.number.desc())
        .limit(1)
    )
    last = (await db.execute(stmt)).scalar_one_or_none()

    if last is None:
        seq = 1
    else:
        try:
            seq = int(last.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1

    return f"{prefix}{seq:04d}"


# ─── Read helpers ─────────────────────────────────────────


def _base_read_select() -> Any:
    return (
        select(
            Contract.id,
            Contract.number,
            Contract.template_ref,
            Contract.status,
            Contract.organization_id,
            Organization.name.label("organization_name"),
            Contract.academic_year_id,
            AcademicYear.name.label("academic_year_name"),
            Contract.practice_type_id,
            PracticeType.name.label("practice_type_name"),
            Contract.students,
            Contract.start_date,
            Contract.end_date,
            Contract.pdf_path,
            Contract.scan_path,
            Contract.qr_token,
            Contract.generated_at,
            Contract.signed_at_org,
            Contract.revoked_reason,
            Contract.revoked_at,
            Contract.created_by_id,
            (User.last_name + " " + User.first_name).label("created_by_name"),
            Contract.notes,
            Contract.created_at,
            Contract.updated_at,
        )
        .join(Organization, Organization.id == Contract.organization_id)
        .join(AcademicYear, AcademicYear.id == Contract.academic_year_id)
        .join(PracticeType, PracticeType.id == Contract.practice_type_id)
        .join(User, User.id == Contract.created_by_id)
    )


def _row_to_dict(r: dict[str, Any]) -> dict[str, Any]:
    out = dict(r)
    out["students_count"] = len(out.get("students") or [])
    return out


# ─── CRUD ─────────────────────────────────────────────────


async def list_contracts(
    db: AsyncSession,
    offset: int,
    limit: int,
    *,
    organization_id: UUID | None = None,
    practice_type_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    status_filter: ContractStatus | None = None,
    search: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    base = _base_read_select()
    count_stmt = select(func.count(Contract.id)).join(
        Organization, Organization.id == Contract.organization_id
    )

    def apply(stmt: Any) -> Any:
        if organization_id:
            stmt = stmt.where(Contract.organization_id == organization_id)
        if practice_type_id:
            stmt = stmt.where(Contract.practice_type_id == practice_type_id)
        if academic_year_id:
            stmt = stmt.where(Contract.academic_year_id == academic_year_id)
        if status_filter:
            stmt = stmt.where(Contract.status == status_filter)
        if search:
            like = f"%{search}%"
            stmt = stmt.where(or_(Contract.number.like(like), Organization.name.ilike(like)))
        return stmt

    base = apply(base)
    count_stmt = apply(count_stmt)

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        (await db.execute(base.order_by(Contract.created_at.desc()).offset(offset).limit(limit)))
        .mappings()
        .all()
    )

    return [_row_to_dict(dict(r)) for r in rows], total


async def get_contract(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    row = (await db.execute(_base_read_select().where(Contract.id == id_))).mappings().first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Shartnoma topilmadi: {id_}")
    return _row_to_dict(dict(row))


async def _snapshot_students(
    db: AsyncSession, assignment_ids: list[UUID], organization_id: UUID
) -> list[dict[str, Any]]:
    """Assignment'lardan talaba snapshot'ini olish + tashkilot mos kelishini tekshirish."""
    stmt = (
        select(
            PracticeAssignment.id,
            Student.hemis_id,
            (
                User.last_name + " " + User.first_name + " " + func.coalesce(User.middle_name, "")
            ).label("full_name"),
            Direction.code.label("direction_code"),
            Direction.name.label("direction_name"),
            Group.name.label("group_name"),
            Group.course,
            PracticeAssignment.start_date,
            PracticeAssignment.end_date,
            PracticeAssignment.organization_id,
        )
        .join(Student, Student.id == PracticeAssignment.student_id)
        .join(User, User.id == Student.user_id)
        .outerjoin(Group, Group.id == Student.group_id)
        .outerjoin(Direction, Direction.id == Group.direction_id)
        .where(PracticeAssignment.id.in_(assignment_ids))
    )
    rows = (await db.execute(stmt)).mappings().all()

    if len(rows) != len(assignment_ids):
        found_ids = {r["id"] for r in rows}
        missing = set(assignment_ids) - found_ids
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Biriktirishlar topilmadi: {missing}",
        )

    for r in rows:
        if r["organization_id"] != organization_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Biriktirish boshqa tashkilotga tegishli: {r['id']}",
            )
        if r["direction_code"] is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Talabaning yo'nalishi aniqlanmagan: assignment={r['id']}",
            )

    return [
        {
            "assignment_id": str(r["id"]),
            "hemis_id": r["hemis_id"],
            "full_name": " ".join(r["full_name"].split()),  # multiple spaces → single
            "direction_code": r["direction_code"],
            "direction_name": r["direction_name"],
            "course": r["course"],
            "group_name": r["group_name"],
            "start_date": r["start_date"].isoformat(),
            "end_date": r["end_date"].isoformat(),
        }
        for r in rows
    ]


async def create_contract(db: AsyncSession, data: BaseModel, created_by: UUID) -> dict[str, Any]:
    payload = data.model_dump()

    # Validatsiya
    if payload["end_date"] < payload["start_date"]:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "end_date start_date dan oldin bo'lolmaydi"
        )

    org = await db.get(Organization, payload["organization_id"])
    if not org:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tashkilot topilmadi")

    students_snapshot = await _snapshot_students(
        db, payload["assignment_ids"], payload["organization_id"]
    )

    # Raqam va token
    year = payload["start_date"].year
    number = await _next_contract_number(db, ContractTemplate(payload["template_ref"]), year)
    qr_token = secrets.token_urlsafe(16)

    contract = Contract(
        number=number,
        template_ref=payload["template_ref"],
        organization_id=payload["organization_id"],
        academic_year_id=payload["academic_year_id"],
        practice_type_id=payload["practice_type_id"],
        created_by_id=created_by,
        students=students_snapshot,
        start_date=payload["start_date"],
        end_date=payload["end_date"],
        status=ContractStatus.DRAFT,
        qr_token=qr_token,
        notes=payload.get("notes"),
    )
    db.add(contract)
    await db.commit()
    await db.refresh(contract)
    return await get_contract(db, contract.id)


async def update_contract(db: AsyncSession, id_: UUID, data: BaseModel) -> dict[str, Any]:
    contract = await db.get(Contract, id_)
    if not contract:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Shartnoma topilmadi: {id_}")
    if contract.status != ContractStatus.DRAFT:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Faqat DRAFT shartnomani tahrirlash mumkin. Boshqasini bekor qiling.",
        )

    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(contract, key, value)

    # Sana tekshiruvi
    if contract.end_date < contract.start_date:
        await db.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "end_date start_date dan oldin bo'lolmaydi"
        )

    await db.commit()
    return await get_contract(db, contract.id)


async def revoke_contract(db: AsyncSession, id_: UUID, data: BaseModel) -> dict[str, Any]:
    contract = await db.get(Contract, id_)
    if not contract:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Shartnoma topilmadi: {id_}")
    if contract.status in (ContractStatus.REVOKED, ContractStatus.EXPIRED):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Shartnoma allaqachon {contract.status}")

    payload = data.model_dump()
    contract.status = ContractStatus.REVOKED
    contract.revoked_reason = payload["reason"]
    contract.revoked_at = datetime.now(UTC)
    await db.commit()
    return await get_contract(db, contract.id)


async def generate_pdf(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    """Shartnomaning PDF + QR variantini generatsiya qiladi va fayl yo'lini saqlaydi."""
    from app.services import pdf as pdf_svc

    contract = await db.get(Contract, id_)
    if not contract:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Shartnoma topilmadi: {id_}")
    if contract.status not in (ContractStatus.DRAFT, ContractStatus.GENERATED):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Regen faqat DRAFT/GENERATED holatda ({contract.status})",
        )

    organization = await db.get(Organization, contract.organization_id)
    if not organization:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tashkilot topilmadi")

    try:
        pdf_bytes = pdf_svc.render_contract_pdf(contract, organization)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"PDF generatsiya xatoligi: {e}",
        ) from e

    contract.pdf_path = pdf_svc.save_contract_pdf(contract, pdf_bytes)
    contract.status = ContractStatus.GENERATED
    contract.generated_at = datetime.now(UTC)

    await db.commit()
    return await get_contract(db, contract.id)


async def upload_scan(db: AsyncSession, id_: UUID, content: bytes, filename: str) -> dict[str, Any]:
    """Supervizor tomonidan imzolangan skanni yuklash — status ACTIVE ga o'tadi."""
    from app.services import pdf as pdf_svc

    contract = await db.get(Contract, id_)
    if not contract:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Shartnoma topilmadi: {id_}")
    if contract.status not in (ContractStatus.GENERATED, ContractStatus.ACTIVE):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Skan yuklash uchun avval PDF generatsiya qiling",
        )

    try:
        contract.scan_path = pdf_svc.save_contract_scan(contract, content, filename)
    except ValueError as e:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, str(e)) from e

    contract.status = ContractStatus.ACTIVE
    contract.signed_at_org = datetime.now(UTC)
    await db.commit()
    return await get_contract(db, contract.id)


async def verify_by_token(db: AsyncSession, qr_token: str) -> dict[str, Any]:
    """Public QR verification — auth talab qilmaydi, minimal ma'lumot."""
    row = (
        (
            await db.execute(
                select(
                    Contract.number,
                    Contract.template_ref,
                    Contract.status,
                    Contract.start_date,
                    Contract.end_date,
                    Contract.students,
                    Contract.generated_at,
                    Contract.signed_at_org,
                    Contract.revoked_reason,
                    Contract.revoked_at,
                    Organization.name.label("organization_name"),
                    PracticeType.name.label("practice_type_name"),
                )
                .join(Organization, Organization.id == Contract.organization_id)
                .join(PracticeType, PracticeType.id == Contract.practice_type_id)
                .where(Contract.qr_token == qr_token)
            )
        )
        .mappings()
        .first()
    )

    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shartnoma topilmadi")

    return dict(row)


async def delete_contract(db: AsyncSession, id_: UUID) -> None:
    contract = await db.get(Contract, id_)
    if not contract:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Shartnoma topilmadi: {id_}")
    if contract.status != ContractStatus.DRAFT:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Faqat DRAFT shartnomasini o'chirish mumkin. Aktiv bo'lsa — REVOKE qiling.",
        )
    await db.delete(contract)
    await db.commit()
