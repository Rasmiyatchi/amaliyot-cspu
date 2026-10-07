"""2026-10 audit regressiyalari: geo-fence, biriktirma yo'llari, admin sxemalari, 422 formati."""

from decimal import Decimal
from uuid import uuid4

import pytest
from app.models.organization import Organization
from app.schemas.admin import AdminCreate, AdminUpdate
from app.services import uploads as uploads_svc
from app.services.attendance import GEO_ACCURACY_ALLOWANCE_MAX_M, _evaluate_geo
from fastapi import HTTPException
from pydantic import ValidationError


def _org(radius: int = 100) -> Organization:
    return Organization(
        id=uuid4(),
        name="Maktab",
        geo_lat=Decimal("41.4690000"),
        geo_lng=Decimal("69.5820000"),
        geo_radius_m=radius,
        wifi_ssids=["School48"],
    )


class TestGeoFence:
    def test_inside_radius(self):
        dist, ok = _evaluate_geo(
            lat=41.4691, lng=69.5821, accuracy_m=10, wifi_ssid=None, organization=_org()
        )
        assert ok and dist is not None and dist < 20

    def test_accuracy_allowance_is_capped(self):
        # ~245 m: radius 100 + min(500, 150) = 250 → ichkarida
        _, ok = _evaluate_geo(
            lat=41.4712, lng=69.5820, accuracy_m=500, wifi_ssid=None, organization=_org()
        )
        assert ok
        # ~334 m: 100 + 150 = 250 dan uzoq → tashqarida (aniqlik qanchalik yomon bo'lmasin)
        _, ok = _evaluate_geo(
            lat=41.4720, lng=69.5820, accuracy_m=5000, wifi_ssid=None, organization=_org()
        )
        assert not ok
        assert GEO_ACCURACY_ALLOWANCE_MAX_M == 150.0

    def test_missing_coordinates_is_not_within(self):
        dist, ok = _evaluate_geo(
            lat=None, lng=None, accuracy_m=None, wifi_ssid=None, organization=_org()
        )
        assert dist is None and ok is False

    def test_client_wifi_ssid_does_not_bypass_fence(self):
        _, ok = _evaluate_geo(
            lat=None, lng=None, accuracy_m=None, wifi_ssid="School48", organization=_org()
        )
        assert ok is False

    def test_area_practice_and_unset_point_are_not_checked(self):
        assert _evaluate_geo(
            lat=None, lng=None, accuracy_m=None, wifi_ssid=None, organization=None
        )[1]
        org = _org()
        org.geo_lat = None
        assert _evaluate_geo(lat=None, lng=None, accuracy_m=None, wifi_ssid=None, organization=org)[
            1
        ]


class TestAttachmentSanitizing:
    def test_foreign_storage_path_rejected(self):
        uid = uuid4()
        with pytest.raises(HTTPException) as exc:
            uploads_svc.clean_client_attachments(
                [{"id": "x", "path": "contracts/26000001.pdf", "uploaded_by_id": str(uid)}],
                user_id=uid,
            )
        assert exc.value.status_code == 400  # o'z papkasidan tashqari — rad etiladi

    def test_someone_elses_upload_rejected(self):
        with pytest.raises(HTTPException) as exc:
            uploads_svc.clean_client_attachments(
                [{"id": "x", "path": "uploads/2026/10/a.pdf", "uploaded_by_id": str(uuid4())}],
                user_id=uuid4(),
            )
        assert exc.value.status_code == 400

    def test_existing_attachment_kept_from_db_copy(self):
        existing = [{"id": "keep", "path": "uploads/2026/10/a.pdf", "name": "a.pdf"}]
        out = uploads_svc.clean_client_attachments(
            [{"id": "keep", "path": "contracts/evil.pdf"}], user_id=uuid4(), existing=existing
        )
        assert out == existing

    def test_only_own_namespace_accepted(self, tmp_path, monkeypatch):
        """Talaba begona (masalan admin hujjati) faylini uploaded_by_id ni soxtalab biriktira olmaydi."""
        root = tmp_path / "uploads"
        monkeypatch.setattr(uploads_svc, "STORAGE_ROOT", root)
        me, other = uuid4(), uuid4()
        mine = root / "u" / str(me) / "2026" / "10" / "a.pdf"
        theirs = root / "u" / str(other) / "2026" / "10" / "b.pdf"
        legacy = root / "2026" / "10" / "doc.pdf"
        for f in (mine, theirs, legacy):
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_bytes(b"%PDF-1.4")

        out = uploads_svc.clean_client_attachments(
            [
                {
                    "id": "m",
                    "name": "a.pdf",
                    "path": f"uploads/u/{me}/2026/10/a.pdf",
                    "uploaded_by_id": str(other),
                    "size": 999999,
                }
            ],
            user_id=me,
        )
        assert out[0]["uploaded_by_id"] == str(me) and out[0]["size"] == 8

        for path in (f"uploads/u/{other}/2026/10/b.pdf", "uploads/2026/10/doc.pdf"):
            with pytest.raises(HTTPException) as exc:
                uploads_svc.clean_client_attachments(
                    [{"id": "x", "path": path, "uploaded_by_id": str(me)}], user_id=me
                )
            assert exc.value.status_code == 400

    def test_traversal_rejected(self):
        with pytest.raises(HTTPException):
            uploads_svc.uploads_path("../../etc/passwd")


