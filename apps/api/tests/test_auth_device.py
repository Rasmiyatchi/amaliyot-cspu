"""Auth: User-Agent tahlili, qurilma yorlig'i, brute-force limiti, token rotation grace."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from app.services import auth as auth_svc
from app.services.auth import (
    LOGIN_MAX_FAILS_PER_USER,
    build_device_info,
    build_device_label,
    parse_user_agent,
)
from fastapi import HTTPException

UA_ANDROID_CHROME = (
    "Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
)
UA_ANDROID_REDUCED = (
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/129.0.0.0 Mobile Safari/537.36"
)
UA_IPHONE_SAFARI = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
)
UA_IPHONE_CHROME = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1"
)
UA_WINDOWS_EDGE = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.67"
)
UA_SAMSUNG = (
    "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) "
    "SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36"
)
UA_TELEGRAM_WEBVIEW = (
    "Mozilla/5.0 (Linux; Android 12; M2101K6G Build/SKQ1.211006.001; wv) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36"
)


class TestParseUserAgent:
    def test_android_chrome_with_model(self):
        p = parse_user_agent(UA_ANDROID_CHROME)
        assert p["os"] == "Android" and p["os_version"] == "14"
        assert p["browser"] == "Chrome" and p["browser_version"] == "130"
        assert p["model"] == "SM-A546E"
        assert p["device_type"] == "mobile" and p["webview"] is False

    def test_android_reduced_ua_has_no_model(self):
        p = parse_user_agent(UA_ANDROID_REDUCED)
        assert p["os"] == "Android" and p["model"] is None
        assert p["browser"] == "Chrome" and p["browser_version"] == "129"

    def test_iphone_safari(self):
        p = parse_user_agent(UA_IPHONE_SAFARI)
        assert p["os"] == "iOS" and p["os_version"] == "17.5.1"
        assert p["browser"] == "Safari" and p["browser_version"] == "17"
        assert p["model"] == "iPhone"

    def test_iphone_chrome(self):
        p = parse_user_agent(UA_IPHONE_CHROME)
        assert p["browser"] == "Chrome" and p["browser_version"] == "124"

    def test_windows_edge(self):
        p = parse_user_agent(UA_WINDOWS_EDGE)
        assert p["os"] == "Windows" and p["os_version"] == "10/11"
        assert p["browser"] == "Edge" and p["browser_version"] == "128"
        assert p["device_type"] == "desktop"

    def test_samsung_browser(self):
        p = parse_user_agent(UA_SAMSUNG)
        assert p["browser"] == "Samsung Internet" and p["browser_version"] == "24"
        assert p["model"] == "SAMSUNG SM-G991B"

    def test_webview_flag(self):
        p = parse_user_agent(UA_TELEGRAM_WEBVIEW)
        assert p["webview"] is True and p["model"] == "M2101K6G"

    def test_empty(self):
        p = parse_user_agent(None)
        assert p["os"] is None and p["browser"] is None


class TestDeviceInfoAndLabel:
    def test_merge_prefers_client_model_and_version(self):
        info = build_device_info(
            {
                "platform": "Android",
                "platform_version": "14.0.0",
                "model": "SM-A546E",
                "brand": "Samsung",
                "screen": "412x915@2.6",
                "timezone": "Asia/Tashkent",
                "language": "uz-UZ",
                "touch": True,
            },
            UA_ANDROID_REDUCED,
            "10.0.0.1",
        )
        assert info["platform_version"] == "14"
        assert info["model"] == "SM-A546E" and info["brand"] == "Samsung"
        assert info["browser"] == "Chrome" and info["browser_version"] == "129"
        assert info["ip"] == "10.0.0.1" and info["touch"] is True
        assert build_device_label(info) == "Android 14 · Chrome 129 · Samsung SM-A546E"

    def test_client_model_k_is_ignored(self):
        info = build_device_info({"model": "K"}, UA_ANDROID_REDUCED, None)
        assert info["model"] is None
        assert build_device_label(info) == "Android 10 · Chrome 129"

    def test_label_from_ua_only(self):
        info = build_device_info(None, UA_IPHONE_SAFARI, None)
        assert build_device_label(info) == "iOS 17.5.1 · Safari 17 · iPhone"

    def test_label_none_without_data(self):
        assert build_device_label(build_device_info(None, None, None)) is None


class TestLoginRateLimit:
    def setup_method(self):
        auth_svc._failed_attempts.clear()

    def test_blocks_after_max_failures(self):
        for _ in range(LOGIN_MAX_FAILS_PER_USER):
            auth_svc._check_rate_limit("student1", "1.1.1.1")
            auth_svc._record_failure("student1", "1.1.1.1")
        with pytest.raises(HTTPException) as exc:
            auth_svc._check_rate_limit("STUDENT1", "2.2.2.2")  # katta-kichik harf farqsiz
        assert exc.value.status_code == 429
        assert "daqiqadan keyin" in str(exc.value.detail)
        assert "Retry-After" in (exc.value.headers or {})

    def test_success_clears_counter(self):
        for _ in range(LOGIN_MAX_FAILS_PER_USER - 1):
            auth_svc._record_failure("student2", None)
        auth_svc._clear_failures("student2")
        auth_svc._check_rate_limit("student2", None)  # xato bo'lmaydi

    def test_old_failures_expire(self):
        old = datetime.now(UTC) - auth_svc.LOGIN_FAIL_WINDOW - timedelta(seconds=1)
        auth_svc._failed_attempts["u:student3"].extend([old] * LOGIN_MAX_FAILS_PER_USER)
        auth_svc._check_rate_limit("student3", None)  # eskirgan urinishlar hisobga olinmaydi


class TestRefreshGrace:
    @pytest.mark.asyncio
    async def test_recently_rotated_token_is_accepted(self, monkeypatch):
        from unittest.mock import AsyncMock, MagicMock

        from app.core import security
        from app.models.enums import UserRole
        from app.models.refresh_token import RefreshToken
        from app.models.user import User

        user = User(
            id=uuid4(),
            username="u",
            password_hash="x",
            role=UserRole.STUDENT,
            is_active=True,
            first_name="A",
            last_name="B",
        )
        now = datetime.now(UTC)
        old = RefreshToken(
            id=uuid4(),
            user_id=user.id,
            token_hash="h",
            expires_at=now + timedelta(days=1),
            revoked_at=now - timedelta(seconds=10),
            replaced_by_id=uuid4(),
        )
        db = AsyncMock()
        db.execute.return_value = MagicMock(scalar_one_or_none=lambda: old)
        db.get.return_value = user
        monkeypatch.setattr(auth_svc, "decode_token", lambda *a, **k: {"sub": str(user.id)})
        monkeypatch.setattr(auth_svc, "create_access_token", lambda *a, **k: ("acc", "jti"))
        monkeypatch.setattr(
            auth_svc,
            "create_refresh_token",
            lambda *a, **k: ("ref", "jti2", now + timedelta(days=7)),
        )
        request = MagicMock()
        request.headers = {"user-agent": "ua"}
        request.client = MagicMock(host="127.0.0.1")

        access, refresh, ttl = await auth_svc.refresh_tokens(db, "token", request)
        assert access == "acc" and refresh == "ref" and ttl > 0
        assert old.revoked_at is not None  # eskisi qayta bekor qilinmaydi, lekin yangi beriladi
        assert security.hash_refresh_token("ref")  # smoke

    @pytest.mark.asyncio
    async def test_stale_rotated_token_is_rejected(self, monkeypatch):
        from unittest.mock import AsyncMock, MagicMock

        from app.models.refresh_token import RefreshToken

        now = datetime.now(UTC)
        old = RefreshToken(
            id=uuid4(),
            user_id=uuid4(),
            token_hash="h",
            expires_at=now + timedelta(days=1),
            revoked_at=now - timedelta(minutes=5),
            replaced_by_id=uuid4(),
        )
        db = AsyncMock()
        db.execute.return_value = MagicMock(scalar_one_or_none=lambda: old)
        monkeypatch.setattr(auth_svc, "decode_token", lambda *a, **k: {"sub": "x"})
        request = MagicMock()
        request.headers = {}
        request.client = None

        with pytest.raises(HTTPException) as exc:
            await auth_svc.refresh_tokens(db, "token", request)
        assert exc.value.status_code == 401
