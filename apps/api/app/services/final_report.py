"""FinalReport service — submit/review/list."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Group
from app.models.enums import FinalReportStatus, UserRole
from app.models.final_report import FinalReport
from app.models.practice_assignment import PracticeAssignment
from app.models.practice_type import PracticeType
from app.models.student import Student
from app.models.user import User


def _row_to_dict(
    fr: FinalReport,
    student_name: str | None,
    practice_type_name: str | None,
    reviewer_name: str | None,
    *,
    group_name: str | None = None,
    final_grade: int | None = None,
    credit_earned: bool | None = None,
) -> dict[str, Any]:
    return {
        "id": fr.id,
        "assignment_id": fr.assignment_id,
        "student_full_name": student_name,
        "group_name": group_name,
        "practice_type_name": practice_type_name,
        "final_grade": final_grade,
        "credit_earned": credit_earned,
        "title": fr.title,
        "file_attachment": fr.file_attachment,
        "status": fr.status,
        "reviewer_id": fr.reviewer_id,
        "reviewer_name": reviewer_name,
        "reviewer_note": fr.reviewer_note,
        "submitted_at": fr.submitted_at,
        "reviewed_at": fr.reviewed_at,
        "created_at": fr.created_at,
        "updated_at": fr.updated_at,
    }


def _full_name(first: str | None, last: str | None) -> str | None:
    if not first and not last:
        return None
    return f"{last or ''} {first or ''}".strip()


async def _hydrate(db: AsyncSession, fr: FinalReport) -> dict[str, Any]:
    """Bir hisobotni rich qaytaradi (student name + group + grade + reviewer name)."""
    student_name: str | None = None
    group_name: str | None = None
    practice_type_name: str | None = None
    reviewer_name: str | None = None
    final_grade: int | None = None
    credit_earned: bool | None = None

    asn = await db.get(PracticeAssignment, fr.assignment_id)
    if asn:
        final_grade = asn.final_grade
        credit_earned = asn.credit_earned
        student = await db.get(Student, asn.student_id)
        if student:
            user = await db.get(User, student.user_id)
            if user:
                student_name = _full_name(user.first_name, user.last_name)
            if student.group_id:
                group = await db.get(Group, student.group_id)
                if group:
                    group_name = group.name
        pt = await db.get(PracticeType, asn.practice_type_id)
        if pt:
            practice_type_name = pt.name

    if fr.reviewer_id:
        reviewer = await db.get(User, fr.reviewer_id)
        if reviewer:
            reviewer_name = _full_name(reviewer.first_name, reviewer.last_name)

    return _row_to_dict(
        fr,
        student_name,
        practice_type_name,
        reviewer_name,
        group_name=group_name,
        final_grade=final_grade,
        credit_earned=credit_earned,
    )


async def list_reports(
    db: AsyncSession,
    *,
    academic_year_id: UUID | None = None,
    status_filter: FinalReportStatus | None = None,
    assignment_id: UUID | None = None,
    group_id: UUID | None = None,
    direction_id: UUID | None = None,
    faculty_id: UUID | None = None,
    course: int | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    from sqlalchemy import func, or_

    from app.models.academic import Direction

    stmt = select(FinalReport)

    needs_join = any(
        [academic_year_id, group_id, direction_id, faculty_id, course, search]
    )
    if needs_join:
        stmt = (
            stmt.join(
                PracticeAssignment,
                PracticeAssignment.id == FinalReport.assignment_id,
            )
            .join(Student, Student.id == PracticeAssignment.student_id)
            .outerjoin(Group, Group.id == PracticeAssignment.group_id)
        )
        if direction_id or faculty_id:
            stmt = stmt.outerjoin(Direction, Direction.id == Group.direction_id)
        if search:
            stmt = stmt.outerjoin(User, User.id == Student.user_id)

    stmt = stmt.order_by(FinalReport.created_at.desc())

    if academic_year_id:
        stmt = stmt.where(PracticeAssignment.academic_year_id == academic_year_id)
    if status_filter:
        stmt = stmt.where(FinalReport.status == status_filter)
    if assignment_id:
        stmt = stmt.where(FinalReport.assignment_id == assignment_id)
    if group_id:
        stmt = stmt.where(PracticeAssignment.group_id == group_id)
    if direction_id:
        stmt = stmt.where(Group.direction_id == direction_id)
    if faculty_id:
        stmt = stmt.where(Direction.faculty_id == faculty_id)
    if course is not None:
        stmt = stmt.where(PracticeAssignment.course == course)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.first_name).like(like),
                func.lower(User.last_name).like(like),
                Student.hemis_id.like(f"%{search}%"),
            )
        )

    rows = (await db.execute(stmt)).scalars().all()
    return [await _hydrate(db, r) for r in rows]


async def get_report_for_assignment(
    db: AsyncSession, assignment_id: UUID
) -> dict[str, Any] | None:
    fr = (
        await db.execute(
            select(FinalReport).where(FinalReport.assignment_id == assignment_id)
        )
    ).scalar_one_or_none()
    if not fr:
        return None
    return await _hydrate(db, fr)


async def submit_report(
    db: AsyncSession,
    user: User,
    assignment_id: UUID,
    title: str,
    file_attachment: dict[str, Any],
) -> dict[str, Any]:
    """Talaba o'z biriktirishi uchun hisobot yuboradi (yangi yoki qayta)."""
    if user.role != UserRole.STUDENT:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Faqat talaba hisobot topshira oladi"
        )

    # Assignment talabaga tegishli ekanligini tekshirish
    asn = await db.get(PracticeAssignment, assignment_id)
    if not asn:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Biriktirish topilmadi")
    student = (
        await db.execute(select(Student).where(Student.user_id == user.id))
    ).scalar_one_or_none()
    if not student or student.id != asn.student_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Bu biriktirish sizga tegishli emas"
        )

    fr = (
        await db.execute(
            select(FinalReport).where(FinalReport.assignment_id == assignment_id)
        )
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    if fr:
        if fr.status == FinalReportStatus.APPROVED:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Hisobot allaqachon tasdiqlangan"
            )
        fr.title = title
        fr.file_attachment = file_attachment
        fr.status = FinalReportStatus.SUBMITTED
        fr.submitted_at = now
        fr.reviewed_at = None
        fr.reviewer_id = None
        fr.reviewer_note = None
    else:
        fr = FinalReport(
            assignment_id=assignment_id,
            title=title,
            file_attachment=file_attachment,
            status=FinalReportStatus.SUBMITTED,
            submitted_at=now,
        )
        db.add(fr)

    await db.commit()
    await db.refresh(fr)
    return await _hydrate(db, fr)