class TestAdminSchemas:
    def test_invalid_email_rejected_and_blank_becomes_none(self):
        with pytest.raises(ValidationError):
            AdminCreate(
                username="dekan",
                password="secret12",
                email="dekanat@chdpu",
                first_name="A",
                last_name="B",
            )
        a = AdminCreate(
            username=" dekan ", password="secret12", email="  ", first_name="A", last_name="B"
        )
        assert a.email is None and a.username == "dekan"

    def test_unknown_permission_rejected(self):
        with pytest.raises(ValidationError):
            AdminUpdate(permissions=["practice", "everything"])
        assert AdminUpdate(permissions=["practice", "practice"]).permissions == ["practice"]


class TestCreditThreshold:
    """Kredit chegarasi turda belgilanmagan bo'lsa — maksimumning 60%."""

    @staticmethod
    def _pt(rules: dict | None):
        from app.models.practice_type import PracticeType

        return PracticeType(name="T", grading_rules=rules)

    def test_configured_threshold_wins(self):
        from app.services.grading import _min_total

        assert _min_total(self._pt({"min_total": 55}), 100) == 55

    def test_missing_threshold_defaults_to_60_percent(self):
        from app.services.grading import _min_total

        assert _min_total(self._pt({}), 100) == 60
        assert _min_total(self._pt({"min_total": 0}), 50) == 30
        assert _min_total(self._pt(None), 0) == 0


class TestAssignmentTransitions:
    @staticmethod
    def _asn(status, final_grade=None):
        from app.models.practice_assignment import PracticeAssignment

        return PracticeAssignment(status=status, final_grade=final_grade)

    def test_allowed_and_rejected(self):
        from app.models.enums import AssignmentStatus as S
        from app.services.practice_assignment import _check_status_transition

        _check_status_transition(self._asn(S.DRAFT), {"status": S.ACTIVE})
        _check_status_transition(self._asn(S.CANCELLED), {"status": S.ACTIVE})
        _check_status_transition(self._asn(S.ACTIVE), {"notes": "x"})
        for current, target in [
            (S.DRAFT, S.COMPLETED),
            (S.CANCELLED, S.COMPLETED),
            (S.COMPLETED, S.CANCELLED),
        ]:
            with pytest.raises(HTTPException) as e:
                _check_status_transition(self._asn(current), {"status": target})
            assert e.value.status_code == 409

    def test_completed_requires_grade(self):
        from app.models.enums import AssignmentStatus as S
        from app.services.practice_assignment import _check_status_transition

        with pytest.raises(HTTPException):
            _check_status_transition(self._asn(S.ACTIVE), {"status": S.COMPLETED})
        _check_status_transition(self._asn(S.ACTIVE, final_grade=75), {"status": S.COMPLETED})
        _check_status_transition(self._asn(S.ACTIVE), {"status": S.COMPLETED, "final_grade": 80})


