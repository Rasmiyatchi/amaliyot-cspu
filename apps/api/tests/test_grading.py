"""Baholash — davomat shkalasi va mezon turini aniqlash."""

import pytest
from app.services.grading import TASK_CRITERION_KEYS, attendance_score, is_auto


class TestAttendanceScore:
    """CLAUDE.md sillabusi, 10 ballik mezon: 90-100→10 · 70-80→5 · 60-70→3 · <60→0."""

    @pytest.mark.parametrize(
        ("percent", "expected"),
        [
            (100, 10),
            (95, 10),
            (90, 10),  # chegara
            (89, 7),  # sillabusda ko'rsatilmagan oraliq — 0.7 ulush
            (80, 7),
            (79, 5),
            (70, 5),  # chegara
            (69, 3),
            (60, 3),  # chegara
            (59, 0),
            (0, 0),
        ],
    )
    def test_shkala_10_ballik_mezonda(self, percent: int, expected: int) -> None:
        assert attendance_score(percent, 10) == expected

    def test_davomat_malumoti_yoq_bolsa_nol(self) -> None:
        assert attendance_score(None, 10) == 0

    @pytest.mark.parametrize(
        ("percent", "expected"),
        [(100, 20), (85, 14), (75, 10), (65, 6), (50, 0)],
    )
    def test_shkala_max_ga_moslashadi(self, percent: int, expected: int) -> None:
        # Dala amaliyotida davomat 20 ball — shkala ulush sifatida qo'llanadi
        assert attendance_score(percent, 20) == expected

    def test_monoton(self) -> None:
        # Foiz oshsa ball kamaymasligi kerak
        scores = [attendance_score(p, 10) for p in range(0, 101)]
        assert scores == sorted(scores)


class TestIsAuto:
    def test_system_grader_avto(self) -> None:
        assert is_auto({"key": "attendance", "grader": "system"}) is True

    @pytest.mark.parametrize("key", sorted(TASK_CRITERION_KEYS))
    def test_topshiriq_mezonlari_avto(self, key: str) -> None:
        assert is_auto({"key": key, "grader": "supervisor"}) is True

    @pytest.mark.parametrize("key", ["events", "defense", "report"])
    def test_qolgani_qolda(self, key: str) -> None:
        assert is_auto({"key": key, "grader": "supervisor"}) is False

    def test_notanish_kalit_qolda_bolib_qoladi(self) -> None:
        # Admin grading_rules'ga yangi mezon qo'shsa — xavfsiz default: qo'lda
        assert is_auto({"key": "yangi_mezon", "grader": "supervisor"}) is False
