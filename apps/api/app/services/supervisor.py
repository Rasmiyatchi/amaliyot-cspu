"""Supervisor CRUD service — User + profile birgalikda."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.academic import Department, Faculty
from app.models.enums import UserRole
from app.models.organization import Organization
from app.models.supervisor import Supervisor, SupervisorOrganization
from app.models.user import User


def _supervisor_base_select() -> Any:
    """Supervisor + User + Faculty + Department fields flat."""
    return (
        select(
            Supervisor.id,
            Supervisor.user_id,
            User.username,
            User.first_name,
            User.last_name,
            User.middle_name,
            User.email,
            User.phone,
            User.is_active,
            User.last_login_at,
            Supervisor.position,
            Supervisor.specialty,
            Supervisor.experience_years,
            Supervisor.capacity,
            Supervisor.rating,
            Supervisor.faculty_id,
            Faculty.name.label("faculty_name"),
            Supervisor.department_id,
            Department.name.label("department_name"),
            Supervisor.created_at,
        )
        .join(User, User.id == Supervisor.user_id)
        .outerjoin(Faculty, Faculty.id == Supervisor.faculty_id)
        .outerjoin(Department, Department.id == Supervisor.department_id)
    )


def _row_to_dict(r: dict[str, Any]) -> dict[str, Any]:
    middle = r["middle_name"]
    full_name = f"{r['last_name']} {r['first_name']}" + (f" {middle}" if middle else "")
    return {**dict(r), "full_name": full_name, "organizations": []}


async def _hydrate_organizations(
    db: AsyncSession, rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Har bir supervizorga biriktirilgan tashkilotlar ro'yxatini qo'shadi."""
    sup_ids = [r["id"] for r in rows]
    if not sup_ids:
        return rows
    org_rows = (
        await db.execute(
            select(
                SupervisorOrganization.supervisor_id,
                Organization.id,
                Organization.name,
            )
            .join(Organization, Organization.id == SupervisorOrganization.organization_id)
            .where(SupervisorOrganization.supervisor_id.in_(sup_ids))
            .order_by(Organization.name)
        )
    ).all()
    by_sup: dict[Any, list[dict[str, Any]]] = {}
    for sup_id, org_id, org_name in org_rows:
        by_sup.setdefault(sup_id, []).append({"id": org_id, "name": org_name})
    for r in rows:
        r["organizations"] = by_sup.get(r["id"], [])
    return rows


async def _set_supervisor_organizations(
    db: AsyncSession, supervisor_id: UUID, organization_ids: list[UUID]
) -> None:
    """M2M tashkilotlarni qayta o'rnatadi (max 5)."""
    unique_ids = list(dict.fromkeys(organization_ids))[:5]
    await db.execute(
        SupervisorOrganization.__table__.delete().where(
            SupervisorOrganization.supervisor_id == supervisor_id
        )
    )
    for org_id in unique_ids:
        db.add(
            SupervisorOrganization(supervisor_id=supervisor_id, organization_id=org_id)
        )


async def list_supervisors(
    db: AsyncSession,
    offset: int,
    limit: int,
    organization_id: UUID | None = None,
    search: str | None = None,
    is_active: bool | None = None,
    faculty_id: UUID | None = None,
    include_unassigned: bool = False,
) -> tuple[list[dict[str, Any]], int]:
    base = _supervisor_base_select()
    count_stmt = (
        select(func.count(Supervisor.id))
        .select_from(Supervisor)
        .join(User, User.id == Supervisor.user_id)
    )

    def apply(stmt):  # type: ignore[no-untyped-def]
        if faculty_id:
            stmt = stmt.where(Supervisor.faculty_id == faculty_id)
        if organization_id:
            belongs = (
                select(SupervisorOrganization.id)
                .where(
                    SupervisorOrganization.supervisor_id == Supervisor.id,
                    SupervisorOrganization.organization_id == organization_id,
                )
                .exists()
            )
            if include_unassigned:
                # Biriktirish qoidasiga mos bo'lsin: tashkilotga umuman bog'lanmagan
                # supervizorni istalgan tashkilotga biriktirish mumkin
                # (services/practice_assignment.py: `if sup_org_ids and ...`).
                has_any_org = (
                    select(SupervisorOrganization.id)
                    .where(SupervisorOrganization.supervisor_id == Supervisor.id)
                    .exists()
                )
                stmt = stmt.where(or_(belongs, ~has_any_org))
            else:
                stmt = stmt.where(belongs)
        if is_active is not None:
            stmt = stmt.where(User.is_active.is_(is_active))
        if search:
            like = f"%{search.lower()}%"
            stmt = stmt.where(
                func.lower(User.first_name).like(like)
                | func.lower(User.last_name).like(like)
                | User.username.like(f"%{search}%")
            )
        return stmt

    base = apply(base)  # type: ignore[no-untyped-call]
    count_stmt = apply(count_stmt)  # type: ignore[no-untyped-call]

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (
        (
            await db.execute(
                base.order_by(User.last_name, User.first_name).offset(offset).limit(limit)
            )
        )
        .mappings()
        .all()
    )
    items = [_row_to_dict(dict(r)) for r in rows]
    await _hydrate_organizations(db, items)
    return items, total