async def review_report(
    db: AsyncSession,
    user: User,
    report_id: UUID,
    approve: bool,
    note: str | None,
) -> dict[str, Any]:
    """Super admin (kafedra mudiri) tasdiq/rad qiladi."""
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Faqat Super Admin tasdiqlay oladi"
        )

    fr = await db.get(FinalReport, report_id)
    if not fr:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hisobot topilmadi")
    if fr.status not in (FinalReportStatus.SUBMITTED, FinalReportStatus.REJECTED):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Hisobotni faqat 'submitted' yoki 'rejected' holatda ko'rib chiqish mumkin",
        )

    fr.status = (
        FinalReportStatus.APPROVED if approve else FinalReportStatus.REJECTED
    )
    fr.reviewer_id = user.id
    fr.reviewer_note = note
    fr.reviewed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(fr)
    return await _hydrate(db, fr)


async def is_archive_unlocked(db: AsyncSession, assignment_id: UUID) -> bool:
    """Arxiv yuklash uchun gate — yakuniy hisobot tasdiqlangan bo'lishi shart."""
    fr = (
        await db.execute(
            select(FinalReport.status).where(
                FinalReport.assignment_id == assignment_id
            )
        )
    ).scalar_one_or_none()
    return fr == FinalReportStatus.APPROVED
