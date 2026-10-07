"""Kirish cheklovlari — faqat super admin boshqaradi."""

from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.deps import RequireSuperAdmin
from app.db.session import SessionDep
from app.schemas.access_restriction import AccessRestrictionCreate, AccessRestrictionRead
from app.services import access_restriction as svc
from app.services import audit_log as audit

router = APIRouter(prefix="/access-restrictions", tags=["access-restrictions"])


@router.get("", response_model=list[AccessRestrictionRead])
async def list_restrictions(
    db: SessionDep,
    _: RequireSuperAdmin,
    effective_only: bool = Query(False, description="Faqat hozir amalda bo'lganlar"),
) -> list[AccessRestrictionRead]:
    rows = await svc.list_restrictions(db, effective_only=effective_only)
    return [AccessRestrictionRead.model_validate(r) for r in rows]


@router.post("", response_model=AccessRestrictionRead, status_code=status.HTTP_201_CREATED)
async def create_restriction(
    data: AccessRestrictionCreate, request: Request, db: SessionDep, user: RequireSuperAdmin
) -> AccessRestrictionRead:
    row = await svc.create_restriction(db, data.model_dump(), user)
    await audit.log(
        db,
        actor=user,
        action="create",
        entity_type="access_restriction",
        entity_id=row["id"],
        summary=f"Kirish cheklandi: {row['target_name'] or row['target_type']} ({row['mode']})",
        metadata={
            "target_type": str(row["target_type"]),
            "user_id": str(row["user_id"]) if row["user_id"] else None,
            "group_id": str(row["group_id"]) if row["group_id"] else None,
            "mode": str(row["mode"]),
            "ends_at": row["ends_at"].isoformat() if row["ends_at"] else None,
            "note": row["note"],
        },
        request=request,
    )
    await db.commit()
    svc.invalidate_cache()  # commit'dan keyin — oraliqda keshga tushgan eski holat chiqib ketsin
    return AccessRestrictionRead.model_validate(row)


@router.post("/{id_}/deactivate", response_model=AccessRestrictionRead)
async def deactivate_restriction(
    id_: UUID, request: Request, db: SessionDep, user: RequireSuperAdmin
) -> AccessRestrictionRead:
    row = await svc.deactivate_restriction(db, id_)
    await audit.log(
        db,
        actor=user,
        action="update",
        entity_type="access_restriction",
        entity_id=id_,
        summary=f"Kirish cheklovi olib tashlandi: {row['target_name'] or row['target_type']}",
        request=request,
    )
    await db.commit()
    svc.invalidate_cache()  # commit'dan keyin — oraliqda keshga tushgan eski holat chiqib ketsin
    return AccessRestrictionRead.model_validate(row)


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_restriction(
    id_: UUID, request: Request, db: SessionDep, user: RequireSuperAdmin
) -> None:
    snapshot = await svc.delete_restriction(db, id_)
    await audit.log(
        db,
        actor=user,
        action="delete",
        entity_type="access_restriction",
        entity_id=id_,
        summary="Kirish cheklovi o'chirildi",
        metadata=snapshot,
        request=request,
    )
    await db.commit()
    svc.invalidate_cache()  # commit'dan keyin — oraliqda keshga tushgan eski holat chiqib ketsin
