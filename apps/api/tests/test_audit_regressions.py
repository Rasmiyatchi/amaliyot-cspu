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
        assert exc.value.status_code == 404

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