async def get_supervisor(db: AsyncSession, id_: UUID) -> dict[str, Any]:
    row = (
        (await db.execute(_supervisor_base_select().where(Supervisor.id == id_))).mappings().first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Supervizor topilmadi: {id_}")
    item = _row_to_dict(dict(row))
    await _hydrate_organizations(db, [item])
    return item


async def create_supervisor(db: AsyncSession, data: BaseModel) -> dict[str, Any]:
    """User (role=supervisor) + Supervisor profile bir transactionda."""
    payload = data.model_dump(exclude_unset=True)

    # User yaratish
    user = User(
        username=payload["username"],
        password_hash=hash_password(payload["password"]),
        email=payload.get("email"),
        phone=payload.get("phone"),
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        middle_name=payload.get("middle_name"),
        role=UserRole.SUPERVISOR,
        is_active=True,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Shu username yoki email allaqachon mavjud",
        ) from e

    supervisor = Supervisor(
        user_id=user.id,
        position=payload["position"],
        specialty=payload.get("specialty"),
        experience_years=payload.get("experience_years"),
        faculty_id=payload.get("faculty_id"),
        department_id=payload.get("department_id"),
        capacity=payload.get("capacity", 5),
    )
    db.add(supervisor)
    try:
        await db.flush()
        await _set_supervisor_organizations(
            db, supervisor.id, payload.get("organization_ids") or []
        )
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Tashkilot/kafedra topilmadi yoki xatolik"
        ) from e

    return await get_supervisor(db, supervisor.id)


async def update_supervisor(db: AsyncSession, id_: UUID, data: BaseModel) -> dict[str, Any]:
    supervisor = await db.get(Supervisor, id_)
    if not supervisor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Supervizor topilmadi: {id_}")
    user = await db.get(User, supervisor.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User topilmadi")

    payload = data.model_dump(exclude_unset=True)
    user_fields = {"email", "phone", "first_name", "last_name", "middle_name"}
    sup_fields = {
        "position",
        "specialty",
        "experience_years",
        "faculty_id",
        "department_id",
        "capacity",
        "is_active",
    }

    organization_ids = payload.pop("organization_ids", None)

    for key, value in payload.items():
        if key in user_fields:
            setattr(user, key, value)
        elif key == "is_active":
            user.is_active = value
            supervisor.is_active = value
        elif key in sup_fields:
            setattr(supervisor, key, value)

    try:
        if organization_ids is not None:
            await _set_supervisor_organizations(db, supervisor.id, organization_ids)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "O'zgartirish mos emas") from e

    return await get_supervisor(db, supervisor.id)


async def update_credentials(
    db: AsyncSession, id_: UUID, data: BaseModel
) -> dict[str, Any]:
    """Admin orqali supervizor login/parolini yangilash."""
    supervisor = await db.get(Supervisor, id_)
    if not supervisor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Supervizor topilmadi: {id_}")
    user = await db.get(User, supervisor.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foydalanuvchi topilmadi")

    payload = data.model_dump(exclude_unset=True)
    new_username = payload.get("username")
    new_password = payload.get("password")

    if not new_username and not new_password:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Kamida username yoki parolni kiriting",
        )

    if new_username and new_username != user.username:
        user.username = new_username
    if new_password:
        user.password_hash = hash_password(new_password)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Bu username allaqachon band"
        ) from e

    return await get_supervisor(db, id_)


async def delete_supervisor(db: AsyncSession, id_: UUID) -> None:
    """Supervisor profile va bog'langan User'ni ham o'chiradi (CASCADE)."""
    supervisor = await db.get(Supervisor, id_)
    if not supervisor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Supervizor topilmadi: {id_}")
    user = await db.get(User, supervisor.user_id)
    try:
        if user:
            await db.delete(user)  # CASCADE Supervisor'ni ham o'chiradi
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Supervizorga bog'langan amaliyotlar bor — is_active=false qiling.",
        ) from e
