"""Shartnoma shablonlari (DOCX) endpointlari — faqat Super Admin."""

import contextlib
from uuid import UUID

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, RequireSuperAdmin
from app.db.session import SessionDep
from app.schemas.contract_template import (
    ContractTemplateDocRead,
    ContractTemplateDocUpdate,
    TemplateFormResponse,
)
from app.services import contract_template as svc

router = APIRouter(prefix="/contract-templates", tags=["contract-templates"])

_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.get("", response_model=list[ContractTemplateDocRead])
async def list_templates(db: SessionDep, _: RequireSuperAdmin) -> list[ContractTemplateDocRead]:
    items = await svc.list_templates(db)
    return [ContractTemplateDocRead.model_validate(i) for i in items]


@router.get("/variables")
async def get_allowed_variables(_: RequireSuperAdmin) -> list[dict[str, str]]:
    """Shartnoma shablonlari uchun ruxsat etilgan o'zgaruvchilar ro'yxati.

    source=system: tizimdan avtomatik olinadi (talaba profili, sana, va h.k.)
    source=student_input: talaba kiritishi kerak
    """
    return [
        # ─── System variables (avtomatik to'ldiriladi) ─────
        {"key": "contract_number", "label": "Shartnoma raqami", "source": "system"},
        {"key": "contract_day", "label": "Shartnoma kuni", "source": "system"},
        {"key": "contract_month", "label": "Shartnoma oyi", "source": "system"},
        {"key": "contract_year", "label": "Shartnoma yili", "source": "system"},
        {"key": "contract_date", "label": "Shartnoma sanasi", "source": "system"},
        {"key": "student_full_name", "label": "Talabaning F.I.Sh.", "source": "system"},
        {"key": "student_first_name", "label": "Talabaning ismi", "source": "system"},
        {"key": "student_last_name", "label": "Talabaning familiyasi", "source": "system"},
        {"key": "faculty_name", "label": "Fakulteti", "source": "system"},
        {"key": "specialty_name", "label": "Ta'lim yo'nalishi", "source": "system"},
        {"key": "course", "label": "Kursi", "source": "system"},
        {"key": "group_name", "label": "Guruhi", "source": "system"},
        {"key": "education_form", "label": "Ta'lim shakli", "source": "system"},
        {"key": "academic_year", "label": "O'quv yili", "source": "system"},
        {"key": "university_name", "label": "Universitet nomi", "source": "system"},
        {"key": "university_rector_full_name", "label": "Rektor F.I.Sh.", "source": "system"},
        {"key": "qr_code", "label": "QR-Kod joyi", "source": "system"},
        # ─── Student input variables (talaba kiritadi) ────
        {"key": "organization_name", "label": "Tashkilot nomi", "source": "student_input"},
        {"key": "organization_address", "label": "Tashkilot manzili", "source": "student_input"},
        {"key": "organization_type", "label": "Tashkilot turi", "source": "student_input"},
        {
            "key": "organization_email",
            "label": "Tashkilot elektron pochtasi",
            "source": "student_input",
        },
        {
            "key": "organization_phone",
            "label": "Tashkilot telefon raqami",
            "source": "student_input",
        },
        {
            "key": "organization_director",
            "label": "Tashkilot rahbari (F.I.Sh)",
            "source": "student_input",
        },
        {"key": "practice_place", "label": "Amaliyot o'tash joyi", "source": "student_input"},
        {
            "key": "practice_department",
            "label": "Amaliyot o'tash bo'limi",
            "source": "student_input",
        },
        {"key": "school_number", "label": "Maktab raqami", "source": "student_input"},
        {"key": "school_name", "label": "Maktab nomi", "source": "student_input"},
        {"key": "school_district", "label": "Maktab joylashgan tuman", "source": "student_input"},
        {
            "key": "school_director_name",
            "label": "Maktab direktori (F.I.Sh)",
            "source": "student_input",
        },
        {"key": "company_name", "label": "Korxona nomi", "source": "student_input"},
        {
            "key": "company_director_full_name",
            "label": "Korxona rahbari (F.I.Sh)",
            "source": "student_input",
        },
        {
            "key": "practice_start_date",
            "label": "Amaliyot boshlanish sanasi",
            "source": "student_input",
        },
        {"key": "practice_end_date", "label": "Amaliyot tugash sanasi", "source": "student_input"},
        {"key": "practice_field", "label": "Amaliyot sohasi", "source": "student_input"},
        {"key": "district", "label": "Tuman", "source": "student_input"},
    ]


