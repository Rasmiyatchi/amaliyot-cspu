"""Attendance endpoints — davomat."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.deps import (
    CurrentUser,
    RequireAdmin,
    RequireStudent,
    RequireSuperAdmin,
    RequireSupervisor,
)
from app.db.session import SessionDep
from app.models.enums import AttendanceDayStatus
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
    page_size: int = Query(50, ge=1, le=200),
    assignment_id: UUID | None = None,
    student_id: UUID | None = None,
    status_filter: AttendanceDayStatus | None = Query(None, alias="status"),
    date_from: date | None = None,
    date_to: date | None = None,
    group_id: UUID | None = None,
    direction_id: UUID | None = None,
    faculty_id: UUID | None = None,
) -> Paginated[AttendanceDayRead]:
    # RBAC: admin/supervisor/student hammasi foydalana oladi; filtr farqli
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


# ─── Supervizor: approve / reject ──────────────────────


@router.post("/days/{day_id}/approve", response_model=AttendanceDayDetail)
async def supervisor_approve(
    day_id: UUID,
    payload: AttendanceApproveRequest,
    db: SessionDep,
    user: RequireSupervisor,
) -> AttendanceDayDetail:
    return AttendanceDayDetail.model_validate(
        await svc.supervisor_approve(db, day_id, user.id, payload)
    )


@router.post("/days/{day_id}/reject", response_model=AttendanceDayDetail)
async def supervisor_reject(
    day_id: UUID,
    payload: AttendanceRejectRequest,
    db: SessionDep,
    user: RequireSupervisor,
) -> AttendanceDayDetail:
    return AttendanceDayDetail.model_validate(
        await svc.supervisor_reject(db, day_id, user.id, payload)
    )


# ─── Admin: mark red ───────────────────────────────────


@router.post(
    "/assignments/{assignment_id}/mark-red",
    response_model=AttendanceDayDetail,
    summary="Admin: Check-in yo'q kunni qizilga",
)
async def admin_mark_red(
    assignment_id: UUID,
    payload: AttendanceMarkRedRequest,
    db: SessionDep,
    _: RequireAdmin,
) -> AttendanceDayDetail:
    return AttendanceDayDetail.model_validate(
        await svc.admin_mark_red(db, assignment_id, payload)
    )


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
