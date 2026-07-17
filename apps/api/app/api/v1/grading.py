"""Baholash endpointlari — mezonlar bo'yicha ball tarkibi va yakunlash.

Ruxsat: Admin/Super Admin — barcha biriktirishlar; Supervizor — faqat o'ziga
biriktirilgan talabalar (12.07 qarori: yakuniy hisobotni biriktirilgan amaliyot
rahbari baholaydi). Tekshiruv `grading.authorize` da.
"""

from uuid import UUID

from fastapi import APIRouter, Request

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.schemas.grading import CriterionScoreRequest, GradeBreakdown
from app.services import audit_log as audit
from app.services import grading as svc

router = APIRouter(prefix="/grading", tags=["grading"])


@router.get(
    "/assignments/{assignment_id}",
    response_model=GradeBreakdown,
    summary="Biriktirish bo'yicha baho tarkibi",
)
async def get_breakdown(
    assignment_id: UUID, db: SessionDep, user: CurrentUser
) -> GradeBreakdown:
    await svc.authorize(db, assignment_id, user)
    return GradeBreakdown.model_validate(await svc.compute_breakdown(db, assignment_id))


@router.post(
    "/assignments/{assignment_id}/criteria",
    response_model=GradeBreakdown,
    summary="Qo'lda baholanadigan mezonga ball qo'yish",
)
async def set_criterion(
    assignment_id: UUID,
    payload: CriterionScoreRequest,
    request: Request,
    db: SessionDep,
    user: CurrentUser,
) -> GradeBreakdown:
    result = await svc.set_criterion_score(
        db, assignment_id, payload.key, payload.score, user
    )
    await audit.log(
        db,
        actor=user,
        action="grade",
        entity_type="practice_assignment",
        entity_id=assignment_id,
        summary=f"'{payload.key}' mezoniga {payload.score} ball qo'yildi",
        metadata={"criterion": payload.key, "score": payload.score},
        request=request,
    )
    await db.commit()
    return GradeBreakdown.model_validate(result)


@router.post(
    "/assignments/{assignment_id}/finalize",
    response_model=GradeBreakdown,
    summary="Amaliyotni yakunlash — umumiy ballni chiqarish",
)
async def finalize(
    assignment_id: UUID, request: Request, db: SessionDep, user: CurrentUser
) -> GradeBreakdown:
    result = await svc.finalize_grade(db, assignment_id, user)
    await audit.log(
        db,
        actor=user,
        action="finalize",
        entity_type="practice_assignment",
        entity_id=assignment_id,
        summary=(
            f"Amaliyot yakunlandi — yakuniy ball {result['total']}/{result['max_total']}, "
            f"kredit: {'olindi' if result['credit_earned'] else 'olinmadi'}"
        ),
        metadata={
            "total": result["total"],
            "credit_earned": result["credit_earned"],
            "criteria": {c["key"]: c["score"] for c in result["criteria"]},
        },
        request=request,
    )
    await db.commit()
    return GradeBreakdown.model_validate(result)
