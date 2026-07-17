"""Students endpoints — list/get/create/update/delete (admin-only)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.models.enums import StudentStatus
from app.schemas.common import CredentialsUpdate, Paginated
from app.schemas.student import (
    StudentBulkDeleteError,
    StudentBulkDeleteRequest,
    StudentBulkDeleteResult,
    StudentCreate,
    StudentRead,
    StudentUpdate,
)
from app.services import audit_log as audit
from app.services.student import create_student as svc_create_student
from app.services.student import delete_student as svc_delete_student
from app.services.student import get_student as svc_get_student
from app.services.student import list_students as svc_list_students
from app.services.student import reset_device as svc_reset_device
from app.services.student import update_credentials as svc_update_credentials
from app.services.student import update_student as svc_update_student

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=Paginated[StudentRead])
async def list_students(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=5),
    academic_year_id: UUID | None = None,
    status_filter: StudentStatus | None = Query(None, alias="status"),
    search: str | None = Query(None, min_length=1, max_length=100),
) -> Paginated[StudentRead]:
    offset = (page - 1) * page_size
    items, total = await svc_list_students(
        db,
        offset,
        page_size,
        faculty_id,
        direction_id,
        group_id,
        course,
        academic_year_id,
        status_filter,
        search,
    )
    return Paginated(
        items=[StudentRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_}", response_model=StudentRead)
async def get_student(id_: UUID, db: SessionDep, _: RequireAdmin) -> StudentRead:
    return StudentRead.model_validate(await svc_get_student(db, id_))


@router.post(
    "",
    response_model=StudentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: yakka talaba qo'shish",
)
async def create_student(
    data: StudentCreate,
    request: Request,
    db: SessionDep,
    user: RequireAdmin,
) -> StudentRead:
    result = await svc_create_student(db, data)
    full_name = f"{data.last_name} {data.first_name}".strip()
    await audit.log(
        db,
        actor=user,
        action="create",
        entity_type="student",
        entity_id=result["id"],
        summary=f"Yangi talaba: {full_name}",
        request=request,
    )
    await db.commit()
    return StudentRead.model_validate(result)


@router.patch(
    "/{id_}",
    response_model=StudentRead,
    summary="Admin: talaba ma'lumotlarini tahrirlash",
)
async def update_student(
    id_: UUID,
    data: StudentUpdate,
    request: Request,
    db: SessionDep,
    user: RequireAdmin,
) -> StudentRead:
    result = await svc_update_student(db, id_, data)
    full_name = result.get("full_name", "")
    await audit.log(
        db,
        actor=user,
        action="update",
        entity_type="student",
        entity_id=id_,
        summary=f"Talaba tahrirlandi: {full_name}",
        metadata={"changed_fields": list(data.model_dump(exclude_unset=True).keys())},
        request=request,
    )
    await db.commit()
    return StudentRead.model_validate(result)


@router.post(
    "/bulk-delete",
    response_model=StudentBulkDeleteResult,
    summary="Admin: ko'p tanlangan talabalarni o'chirish",
)
async def bulk_delete_students(
    payload: StudentBulkDeleteRequest,
    request: Request,
    db: SessionDep,
    user: RequireAdmin,
) -> StudentBulkDeleteResult:
    """Har bir talaba alohida o'chiriladi — biri xato bersa (masalan amaliyoti bor)
    qolganlari o'chaveradi va xatolar ro'yxatda qaytariladi."""
    deleted = 0
    failed: list[StudentBulkDeleteError] = []

    for sid in payload.ids:
        full_name: str | None = None
        try:
            student = await svc_get_student(db, sid)
            full_name = student.get("full_name")
            await svc_delete_student(db, sid)
            await audit.log(
                db,
                actor=user,
                action="delete",
                entity_type="student",
                entity_id=sid,
                summary=f"Talaba o'chirildi (ommaviy): {full_name or sid}",
                request=request,
            )
            await db.commit()
            deleted += 1
        except HTTPException as e:
            await db.rollback()
            failed.append(
                StudentBulkDeleteError(id=sid, full_name=full_name, error=str(e.detail))
            )
        except Exception as e:  # noqa: BLE001
            await db.rollback()
            failed.append(
                StudentBulkDeleteError(id=sid, full_name=full_name, error=str(e))
            )

    return StudentBulkDeleteResult(
        requested=len(payload.ids), deleted=deleted, failed=failed
    )


@router.delete(
    "/{id_}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin: talabani o'chirish",
)
async def delete_student(
    id_: UUID, request: Request, db: SessionDep, user: RequireAdmin
) -> None:
    # Snapshot for audit before delete
    student = await svc_get_student(db, id_)
    full_name = student.get("full_name", "")
    await svc_delete_student(db, id_)
    await audit.log(
        db,
        actor=user,
        action="delete",
        entity_type="student",
        entity_id=id_,
        summary=f"Talaba o'chirildi: {full_name}",
        request=request,
    )
    await db.commit()


@router.patch(
    "/{id_}/credentials",
    response_model=StudentRead,
    summary="Admin: talaba login/parolini yangilash",
)
async def update_student_credentials(
    id_: UUID, data: CredentialsUpdate, db: SessionDep, _: RequireAdmin
) -> StudentRead:
    return StudentRead.model_validate(await svc_update_credentials(db, id_, data))


@router.post(
    "/{id_}/reset-device",
    response_model=StudentRead,
    summary="Admin: talabaning bog'langan qurilmasini o'chirish",
)
async def reset_student_device(
    id_: UUID, db: SessionDep, _: RequireAdmin
) -> StudentRead:
    return StudentRead.model_validate(await svc_reset_device(db, id_))