class TestSearchNormalization:
    def test_apostrophes_are_ignored(self):
        from app.services.search_utils import like_pattern, normalize_term

        variants = ["Ro'ziyev", "Ro’ziyev", "Roʻziyev", "RO`ZIYEV", " ro‘ziyev "]
        assert {normalize_term(v) for v in variants} == {"roziyev"}
        assert like_pattern("50%_o'g'li") == "%50\\%\\_ogli%"


class TestFacultyScope:
    @staticmethod
    def _user(role, faculty_id=None):
        from app.models.user import User

        return User(role=role, faculty_id=faculty_id)

    def test_scoped_admin_limited_to_own_faculty(self):
        from app.models.enums import UserRole
        from app.services.scoping import assert_faculty_scope, require_university_admin

        own, other = uuid4(), uuid4()
        scoped = self._user(UserRole.ADMIN, own)
        assert_faculty_scope(scoped, own)
        for target in (other, None):  # boshqa fakultet ham, fakultetsiz obyekt ham
            with pytest.raises(HTTPException) as e:
                assert_faculty_scope(scoped, target)
            assert e.value.status_code == 403
        with pytest.raises(HTTPException):
            require_university_admin(scoped)

    def test_unscoped_admins_pass(self):
        from app.models.enums import UserRole
        from app.services.scoping import assert_faculty_scope, require_university_admin

        for user in (self._user(UserRole.ADMIN), self._user(UserRole.SUPER_ADMIN)):
            assert_faculty_scope(user, uuid4())
            require_university_admin(user)


class TestProductionSecrets:
    def test_placeholder_secrets_detected(self):
        from app.core.config import _is_placeholder_secret

        for bad in ("CHANGE_ME_to_64_hex_chars_min", "dev-only-change-me", "short", " "):
            assert _is_placeholder_secret(bad)
        assert not _is_placeholder_secret("9f2c" * 16)


class TestAccessRestrictions:
    def test_super_admin_is_never_restricted(self):
        import asyncio

        from app.models.enums import UserRole
        from app.models.user import User
        from app.services.access_restriction import find_active_for_user

        user = User(id=uuid4(), role=UserRole.SUPER_ADMIN)
        assert asyncio.run(find_active_for_user(None, user)) is None  # DB'ga murojaat yo'q

    def test_create_schema_requires_a_target(self):
        from app.schemas.access_restriction import AccessRestrictionCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            AccessRestrictionCreate(target_type="user")
        with pytest.raises(ValidationError):
            AccessRestrictionCreate(target_type="group")
        ok = AccessRestrictionCreate(target_type="user", student_id=uuid4())
        assert ok.mode.value == "restricted"
        AccessRestrictionCreate(target_type="group", group_id=uuid4(), mode="maintenance")


class TestScanUploadChecks:
    def test_type_detected_by_content(self):
        from app.services.practice_application import detect_scan_type

        assert detect_scan_type("scan.pdf", b"%PDF-1.4 x") == (".pdf", "application/pdf")
        assert detect_scan_type("IMG_1.JPG", b"\xff\xd8\xff\xe0 jpeg") == (".jpg", "image/jpeg")
        # Kengaytmasiz (Android kamerasi) va noto'g'ri nomlangan fayl ham mazmuni bo'yicha o'tadi
        assert detect_scan_type("image", b"\x89PNG\r\n png") == (".png", "image/png")
        assert detect_scan_type("scan.pdf", b"\xff\xd8\xff\xe0 jpeg") == (".jpg", "image/jpeg")

    def test_clear_errors(self):
        from app.services.practice_application import SCAN_MAX_BYTES, detect_scan_type

        for name, data, status_code, needle in [
            ("IMG_2.HEIC", b"\x00\x00\x00\x18ftypheic", 400, "HEIC"),
            ("photo.jpg", b"\x00\x00\x00\x18ftypheic", 400, "HEIC"),
            ("doc.docx", b"PK\x03\x04", 400, ".docx"),
            ("x.pdf", b"", 400, "bo'sh"),
            ("big.pdf", b"%PDF" + b"0" * SCAN_MAX_BYTES, 413, "maksimum"),
        ]:
            with pytest.raises(HTTPException) as e:
                detect_scan_type(name, data)
            assert e.value.status_code == status_code
            assert needle in str(e.value.detail)
