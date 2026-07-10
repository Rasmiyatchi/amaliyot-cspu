"""Academic CRUD service'lar — Faculty, Direction, AcademicYear, Group."""

from typing import TypeVar
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.models.academic import AcademicYear, Department, Direction, Faculty, Group

M = TypeVar("M", bound=Base)


def _404(entity: str, id_: UUID | str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{entity} topilmadi: {id_}")


def _409(msg: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, msg)


async def _get_or_404(db: AsyncSession, model: type[M], id_: UUID, entity_name: str) -> M:
    obj = await db.get(model, id_)
    if not obj:
        raise _404(entity_name, id_)
    return obj


def _apply_updates(obj: Base, data: BaseModel) -> None:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)


# ─── Faculty ──────────────────────────────────────────────
async def list_faculties(db: AsyncSession, offset: int, limit: int) -> tuple[list[Faculty], int]:
    total = (await db.execute(select(func.count(Faculty.id)))).scalar_one()
    items = (
        (await db.execute(select(Faculty).order_by(Faculty.name).offset(offset).limit(limit)))
        .scalars()
        .all()
    )
    return list(items), total


async def create_faculty(db: AsyncSession, data: BaseModel) -> Faculty:
    f = Faculty(**data.model_dump(exclude_unset=True))
    db.add(f)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Shu nomli yoki kodli fakultet mavjud") from e
    await db.refresh(f)
    return f


async def update_faculty(db: AsyncSession, id_: UUID, data: BaseModel) -> Faculty:
    f = await _get_or_404(db, Faculty, id_, "Fakultet")
    _apply_updates(f, data)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Shu nomli yoki kodli fakultet mavjud") from e
    await db.refresh(f)
    return f


async def delete_faculty(db: AsyncSession, id_: UUID) -> None:
    f = await _get_or_404(db, Faculty, id_, "Fakultet")
    try:
        await db.delete(f)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Fakultetga bog'langan yo'nalishlar bor — avval ularni o'chiring") from e


# ─── Direction ────────────────────────────────────────────
async def list_directions(
    db: AsyncSession, offset: int, limit: int, faculty_id: UUID | None = None
) -> tuple[list[Direction], int]:
    base = select(Direction)
    count_stmt = select(func.count(Direction.id))
    if faculty_id:
        base = base.where(Direction.faculty_id == faculty_id)
        count_stmt = count_stmt.where(Direction.faculty_id == faculty_id)
    total = (await db.execute(count_stmt)).scalar_one()
    items = (
        (await db.execute(base.order_by(Direction.code).offset(offset).limit(limit)))
        .scalars()
        .all()
    )
    return list(items), total


async def create_direction(db: AsyncSession, data: BaseModel) -> Direction:
    d = Direction(**data.model_dump(exclude_unset=True))
    db.add(d)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409(
            "Aynan shu kod VA nomli yo'nalish allaqachon mavjud "
            "(bir kod bilan boshqa nomli yo'nalish qo'shsa bo'ladi)"
        ) from e
    await db.refresh(d)
    return d


async def update_direction(db: AsyncSession, id_: UUID, data: BaseModel) -> Direction:
    d = await _get_or_404(db, Direction, id_, "Yo'nalish")
    _apply_updates(d, data)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Aynan shu kod va nomli yo'nalish allaqachon mavjud") from e
    await db.refresh(d)
    return d


async def delete_direction(db: AsyncSession, id_: UUID) -> None:
    d = await _get_or_404(db, Direction, id_, "Yo'nalish")
    try:
        await db.delete(d)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Yo'nalishga bog'langan guruhlar bor") from e


# ─── Department (Kafedra) ─────────────────────────────────
async def list_departments(
    db: AsyncSession, offset: int, limit: int, faculty_id: UUID | None = None
) -> tuple[list[Department], int]:
    base = select(Department)
    count_stmt = select(func.count(Department.id))
    if faculty_id:
        base = base.where(Department.faculty_id == faculty_id)
        count_stmt = count_stmt.where(Department.faculty_id == faculty_id)
    total = (await db.execute(count_stmt)).scalar_one()
    items = (
        (await db.execute(base.order_by(Department.name).offset(offset).limit(limit)))
        .scalars()
        .all()
    )
    return list(items), total


