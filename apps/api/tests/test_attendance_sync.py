"""Attendance sync (avto-qizil), 6 soat qoidasi va schema testlari."""

from datetime import UTC, date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from app.models.attendance import AttendanceEvent
from app.models.enums import AttendanceDayStatus, AttendanceEventKind
from app.schemas.attendance import (
    AttendanceDayDetail,
    AttendanceDaySetRequest,
    AttendanceEventRead,
    AttendanceRangeSetRequest,
)
from app.services import attendance as svc
from app.services.attendance import (
    MIN_PRACTICE_SECONDS,
    UZB_TZ,
    sync_missed_attendance_days,
)


def _exec_result(rowcount: int) -> MagicMock:
    r = MagicMock()
    r.rowcount = rowcount
    return r


@pytest.mark.asyncio
async def test_sync_scoped_runs_two_statements_and_commits_when_changed(monkeypatch):
    db = AsyncMock()
    db.execute.side_effect = [_exec_result(1), _exec_result(3)]
    assignment_id = uuid4()

    changed = await sync_missed_attendance_days(db, assignment_id=assignment_id)

    assert changed == 4
    assert db.execute.await_count == 2
    # Ikkala statement ham faqat shu biriktirish bilan cheklangan va kechagi sanani oladi
    yesterday = datetime.now(UZB_TZ).date() - timedelta(days=1)
    for call in db.execute.await_args_list:
        sql_text = str(call.args[0].text)
        params = call.args[1]
        assert "a.id = :assignment_id" in sql_text
        assert params["assignment_id"] == assignment_id
        assert params["yesterday"] == yesterday
    update_sql = str(db.execute.await_args_list[0].args[0].text)
    insert_sql = str(db.execute.await_args_list[1].args[0].text)
    assert "status = 'pending'" in update_sql and "SET status = 'red'" in update_sql
    assert "ON CONFLICT ON CONSTRAINT uq_attendance_days_assignment_date DO NOTHING" in insert_sql
    assert "generate_series" in insert_sql
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_sync_scoped_without_changes_does_not_commit():
    db = AsyncMock()
    db.execute.side_effect = [_exec_result(0), _exec_result(0)]

    changed = await sync_missed_attendance_days(db, student_id=uuid4())

    assert changed == 0
    db.commit.assert_not_awaited()
    sql_text = str(db.execute.await_args_list[0].args[0].text)
    assert "a.student_id = :student_id" in sql_text


@pytest.mark.asyncio
async def test_sync_global_is_throttled(monkeypatch):
    monkeypatch.setattr(svc, "_last_global_sync", None)
    db = AsyncMock()
    db.execute.side_effect = [_exec_result(0), _exec_result(0), _exec_result(0), _exec_result(0)]

    await sync_missed_attendance_days(db)
    assert db.execute.await_count == 2
    sql_text = str(db.execute.await_args_list[0].args[0].text)
    assert "a.status IN ('active', 'draft')" in sql_text

    # Qayta chaqiruv throttle oralig'ida — hech narsa bajarilmaydi
    await sync_missed_attendance_days(db)
    assert db.execute.await_count == 2

    # force=True throttle'ni chetlab o'tadi
    await sync_missed_attendance_days(db, force=True)
    assert db.execute.await_count == 4


def test_six_hour_duration_constant():
    assert MIN_PRACTICE_SECONDS == 21600
    assert MIN_PRACTICE_SECONDS / 3600 == 6.0


def test_attendance_event_read_model_validation():
    event = AttendanceEvent(
        id=uuid4(),
        attendance_day_id=uuid4(),
        assignment_id=uuid4(),
        kind=AttendanceEventKind.CHECK_IN,
        event_at=datetime.now(UTC),
        is_within_fence=True,
    )
    read = AttendanceEventRead.model_validate(event)
    assert read.kind == AttendanceEventKind.CHECK_IN
    assert read.is_within_fence is True

    day = {
        "id": uuid4(),
        "assignment_id": uuid4(),
        "date": date.today(),
        "status": AttendanceDayStatus.PENDING,
        "check_in_at": datetime.now(UTC),
        "check_out_at": None,
        "approved_by_id": None,
        "approved_at": None,
        "note": None,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
        "events": [event],
    }
    detail = AttendanceDayDetail.model_validate(day)
    assert len(detail.events) == 1
    assert detail.status == AttendanceDayStatus.PENDING


class TestRangeRequest:
    def test_valid(self):
        req = AttendanceRangeSetRequest(
            date_from=date(2026, 10, 1),
            date_to=date(2026, 10, 31),
            status=AttendanceDayStatus.GREEN,
            reason="Universitet tadbiri",
        )
        assert req.mode == "fill" and req.only_required_weekdays is True

    def test_reversed_range_rejected(self):
        with pytest.raises(ValueError):
            AttendanceRangeSetRequest(
                date_from=date(2026, 10, 10),
                date_to=date(2026, 10, 1),
                status=AttendanceDayStatus.GREEN,
                reason="xxx",
            )

    def test_pending_rejected(self):
        with pytest.raises(ValueError):
            AttendanceRangeSetRequest(
                date_from=date(2026, 10, 1),
                date_to=date(2026, 10, 2),
                status=AttendanceDayStatus.PENDING,
                reason="xxx",
            )

    def test_day_set_requires_reason(self):
        with pytest.raises(ValueError):
            AttendanceDaySetRequest(status=AttendanceDayStatus.GREEN, reason="ab")


def test_validate_times_rules():
    day = date(2026, 10, 5)
    ci = datetime(2026, 10, 5, 9, 0, tzinfo=UZB_TZ)
    co = datetime(2026, 10, 5, 16, 0, tzinfo=UZB_TZ)
    out_ci, out_co = svc._validate_times(day, ci, co)
    assert out_ci is not None and out_co is not None and out_co > out_ci

    with pytest.raises(Exception, match="kunga mos emas"):
        svc._validate_times(date(2026, 10, 6), ci, co)
    with pytest.raises(Exception, match="oldin"):
        svc._validate_times(day, co, ci)
    with pytest.raises(Exception, match="kelish vaqti ham kerak"):
        svc._validate_times(day, None, co)


def test_range_candidate_days_respects_required_weekdays():
    from app.models.practice_assignment import PracticeAssignment

    asn = PracticeAssignment(
        id=uuid4(),
        student_id=uuid4(),
        practice_type_id=uuid4(),
        academic_year_id=uuid4(),
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 31),
        required_weekdays=[1, 3],  # Dushanba, Chorshanba
    )
    days = svc._range_candidate_days(
        asn, date(2026, 10, 5), date(2026, 10, 11), only_required_weekdays=True
    )
    assert [d.isoweekday() for d in days] == [1, 3]
    all_days = svc._range_candidate_days(
        asn, date(2026, 10, 5), date(2026, 10, 11), only_required_weekdays=False
    )
    assert len(all_days) == 7

    asn.required_weekdays = None
    default_days = svc._range_candidate_days(
        asn, date(2026, 10, 5), date(2026, 10, 11), only_required_weekdays=True
    )
    assert 7 not in {d.isoweekday() for d in default_days}  # Yakshanba chiqariladi
    assert len(default_days) == 6
