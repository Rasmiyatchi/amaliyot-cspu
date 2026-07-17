"""Export endpoints — CSV qaytaradi.

Hammasi admin / super_admin uchun. Filtr parametrlari list endpoint'lari bilan bir xil.
"""

from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Query, Request, Response

from app.api.deps import RequireAdmin
from app.db.session import SessionDep
from app.models.enums import AttendanceDayStatus, FinalReportStatus, StudentStatus
from app.services import exports as svc
from app.services.import_templates import build_student_credentials_xlsx

router = APIRouter(prefix="/exports", tags=["exports"])

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _csv_response(content: bytes, prefix: str) -> Response:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}_{ts}.csv"
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/credentials.xlsx",
    summary="Talabalar login/parol jadvali (Excel) — filtrlar bilan",
)
async def export_credentials(
    request: Request,
    db: SessionDep,
    user: RequireAdmin,
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=5),
    academic_year_id: UUID | None = None,
    status: StudentStatus | None = None,
    search: str | None = None,
) -> Response:
    from app.services import audit_log as audit

    rows = await svc.export_student_credentials(
        db,
        faculty_id=faculty_id,
        direction_id=direction_id,
        group_id=group_id,
        course=course,
        academic_year_id=academic_year_id,
        status=status,
        search=search,
    )
    # Ommaviy login/parol eksporti — maxfiy amal, albatta loglanadi
    await audit.log(
        db,
        actor=user,
        action="export",
        entity_type="student_credentials",
        entity_id=None,
        summary=f"Login/parol eksporti ({len(rows)} ta talaba)",
        metadata={
            "count": len(rows),
            "faculty_id": str(faculty_id) if faculty_id else None,
            "group_id": str(group_id) if group_id else None,
            "course": course,
        },
        request=request,
    )
    await db.commit()

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return Response(
        content=build_student_credentials_xlsx(rows),
        media_type=_XLSX_MIME,
        headers={
            "Content-Disposition": f'attachment; filename="login_parol_{ts}.xlsx"'
        },
    )


@router.get("/students.csv", summary="Talabalar CSV (filtrlar bilan)")
async def export_students(
    db: SessionDep,
    _: RequireAdmin,
    faculty_id: UUID | None = None,
    direction_id: UUID | None = None,
    group_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=5),
    academic_year_id: UUID | None = None,
    status: StudentStatus | None = None,
    search: str | None = None,
) -> Response:
    content = await svc.export_students(
        db,
        faculty_id=faculty_id,
        direction_id=direction_id,
        group_id=group_id,
        course=course,
        academic_year_id=academic_year_id,
        status=status,
        search=search,
    )
    return _csv_response(content, "talabalar")


@router.get("/attendance.csv", summary="Davomat CSV")
async def export_attendance(
    db: SessionDep,
    _: RequireAdmin,
    academic_year_id: UUID | None = None,
    assignment_id: UUID | None = None,
    student_id: UUID | None = None,
    status: AttendanceDayStatus | None = None,
    group_id: UUID | None = None,
    direction_id: UUID | None = None,
    faculty_id: UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> Response:
    content = await svc.export_attendance(
        db,
        academic_year_id=academic_year_id,
        assignment_id=assignment_id,
        student_id=student_id,
        status=status,
        group_id=group_id,
        direction_id=direction_id,
        faculty_id=faculty_id,
        date_from=date_from,
        date_to=date_to,
    )
    return _csv_response(content, "davomat")


@router.get("/assignments.csv", summary="Biriktirishlar CSV")
async def export_assignments(
    db: SessionDep, _: RequireAdmin, academic_year_id: UUID | None = None
) -> Response:
    content = await svc.export_assignments(db, academic_year_id=academic_year_id)
    return _csv_response(content, "biriktirishlar")


@router.get("/final-reports.csv", summary="Yakuniy hisobotlar CSV (filtrlar bilan)")
async def export_final_reports(
    db: SessionDep,
    _: RequireAdmin,
    academic_year_id: UUID | None = None,
    status: FinalReportStatus | None = None,
    group_id: UUID | None = None,
    direction_id: UUID | None = None,
    faculty_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=5),
    search: str | None = None,
) -> Response:
    content = await svc.export_final_reports(
        db,
        academic_year_id=academic_year_id,
        status=status,
        group_id=group_id,
        direction_id=direction_id,
        faculty_id=faculty_id,
        course=course,
        search=search,
    )
    return _csv_response(content, "yakuniy_hisobotlar")