@router.get("/{id_}/form-fields", response_model=TemplateFormResponse)
async def get_template_form_fields(
    id_: UUID, db: SessionDep, _: CurrentUser
) -> TemplateFormResponse:
    """Talaba shablon tanlaganda dinamik forma uchun student_input fieldlarni qaytaradi."""
    return await svc.get_form_fields(db, id_)


@router.post("", response_model=ContractTemplateDocRead, status_code=status.HTTP_201_CREATED)
async def create_template(
    db: SessionDep,
    user: RequireSuperAdmin,
    file: UploadFile = File(...),  # noqa: B008
    name: str = Form(...),  # noqa: B008
    description: str | None = Form(None),  # noqa: B008
    practice_type_id: UUID | None = Form(None),  # noqa: B008
) -> ContractTemplateDocRead:
    tpl = await svc.create_template(
        db,
        file=file,
        name=name,
        description=description,
        practice_type_id=practice_type_id,
        user=user,
    )
    return ContractTemplateDocRead.model_validate(tpl)


@router.post(
    "/create-html", response_model=ContractTemplateDocRead, status_code=status.HTTP_201_CREATED
)
async def create_html_template(
    db: SessionDep,
    user: RequireSuperAdmin,
    name: str = Form(...),  # noqa: B008
    html_content: str = Form(...),  # noqa: B008
    description: str | None = Form(None),  # noqa: B008
    practice_type_id: UUID | None = Form(None),  # noqa: B008
    variables_json: str | None = Form(None),  # noqa: B008
) -> ContractTemplateDocRead:
    """HTML kontent bilan yangi shablon yaratish (DOCX shart emas)."""
    import json

    variables = []
    if variables_json:
        with contextlib.suppress(json.JSONDecodeError):
            variables = json.loads(variables_json)

    tpl = await svc.create_html_template(
        db,
        name=name,
        html_content=html_content,
        description=description,
        practice_type_id=practice_type_id,
        user=user,
        variables=variables,
    )
    return ContractTemplateDocRead.model_validate(tpl)


@router.get("/{id_}", response_model=ContractTemplateDocRead)
async def get_template(id_: UUID, db: SessionDep, _: RequireSuperAdmin) -> ContractTemplateDocRead:
    return ContractTemplateDocRead.model_validate(await svc.get_template(db, id_))


@router.get("/{id_}/download")
async def download_template(id_: UUID, db: SessionDep, _: RequireSuperAdmin) -> FileResponse:
    tpl = await svc.get_template(db, id_)
    path = svc.template_file_path(tpl)
    fname = (tpl.file_attachment or {}).get("name") or f"{tpl.name}.docx"
    return FileResponse(path, media_type=_DOCX_MIME, filename=fname)


@router.patch("/{id_}", response_model=ContractTemplateDocRead)
async def update_template(
    id_: UUID, data: ContractTemplateDocUpdate, db: SessionDep, _: RequireSuperAdmin
) -> ContractTemplateDocRead:
    update_data = data.model_dump(exclude_unset=True)
    # variables ni list[dict] formatga o'tkazish
    if "variables" in update_data and update_data["variables"] is not None:
        update_data["variables"] = [
            v.model_dump() if hasattr(v, "model_dump") else v for v in update_data["variables"]
        ]
    tpl = await svc.update_template(db, id_, update_data)
    return ContractTemplateDocRead.model_validate(tpl)


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(id_: UUID, db: SessionDep, _: RequireSuperAdmin) -> None:
    await svc.delete_template(db, id_)
