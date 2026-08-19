"""Attendance sync va 6 soatlik biznes mantiq testlari."""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from app.models.attendance import AttendanceDay
from app.models.enums import AssignmentStatus, AttendanceDayStatus
from app.models.practice_assignment import PracticeAssignment
from app.services.attendance import MIN_PRACTICE_SECONDS, UZB_TZ, sync_missed_attendance_days


@pytest.mark.asyncio
async def test_sync_missed_attendance_days_creates_red():
    db = AsyncMock()
    assignment_id = uuid4()
    yesterday = datetime.now(UZB_TZ).date() - timedelta(days=1)
    start_date = yesterday - timedelta(days=2)

    fake_assignment = PracticeAssignment(
        id=assignment_id,
        student_id=uuid4(),
        practice_type_id=uuid4(),
        academic_year_id=uuid4(),
        start_date=start_date,
        end_date=yesterday + timedelta(days=10),
        status=AssignmentStatus.ACTIVE,
        required_weekdays=[1, 2, 3, 4, 5, 6],
    )

    # 1-chaqiruv: assignments; 2-chaqiruv: existing days (bo'sh)
    db.execute.side_effect = [
        MagicMock(scalars=lambda: MagicMock(all=lambda: [fake_assignment])),
        MagicMock(scalars=lambda: MagicMock(all=lambda: [])),
    ]

    await sync_missed_attendance_days(db, assignment_id=assignment_id)

    assert db.add_all.called
    added_days = db.add_all.call_args[0][0]
    assert len(added_days) >= 2
    for d in added_days:
        assert d.status == AttendanceDayStatus.RED
        assert "qolib ketgan kun" in d.note


def test_six_hour_duration_constant():
    assert MIN_PRACTICE_SECONDS == 21600
    assert MIN_PRACTICE_SECONDS / 3600 == 6.0


def test_attendance_event_read_model_validation():
    from app.models.attendance import AttendanceEvent
    from app.models.enums import AttendanceEventKind
    from app.schemas.attendance import AttendanceDayDetail, AttendanceEventRead

    event = AttendanceEvent(
        attendance_day_id=uuid4(),
        assignment_id=uuid4(),
        kind=AttendanceEventKind.CHECK_IN,
        event_at=datetime.now(timezone.utc),
    )
    # Validate event individually
    read = AttendanceEventRead.model_validate(event)
    assert read.kind == AttendanceEventKind.CHECK_IN
    assert read.lat is None

    # Validate Day Detail containing event
    day_dict = {
        "id": uuid4(),
        "assignment_id": uuid4(),
        "date": date.today(),
        "status": AttendanceDayStatus.PENDING,
        "check_in_at": datetime.now(timezone.utc),
        "check_out_at": None,
        "approved_by_id": None,
        "approved_by_name": None,
        "approved_at": None,
        "note": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "events": [event],
    }
    detail = AttendanceDayDetail.model_validate(day_dict)
    assert len(detail.events) == 1
    assert detail.events[0].kind == AttendanceEventKind.CHECK_IN

