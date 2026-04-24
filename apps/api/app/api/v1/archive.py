"""Archive endpoints — talabaning yig'ma jildi (ZIP + individual PDFs).

RBAC:
- student — faqat o'ziniki
- supervisor — faqat o'ziga biriktirilgan talabalari
- admin / super_admin — barchasi
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.enums import UserRole
from app.models.user import User
from app.services import archive as svc
from app.services.task import _check_student_owns, _check_supervisor_owns

router = APIRouter(tags=["archive"])


async def _rbac_check(db: AsyncSession, assignment_id: UUID, user: User) -> None:
    if user.role == UserRole.STUDENT:
        await _check_student_owns(db, assignment_id, user.id)
    elif user.role == UserRole.SUPERVISOR:
        await _check_supervisor_owns(db, assignment_id, user.id)
    elif user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN)


def _pdf_response(pdf_bytes: bytes, filename: str) -> Response:
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get(
    "/assignments/{assignment_id}/archive.zip",
    summary="Yig'ma jild ZIP (cover + kundalik + tahlillar + topshiriqlar + shartnoma)",
)
async def download_archive(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> Response:
    await _rbac_check(db, assignment_id, user)
    zip_bytes, filename = await svc.build_archive_zip(db, assignment_id)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/assignments/{assignment_id}/archive/cover.pdf",
    summary="Yig'ma jild muqovasi va umumiy hisobot (PDF)",
)
async def download_cover(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> Response:
    await _rbac_check(db, assignment_id, user)
    return _pdf_response(
        await svc.render_cover_pdf(db, assignment_id), "hisobot.pdf"
    )


@router.get(
    "/assignments/{assignment_id}/archive/journal.pdf",
    summary="Kundalik PDF",
)
async def download_journal(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> Response:
    await _rbac_check(db, assignment_id, user)
    return _pdf_response(
        await svc.render_journal_pdf(db, assignment_id), "kundalik.pdf"
    )


@router.get(
    "/assignments/{assignment_id}/archive/analyses.pdf",
    summary="Dars tahlillari PDF",
)
async def download_analyses(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> Response:
    await _rbac_check(db, assignment_id, user)
    return _pdf_response(
        await svc.render_analyses_pdf(db, assignment_id), "dars-tahlillari.pdf"
    )


@router.get(
    "/assignments/{assignment_id}/archive/tasks.pdf",
    summary="O'quv topshiriqlari PDF",
)
async def download_tasks(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> Response:
    await _rbac_check(db, assignment_id, user)
    return _pdf_response(
        await svc.render_tasks_pdf(db, assignment_id), "topshiriqlar.pdf"
    )
