from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query, Request, status
from sqlalchemy import select

from app.api.deps import (
    CurrentUser,
    RequireAdmin,
    RequireStudent,
    RequireSuperAdmin,
    RequireSupervisor,
)
from app.db.session import SessionDep
from app.models.enums import AttendanceDayStatus, UserRole
from app.models.student import Student
from app.models.supervisor import Supervisor
from app.schemas.attendance import (
    AttendanceApproveRequest,
    AttendanceDayDetail,
    AttendanceDayRead,
    AttendanceMarkRedRequest,
    AttendanceOverrideRead,
    AttendanceOverrideRequest,
    AttendanceRejectRequest,
    CheckInRequest,
    CheckOutRequest,
)
from app.schemas.common import Paginated
from app.services import attendance as svc

router = APIRouter(prefix="/attendance", tags=["attendance"])


# ─── Admin/Supervizor: list + get ────────────────────────


@router.get("/days", response_model=Paginated[AttendanceDayRead])
async def list_days(
    db: SessionDep,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    assignment_id: UUID | None = None,
    student_id: UUID | None = None,
    status_filter: AttendanceDayStatus | None = Query(None, alias="status"),
    date_from: date | None = None,
    date_to: date | None = None,
    group_id: UUID | None = None,
    direction_id: UUID | None = None,
    faculty_id: UUID | None = None,
) -> Paginated[AttendanceDayRead]:
    # RBAC: Talaba faqat o'z davomatini ko'radi va avto-sync ishga tushadi
    if user.role == UserRole.STUDENT:
        stmt = select(Student.id).where(Student.user_id == user.id)
        current_student_id = (await db.execute(stmt)).scalar_one_or_none()
        if not current_student_id:
            return Paginated(items=[], total=0, page=page, page_size=page_size)
        student_id = current_student_id

    offset = (page - 1) * page_size
    items, total = await svc.list_days(
        db,
        offset,
        page_size,
        assignment_id=assignment_id,
        student_id=student_id,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        group_id=group_id,
        direction_id=direction_id,
        faculty_id=faculty_id,
    )
    return Paginated(
        items=[AttendanceDayRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/days/{day_id}", response_model=AttendanceDayDetail)
async def get_day(day_id: UUID, db: SessionDep, _: CurrentUser) -> AttendanceDayDetail:
    return AttendanceDayDetail.model_validate(await svc.get_day(db, day_id))


@router.get("/days/{day_id}/overrides", response_model=list[AttendanceOverrideRead])
async def list_day_overrides(
    day_id: UUID, db: SessionDep, _: RequireAdmin
) -> list[AttendanceOverrideRead]:
    items = await svc.list_overrides(db, day_id)
    return [AttendanceOverrideRead.model_validate(i) for i in items]


# ─── Student: check-in / check-out ──────────────────────


@router.post(
    "/assignments/{assignment_id}/check-in",
    response_model=AttendanceDayDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Talaba: Ishga kelish",
)
async def student_check_in(
    assignment_id: UUID,
    payload: CheckInRequest,
    db: SessionDep,
    user: RequireStudent,
) -> AttendanceDayDetail:
    return AttendanceDayDetail.model_validate(
        await svc.student_check_in(db, assignment_id, user.id, payload)
    )


@router.post(
    "/assignments/{assignment_id}/check-out",
    response_model=AttendanceDayDetail,
    summary="Talaba: Ishdan ketish",
)
async def student_check_out(
    assignment_id: UUID,
    payload: CheckOutRequest,
    db: SessionDep,
    user: RequireStudent,
) -> AttendanceDayDetail:
    return AttendanceDayDetail.model_validate(
        await svc.student_check_out(db, assignment_id, user.id, payload)
    )


@router.get(
    "/assignments/{assignment_id}/today",
    response_model=AttendanceDayDetail | None,
    summary="Talaba: bugungi holat",
)
async def student_today(
    assignment_id: UUID,
    db: SessionDep,
    user: RequireStudent,
) -> AttendanceDayDetail | None:
    data = await svc.student_today_status(db, assignment_id, user.id)
    if not data:
        return None
    return AttendanceDayDetail.model_validate(data)


# ─── Super Admin: approve / reject ────────────────────────────


@router.post(
    "/days/{day_id}/approve",
    response_model=AttendanceDayDetail,
    summary="Super Admin: Yashilga tasdiqlash",
)
async def admin_approve(
    day_id: UUID,
    payload: AttendanceApproveRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AttendanceDayDetail:
    from app.services import audit_log as audit

    result = await svc.admin_approve(db, day_id, user.id, payload)
    await audit.log(
        db,
        actor=user,
        action="approve",
        entity_type="attendance_day",
        entity_id=day_id,
        summary="Davomat tasdiqlandi (yashil)",
        metadata={"new_status": "green"},
        request=request,
    )
    await db.commit()
    return AttendanceDayDetail.model_validate(result)


@router.post(
    "/days/{day_id}/reject",
    response_model=AttendanceDayDetail,
    summary="Super Admin: Qizilga rad etish",
)
async def admin_reject(
    day_id: UUID,
    payload: AttendanceRejectRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AttendanceDayDetail:
    from app.services import audit_log as audit

    result = await svc.admin_reject(db, day_id, user.id, payload)
    await audit.log(
        db,
        actor=user,
        action="reject",
        entity_type="attendance_day",
        entity_id=day_id,
        summary="Davomat rad etildi (qizil)",
        metadata={"new_status": "red", "note": payload.note},
        request=request,
    )
    await db.commit()
    return AttendanceDayDetail.model_validate(result)


# ─── Super Admin: mark red ───────────────────────────────────


@router.post(
    "/assignments/{assignment_id}/mark-red",
    response_model=AttendanceDayDetail,
    summary="Super Admin: Check-in yo'q kunni qizilga",
)
async def admin_mark_red(
    assignment_id: UUID,
    payload: AttendanceMarkRedRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AttendanceDayDetail:
    from app.services import audit_log as audit

    result = await svc.admin_mark_red(db, assignment_id, payload)
    await audit.log(
        db,
        actor=user,
        action="update",
        entity_type="attendance_day",
        entity_id=result.get("id") if isinstance(result, dict) else None,
        summary=f"SuperAdmin davomatni qizil qildi ({payload.date})",
        metadata={
            "new_status": "red",
            "date": str(payload.date),
            "assignment_id": str(assignment_id),
            "note": payload.note,
        },
        request=request,
    )
    await db.commit()
    return AttendanceDayDetail.model_validate(result)


# ─── Super Admin: override ─────────────────────────────


@router.post(
    "/days/{day_id}/override",
    response_model=AttendanceDayDetail,
    summary="Super Admin: qizil ↔ yashil override (sabab majburiy)",
)
async def super_admin_override(
    day_id: UUID,
    payload: AttendanceOverrideRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AttendanceDayDetail:
    from app.services import audit_log as audit

    result = await svc.super_admin_override(db, day_id, user.id, payload)
    await audit.log(
        db,
        actor=user,
        action="override",
        entity_type="attendance_day",
        entity_id=day_id,
        summary=f"Davomat override → {payload.new_status.value}",
        metadata={"reason": payload.reason, "new_status": payload.new_status.value},
        request=request,
    )
    await db.commit()
    return AttendanceDayDetail.model_validate(result)
