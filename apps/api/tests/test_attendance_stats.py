"""Davomat foizi — maxraj mantiqi.

Bu formula yakuniy bahoga ta'sir qiladi (Davomat mezoni), shuning uchun aniq
qoplangan. 2026-09-07 — dushanba, quyidagi testlar shunga tayanadi.
"""

from datetime import date

from app.services.attendance_stats import compute_percent, expected_days

MON = date(2026, 9, 7)  # dushanba
END = date(2026, 12, 25)


def test_dushanba_ekanini_tasdiqlash() -> None:
    assert MON.isoweekday() == 1


class TestExpectedDays:
    def test_kunlar_belgilanmagan_bolsa_none(self) -> None:
        # Eski biriktirishlar — chaqiruvchi eski yo'lga tushishi kerak
        assert expected_days(MON, END, None) is None
        assert expected_days(MON, END, []) is None

    def test_kelajakdagi_kunlar_sanalmaydi(self) -> None:
        # Bir hafta o'tgan: Du, Chor tushadi (Du 07, Chor 09, Du 14)
        assert expected_days(MON, END, [1, 3], upto=date(2026, 9, 14)) == 3

    def test_amaliyot_hali_boshlanmagan(self) -> None:
        assert expected_days(MON, END, [1, 3], upto=date(2026, 9, 1)) == 0

    def test_bir_toliq_hafta(self) -> None:
        # Du..Ya — Du va Chor = 2 kun
        assert expected_days(MON, date(2026, 9, 13), [1, 3], upto=END) == 2

    def test_har_kuni(self) -> None:
        assert expected_days(MON, date(2026, 9, 13), [1, 2, 3, 4, 5, 6, 7], upto=END) == 7

    def test_end_date_upto_dan_oldin_bolsa_end_ishlatiladi(self) -> None:
        # Amaliyot tugagan — tugash sanasidan keyingi kunlar sanalmaydi
        assert expected_days(MON, date(2026, 9, 13), [1, 3], upto=date(2027, 1, 1)) == 2

    def test_since_oralikni_qisqartiradi(self) -> None:
        # "Oxirgi 30 kun" KPI uchun: faqat since dan keyingi kunlar
        assert expected_days(MON, END, [1, 3], upto=date(2026, 9, 14), since=date(2026, 9, 14)) == 1

    def test_since_boshlanishdan_oldin_bolsa_tasir_qilmaydi(self) -> None:
        assert expected_days(MON, END, [1, 3], upto=date(2026, 9, 14), since=date(2026, 1, 1)) == 3


class TestComputePercent:
    def _pct(self, green: int, record_total: int, **kw: object) -> int | None:
        return compute_percent(
            green=green,
            record_total=record_total,
            start=MON,
            end=END,
            weekdays=[1, 3],
            upto=date(2026, 9, 14),  # 3 kun kutiladi
            **kw,  # type: ignore[arg-type]
        )

    def test_asosiy_bug_kelmagan_kun_maxrajda_qoladi(self) -> None:
        # 3 kundan 1 kun kelgan. Eski kod 1/1 = 100% berardi.
        assert self._pct(1, 1) == 33

    def test_umuman_kelmagan_talaba_nol_foiz(self) -> None:
        # Eski kod 0 ta yozuvda None ("—") qaytarardi — qoldirgan talaba yashirinardi.
        assert self._pct(0, 0) == 0

    def test_toliq_davomat(self) -> None:
        assert self._pct(3, 3) == 100

    def test_yuz_foizdan_oshmaydi(self) -> None:
        # Majburiy bo'lmagan kunda ham kelib tasdiqlangan
        assert self._pct(5, 5) == 100

    def test_kunlar_belgilanmagan_eski_xatti_harakat(self) -> None:
        pct = compute_percent(
            green=1, record_total=1, start=MON, end=END, weekdays=None,
            upto=date(2026, 9, 14),
        )
        assert pct == 100

    def test_boshlanmagan_amaliyot_none(self) -> None:
        pct = compute_percent(
            green=0, record_total=0, start=MON, end=END, weekdays=[1, 3],
            upto=date(2026, 9, 1),
        )
        assert pct is None

    def test_kunlarsiz_va_yozuvsiz_none(self) -> None:
        pct = compute_percent(
            green=0, record_total=0, start=MON, end=END, weekdays=None,
            upto=date(2026, 9, 14),
        )
        assert pct is None
