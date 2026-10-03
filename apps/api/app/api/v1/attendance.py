"""Attendance endpoints — ro'yxat, tafsilot, talaba check-in/out, super admin boshqaruvi."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import select

from app.api.deps import (
    CurrentUser,
    RequireAdmin,
    RequireStudent,
    RequireSuperAdmin,
)
from app.db.session import SessionDep
from app.models.enums import AssignmentStatus, AttendanceDayStatus, Semester, UserRole
from app.models.student import Student
from app.schemas.attendance import (
    AttendanceApproveRequest,
    AttendanceBulkRangeSetRequest,
    AttendanceBulkRangeSetResult,
    AttendanceDayDetail,
    AttendanceDayRead,
    AttendanceDaySetRequest,
    AttendanceMarkRedRequest,
    AttendanceOverrideRead,
    AttendanceOverrideRequest,
    AttendanceRangeSetRequest,
    AttendanceRangeSetResult,
    AttendanceRejectRequest,
    AttendanceSummaryRow,
    BulkAttendanceActionRequest,
    BulkAttendanceActionResult,
    CheckInRequest,
    CheckOutRequest,
)
from app.schemas.common import Paginated
from app.services import attendance as svc
from app.services import audit_log as audit

router = APIRouter(prefix="/attendance", tags=["attendance"])


# ─── Ro'yxat + tafsilot (rolga ko'ra cheklangan) ─────────


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
    search: str | None = Query(None, min_length=1, max_length=100),
    academic_year_id: UUID | None = None,
    semester: Semester | None = None,
) -> Paginated[AttendanceDayRead]:
    supervisor_user_id: UUID | None = None

    # RBAC: talaba faqat o'zini, supervizor faqat o'z talabalarini, fakultet admini o'z fakultetini
    if user.role == UserRole.STUDENT:
        stmt = select(Student.id).where(Student.user_id == user.id)
        current_student_id = (await db.execute(stmt)).scalar_one_or_none()
        if not current_student_id:
            return Paginated(items=[], total=0, page=page, page_size=page_size)
        student_id = current_student_id
    elif user.role == UserRole.SUPERVISOR:
        supervisor_user_id = user.id
    elif user.role == UserRole.ADMIN and user.faculty_id:
        faculty_id = user.faculty_id

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
        search=search,
        supervisor_user_id=supervisor_user_id,
        academic_year_id=academic_year_id,
        semester=semester,
    )
    return Paginated(
        items=[AttendanceDayRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/summary",
    response_model=Paginated[AttendanceSummaryRow],
    summary="Admin: talaba-markazli davomat jamlanmasi",
)
async def attendance_summary(
    db: SessionDep,
    user: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    practice_type_id: UUID | None = None,
    semester: Semester | None = None,
    assignment_status: AssignmentStatus | None = None,
    include_archived: bool = False,
    sort: str = Query("name", pattern="^(name|percent_asc|percent_desc|red_desc)$"),
) -> Paginated[AttendanceSummaryRow]:
    if user.role == UserRole.ADMIN and user.faculty_id:
        faculty_id = user.faculty_id
    offset = (page - 1) * page_size
    items, total = await svc.summary(
        db,
        offset,
        page_size,
        search=search,
        faculty_id=faculty_id,
        direction_id=direction_id,
        group_id=group_id,
        academic_year_id=academic_year_id,
        practice_type_id=practice_type_id,
        semester=semester,
        assignment_status=assignment_status,
        include_archived=include_archived,
        sort=sort,
    )
    return Paginated(
        items=[AttendanceSummaryRow.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/days/{day_id}", response_model=AttendanceDayDetail)
async def get_day(day_id: UUID, db: SessionDep, user: CurrentUser) -> AttendanceDayDetail:
    await svc.assert_day_visible_to(db, day_id, user)
    return AttendanceDayDetail.model_validate(await svc.get_day(db, day_id))


@router.get("/days/{day_id}/overrides", response_model=list[AttendanceOverrideRead])
async def list_day_overrides(
    day_id: UUID, db: SessionDep, user: RequireAdmin
) -> list[AttendanceOverrideRead]:
    await svc.assert_day_visible_to(db, day_id, user)
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
    result = await svc.admin_mark_red(db, assignment_id, payload)
    await audit.log(
        db,
        actor=user,
        action="update",
        entity_type="attendance_day",
        entity_id=result.get("id"),
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


# ─── Super Admin: kunni to'liq tahrirlash (upsert) ─────────


@router.put(
    "/assignments/{assignment_id}/days/{day}",
    response_model=AttendanceDayDetail,
    summary="Super Admin: kunni sana bo'yicha yaratish/tahrirlash (oldindan yashil ham)",
)
async def super_admin_set_day_by_date(
    assignment_id: UUID,
    day: date,
    payload: AttendanceDaySetRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AttendanceDayDetail:
    result = await svc.super_admin_set_day(
        db,
        super_admin_user_id=user.id,
        payload=payload,
        assignment_id=assignment_id,
        day=day,
    )
    await audit.log(
        db,
        actor=user,
        action="override",
        entity_type="attendance_day",
        entity_id=result.get("id"),
        summary=f"Davomat kuni belgilandi ({day} → {payload.status.value})",
        metadata={
            "assignment_id": str(assignment_id),
            "date": str(day),
            "new_status": payload.status.value,
            "reason": payload.reason,
            "check_in_at": payload.check_in_at.isoformat() if payload.check_in_at else None,
            "check_out_at": payload.check_out_at.isoformat() if payload.check_out_at else None,
        },
        request=request,
    )
    await db.commit()
    return AttendanceDayDetail.model_validate(result)


@router.patch(
    "/days/{day_id}",
    response_model=AttendanceDayDetail,
    summary="Super Admin: mavjud kunni to'liq tahrirlash (status, vaqtlar, izoh)",
)
async def super_admin_edit_day(
    day_id: UUID,
    payload: AttendanceDaySetRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AttendanceDayDetail:
    result = await svc.super_admin_set_day(
        db, super_admin_user_id=user.id, payload=payload, day_id=day_id
    )
    await audit.log(
        db,
        actor=user,
        action="override",
        entity_type="attendance_day",
        entity_id=day_id,
        summary=f"Davomat kuni tahrirlandi ({result.get('date')} → {payload.status.value})",
        metadata={
            "new_status": payload.status.value,
            "reason": payload.reason,
            "check_in_at": payload.check_in_at.isoformat() if payload.check_in_at else None,
            "check_out_at": payload.check_out_at.isoformat() if payload.check_out_at else None,
        },
        request=request,
    )
    await db.commit()
    return AttendanceDayDetail.model_validate(result)


# ─── Super Admin: sana oralig'i / oy ───────────────────────


@router.post(
    "/assignments/{assignment_id}/days/bulk-set",
    response_model=AttendanceRangeSetResult,
    summary="Super Admin: sana oralig'ini (oyni) oldindan yashil/qizil qilish",
)
async def super_admin_set_range(
    assignment_id: UUID,
    payload: AttendanceRangeSetRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AttendanceRangeSetResult:
    result = await svc.super_admin_set_range(db, assignment_id, user.id, payload)
    await audit.log(
        db,
        actor=user,
        action="bulk_update",
        entity_type="attendance_day",
        entity_id=None,
        summary=(
            f"Davomat oralig'i belgilandi {result['date_from']}–{result['date_to']} → "
            f"{payload.status.value} ({result['created']} yangi, {result['updated']} yangilandi)"
        ),
        metadata={
            "assignment_id": str(assignment_id),
            "new_status": payload.status.value,
            "mode": payload.mode,
            "reason": payload.reason,
            **{k: (str(v) if isinstance(v, date) else v) for k, v in result.items()},
        },
        request=request,
    )
    await db.commit()
    return AttendanceRangeSetResult.model_validate(result)


@router.post(
    "/bulk-set-range",
    response_model=AttendanceBulkRangeSetResult,
    summary="Super Admin: bir xil oraliqni ko'p talaba uchun belgilash",
)
async def super_admin_bulk_set_range(
    payload: AttendanceBulkRangeSetRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> AttendanceBulkRangeSetResult:
    result = await svc.super_admin_bulk_set_range(db, user.id, payload)
    await audit.log(
        db,
        actor=user,
        action="bulk_update",
        entity_type="attendance_day",
        entity_id=None,
        summary=(
            f"Davomat oralig'i {payload.date_from}–{payload.date_to} → {payload.status.value} "
            f"({result['assignments']} biriktirish, {result['created']} yangi, "
            f"{result['updated']} yangilandi)"
        ),
        metadata={
            "assignment_ids": [str(a) for a in payload.assignment_ids],
            "new_status": payload.status.value,
            "mode": payload.mode,
            "reason": payload.reason,
            "created": result["created"],
            "updated": result["updated"],
            "skipped": result["skipped"],
            "failed": [
                {"assignment_id": str(f["assignment_id"]), "error": f["error"]}
                for f in result["failed"]
            ],
        },
        request=request,
    )
    await db.commit()
    return AttendanceBulkRangeSetResult.model_validate(result)


# ─── Super Admin: bulk update (tanlangan kunlar) ──────────


@router.post(
    "/bulk-update",
    response_model=BulkAttendanceActionResult,
    summary="Super Admin: Davomatni ommaviy tasdiqlash / rad etish",
)
async def super_admin_bulk_update(
    payload: BulkAttendanceActionRequest,
    request: Request,
    db: SessionDep,
    user: RequireSuperAdmin,
) -> BulkAttendanceActionResult:
    if payload.status == AttendanceDayStatus.RED and not (payload.note or "").strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Rad etish sababini kiriting")
    res = await svc.bulk_update_status(db, payload.day_ids, payload.status, user.id, payload.note)
    await audit.log(
        db,
        actor=user,
        action="bulk_update",
        entity_type="attendance_day",
        entity_id=None,
        summary=(
            f"Davomat ommaviy yangilandi ({res['updated_count']} ta -> {payload.status.value})"
        ),
        metadata={
            "new_status": payload.status.value,
            "count": res["updated_count"],
            "note": payload.note,
        },
        request=request,
    )
    await db.commit()
    return BulkAttendanceActionResult.model_validate(res)