async def create_department(db: AsyncSession, data: BaseModel) -> Department:
    d = Department(**data.model_dump(exclude_unset=True))
    db.add(d)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Shu nomli kafedra mavjud yoki fakultet topilmadi") from e
    await db.refresh(d)
    return d


async def update_department(db: AsyncSession, id_: UUID, data: BaseModel) -> Department:
    d = await _get_or_404(db, Department, id_, "Kafedra")
    _apply_updates(d, data)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Shu nomli kafedra mavjud") from e
    await db.refresh(d)
    return d


async def delete_department(db: AsyncSession, id_: UUID) -> None:
    d = await _get_or_404(db, Department, id_, "Kafedra")
    try:
        await db.delete(d)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Kafedraga bog'langan supervizorlar bor") from e


# ─── AcademicYear ─────────────────────────────────────────
async def list_academic_years(db: AsyncSession) -> list[AcademicYear]:
    """AY'lar odatda kam bo'ladi — paginationsiz."""
    items = (
        (await db.execute(select(AcademicYear).order_by(AcademicYear.start_date.desc())))
        .scalars()
        .all()
    )
    return list(items)


async def create_academic_year(db: AsyncSession, data: BaseModel) -> AcademicYear:
    payload = data.model_dump(exclude_unset=True)
    # Agar is_active=true — boshqalarni deaktiv qilamiz
    if payload.get("is_active"):
        await db.execute(update(AcademicYear).values(is_active=False))
    ay = AcademicYear(**payload)
    db.add(ay)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Shu nomli akademik yil mavjud") from e
    await db.refresh(ay)
    return ay


async def update_academic_year(db: AsyncSession, id_: UUID, data: BaseModel) -> AcademicYear:
    ay = await _get_or_404(db, AcademicYear, id_, "Akademik yil")
    payload = data.model_dump(exclude_unset=True)
    if payload.get("is_active") is True:
        await db.execute(update(AcademicYear).where(AcademicYear.id != id_).values(is_active=False))
    for key, value in payload.items():
        setattr(ay, key, value)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Shu nomli akademik yil mavjud") from e
    await db.refresh(ay)
    return ay


async def delete_academic_year(db: AsyncSession, id_: UUID) -> None:
    ay = await _get_or_404(db, AcademicYear, id_, "Akademik yil")
    try:
        await db.delete(ay)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Akademik yilga bog'langan guruhlar bor") from e


# ─── Group ────────────────────────────────────────────────
async def list_groups(
    db: AsyncSession,
    offset: int,
    limit: int,
    direction_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    course: int | None = None,
) -> tuple[list[Group], int]:
    stmt = select(Group)
    count_stmt = select(func.count(Group.id))
    if direction_id:
        stmt = stmt.where(Group.direction_id == direction_id)
        count_stmt = count_stmt.where(Group.direction_id == direction_id)
    if academic_year_id:
        stmt = stmt.where(Group.academic_year_id == academic_year_id)
        count_stmt = count_stmt.where(Group.academic_year_id == academic_year_id)
    if course is not None:
        stmt = stmt.where(Group.course == course)
        count_stmt = count_stmt.where(Group.course == course)

    total = (await db.execute(count_stmt)).scalar_one()
    items = (
        (await db.execute(stmt.order_by(Group.course, Group.name).offset(offset).limit(limit)))
        .scalars()
        .all()
    )
    return list(items), total


async def create_group(db: AsyncSession, data: BaseModel) -> Group:
    g = Group(**data.model_dump(exclude_unset=True))
    db.add(g)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Shu akademik yilda, shu yo'nalishda xuddi shunday nomli guruh mavjud") from e
    await db.refresh(g)
    return g


async def update_group(db: AsyncSession, id_: UUID, data: BaseModel) -> Group:
    g = await _get_or_404(db, Group, id_, "Guruh")
    _apply_updates(g, data)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Bunday guruh allaqachon mavjud") from e
    await db.refresh(g)
    return g


async def delete_group(db: AsyncSession, id_: UUID) -> None:
    g = await _get_or_404(db, Group, id_, "Guruh")
    try:
        await db.delete(g)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise _409("Guruhda talabalar bor — avval ularni boshqa guruhga ko'chiring") from e
