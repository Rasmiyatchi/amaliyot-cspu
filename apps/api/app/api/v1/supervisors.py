"""Supervisors endpoints — User + profile birgalikda."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile, status

from app.api.deps import RequireAdmin, RequireSupervisor
from app.db.session import SessionDep
from app.schemas.common import CredentialsUpdate, Paginated
from app.schemas.supervisor import SupervisorCreate, SupervisorRead, SupervisorUpdate
from app.schemas.supervisor_import import SupervisorImportResponse
from app.services import audit_log as audit
from app.services import supervisor as svc
from app.services import supervisor_import as import_svc
from app.services import supervisor_report as report_svc
from app.services.import_templates import build_supervisors_template

router = APIRouter(prefix="/supervisors", tags=["supervisors"])

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
_IMPORT_ALLOWED_MIME = {
    _XLSX_MIME,
    "application/vnd.ms-excel",
    "application/octet-stream",
}
_IMPORT_MAX_SIZE = 20 * 1024 * 1024


@router.get(
    "/import-template",
    summary="O'qituvchi import uchun namuna Excel shablonini yuklab olish",
)
async def supervisors_import_template(_: RequireAdmin) -> Response:
    return Response(
        content=build_supervisors_template(),
        media_type=_XLSX_MIME,
        headers={
            "Content-Disposition": 'attachment; filename="oqituvchilar_import_shablon.xlsx"'
        },
    )


@router.post(
    "/import",
    response_model=SupervisorImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: o'qituvchilarni Excel'dan import qilish",
    description=(
        "Namuna shablon ustunlari: FISh (yagona ustun), Fakultet, Kafedra, Lavozim, "
        "E-pochta. Header qatori dinamik aniqlanadi. Login berilmasa avtomatik "
        "generatsiya (login = parol). Fakultet nomi bo'yicha topiladi, kafedra yo'q "
        "bo'lsa avto-yaratiladi."
    ),
)
async def import_supervisors(
    request: Request,
    db: SessionDep,
    user: RequireAdmin,
    file: UploadFile = File(...),  # noqa: B008
) -> SupervisorImportResponse:
    if file.content_type and file.content_type not in _IMPORT_ALLOWED_MIME:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Qo'llab-quvvatlanmaydigan format: {file.content_type}. .xlsx yuklang.",
        )
    content = await file.read()
    if len(content) > _IMPORT_MAX_SIZE:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Fayl juda katta (max {_IMPORT_MAX_SIZE // 1024 // 1024} MB)",
        )
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fayl bo'sh")
    result = await import_svc.import_supervisors(db, content)
    await audit.log(
        db,
        actor=user,
        action="import",
        entity_type="supervisor",
        entity_id=None,
        summary=(
            f"O'qituvchilar importi: {result.created} qo'shildi, "
            f"{result.skipped} o'tkazildi, {len(result.errors)} xato"
        ),
        metadata={
            "file": file.filename,
            "created": result.created,
            "skipped": result.skipped,
            "errors": len(result.errors),
        },
        request=request,
    )
    await db.commit()
    return result


@router.get(
    "/me/report.pdf",
    summary="Supervizor: o'z talabalari bo'yicha yakuniy hisobot PDF",
)
async def my_report_pdf(db: SessionDep, user: RequireSupervisor) -> Response:
    pdf_bytes = await report_svc.render_pdf(db, user)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"amaliyot_hisoboti_{ts}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("", response_model=Paginated[SupervisorRead])
async def list_supervisors(
    db: SessionDep,
    _: RequireAdmin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    organization_id: UUID | None = None,
    search: str | None = Query(None, min_length=1, max_length=100),
    is_active: bool | None = None,
    faculty_id: UUID | None = None,
    include_unassigned: bool = Query(
        False,
        description="organization_id bilan: tashkilotga bog'lanmagan supervizorlarni ham qo'shish",
    ),
) -> Paginated[SupervisorRead]:
    offset = (page - 1) * page_size
    items, total = await svc.list_supervisors(
        db,
        offset,
        page_size,
        organization_id,
        search,
        is_active,
        faculty_id,
        include_unassigned,
    )
    return Paginated(
        items=[SupervisorRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_}", response_model=SupervisorRead)
async def get_supervisor(id_: UUID, db: SessionDep, _: RequireAdmin) -> SupervisorRead:
    return SupervisorRead.model_validate(await svc.get_supervisor(db, id_))


@router.post("", response_model=SupervisorRead, status_code=status.HTTP_201_CREATED)
async def create_supervisor(
    data: SupervisorCreate, request: Request, db: SessionDep, user: RequireAdmin
) -> SupervisorRead:
    result = await svc.create_supervisor(db, data)
    await audit.log(
        db,
        actor=user,
        action="create",
        entity_type="supervisor",
        entity_id=result.get("id"),
        summary=f"Supervizor qo'shildi: {result.get('full_name', '')}",
        request=request,
    )
    await db.commit()
    return SupervisorRead.model_validate(result)


@router.patch("/{id_}", response_model=SupervisorRead)
async def update_supervisor(
    id_: UUID,
    data: SupervisorUpdate,
    request: Request,
    db: SessionDep,
    user: RequireAdmin,
) -> SupervisorRead:
    result = await svc.update_supervisor(db, id_, data)
    await audit.log(
        db,
        actor=user,
        action="update",
        entity_type="supervisor",
        entity_id=id_,
        summary=f"Supervizor tahrirlandi: {result.get('full_name', '')}",
        metadata=data.model_dump(exclude_unset=True, mode="json"),
        request=request,
    )
    await db.commit()
    return SupervisorRead.model_validate(result)


@router.patch(
    "/{id_}/credentials",
    response_model=SupervisorRead,
    summary="Admin: supervizor login/parolini yangilash",
)
async def update_supervisor_credentials(
    id_: UUID,
    data: CredentialsUpdate,
    request: Request,
    db: SessionDep,
    user: RequireAdmin,
) -> SupervisorRead:
    result = await svc.update_credentials(db, id_, data)
    await audit.log(
        db,
        actor=user,
        action="login_reset",
        entity_type="supervisor",
        entity_id=id_,
        summary=f"Supervizor login/paroli o'zgartirildi: {result.get('full_name', '')}",
        request=request,
    )
    await db.commit()
    return SupervisorRead.model_validate(result)


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supervisor(
    id_: UUID, request: Request, db: SessionDep, user: RequireAdmin
) -> None:
    snapshot = await svc.get_supervisor(db, id_)
    await svc.delete_supervisor(db, id_)
    await audit.log(
        db,
        actor=user,
        action="delete",
        entity_type="supervisor",
        entity_id=id_,
        summary=f"Supervizor o'chirildi: {snapshot.get('full_name', '')}",
        request=request,
    )
    await db.commit()
