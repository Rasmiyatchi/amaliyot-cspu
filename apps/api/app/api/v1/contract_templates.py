"""Shartnoma shablonlari (DOCX) endpointlari — faqat Super Admin."""

from uuid import UUID

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import RequireSuperAdmin
from app.db.session import SessionDep
from app.schemas.contract_template import (
    ContractTemplateDocRead,
    ContractTemplateDocUpdate,
)
from app.services import contract_template as svc

router = APIRouter(prefix="/contract-templates", tags=["contract-templates"])

_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.get("", response_model=list[ContractTemplateDocRead])
async def list_templates(db: SessionDep, _: RequireSuperAdmin) -> list[ContractTemplateDocRead]:
    items = await svc.list_templates(db)
    return [ContractTemplateDocRead.model_validate(i) for i in items]


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
    tpl = await svc.update_template(db, id_, data.model_dump(exclude_unset=True))
    return ContractTemplateDocRead.model_validate(tpl)


@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(id_: UUID, db: SessionDep, _: RequireSuperAdmin) -> None:
    await svc.delete_template(db, id_)
