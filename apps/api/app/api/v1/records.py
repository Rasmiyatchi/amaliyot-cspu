"""Qaydnomalar (records) endpointlari — agregatsiya + Excel + PDF."""

from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Query, Response

from app.api.deps import RequireAdmin
from app.core.config import settings
from app.db.session import SessionDep
from app.models.enums import DegreeType, EducationForm
from app.schemas.record import RecordRow
from app.services import pdf as pdf_svc
from app.services import records as svc
from app.services.import_templates import build_records_xlsx

router = APIRouter(prefix="/records", tags=["records"])

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _filters(
    academic_year_id: UUID | None,
    direction_id: UUID | None,
    course: int | None,
    group_id: UUID | None,
    supervisor_id: UUID | None,
    education_form: EducationForm | None,
    degree_type: DegreeType | None,
    start_from: date | None,
    end_to: date | None,
    search: str | None,
) -> dict:
    return {
        "academic_year_id": academic_year_id,
        "direction_id": direction_id,
        "course": course,
        "group_id": group_id,
        "supervisor_id": supervisor_id,
        "education_form": education_form,
        "degree_type": degree_type,
        "start_from": start_from,
        "end_to": end_to,
        "search": search,
    }


@router.get("", response_model=list[RecordRow], summary="Qaydnomalar ro'yxati")
async def list_records(
    db: SessionDep,
    _: RequireAdmin,
    academic_year_id: UUID | None = None,
    direction_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=5),
    group_id: UUID | None = None,
    supervisor_id: UUID | None = None,
    education_form: EducationForm | None = None,
    degree_type: DegreeType | None = None,
    start_from: date | None = None,
    end_to: date | None = None,
    search: str | None = Query(None, min_length=1, max_length=100),
) -> list[RecordRow]:
    rows = await svc.list_records(
        db,
        **_filters(
            academic_year_id, direction_id, course, group_id, supervisor_id,
            education_form, degree_type, start_from, end_to, search,
        ),
    )
    return [RecordRow.model_validate(r) for r in rows]


@router.get("/export.xlsx", summary="Qaydnomalarni Excel'ga yuklash")
async def export_xlsx(
    db: SessionDep,
    _: RequireAdmin,
    academic_year_id: UUID | None = None,
    direction_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=5),
    group_id: UUID | None = None,
    supervisor_id: UUID | None = None,
    education_form: EducationForm | None = None,
    degree_type: DegreeType | None = None,
    start_from: date | None = None,
    end_to: date | None = None,
    search: str | None = Query(None, min_length=1, max_length=100),
) -> Response:
    rows = await svc.list_records(
        db,
        **_filters(
            academic_year_id, direction_id, course, group_id, supervisor_id,
            education_form, degree_type, start_from, end_to, search,
        ),
    )
    return Response(
        content=build_records_xlsx(rows),
        media_type=_XLSX_MIME,
        headers={"Content-Disposition": 'attachment; filename="qaydnomalar.xlsx"'},
    )


@router.get("/baholash-qaydnomasi.pdf", summary="Baholash qaydnomasi PDF")
async def baholash_qaydnomasi(
    db: SessionDep,
    _: RequireAdmin,
    academic_year_id: UUID | None = None,
    direction_id: UUID | None = None,
    course: int | None = Query(None, ge=1, le=5),
    group_id: UUID | None = None,
    supervisor_id: UUID | None = None,
    education_form: EducationForm | None = None,
    degree_type: DegreeType | None = None,
    start_from: date | None = None,
    end_to: date | None = None,
    search: str | None = Query(None, min_length=1, max_length=100),
) -> Response:
    rows = await svc.list_records(
        db,
        **_filters(
            academic_year_id, direction_id, course, group_id, supervisor_id,
            education_form, degree_type, start_from, end_to, search,
        ),
    )
    pdf_bytes = pdf_svc.render_records_pdf(
        {
            "rows": rows,
            "app_name": settings.APP_NAME,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="baholash_qaydnomasi.pdf"'},
    )
