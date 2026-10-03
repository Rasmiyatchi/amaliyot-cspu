"""Auth business logic — authenticate, login, refresh, logout, qurilma bog'lash.

Qurilma siyosati (talaba): bitta profil = bitta qurilma. device_id (brauzer UUID) qat'iy
tekshiriladi; boshqa qurilma → 403 + adminlarga xabar. Qurilmani faqat admin tozalaydi.
User-Agent va brauzer yuborgan device_info birlashtirilib, o'qiladigan `device_label`
("Android 14 · Chrome 130 · Samsung SM-A546E") va to'liq `device_info` JSON saqlanadi.
"""

from __future__ import annotations

import re
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, Request, status
from jose import JWTError
from sqlalchemy import ColumnElement, and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_refresh_token,
    verify_password_async,
)
from app.models.enums import NotificationType, UserRole
from app.models.refresh_token import RefreshToken
from app.models.user import User

# Parallel refresh (bir nechta tab / bir vaqtda 401 olgan so'rovlar) uchun yengillik:
# allaqachon almashtirilgan token shu oraliq ichida yana kelsa — xato o'rniga yangi juftlik.
REFRESH_ROTATION_GRACE = timedelta(seconds=60)

DEVICE_BLOCKED_DETAIL = (
    "Bu profil boshqa qurilmaga bog'langan. Yangi qurilmadan kirish uchun "
    "administratorga murojaat qiling (eski qurilmani o'chirishi kerak)."
)
# Telegram/Instagram ichidagi brauzer alohida xotiraga ega — talaba "boshqa qurilma" ko'rinadi
WEBVIEW_HINT = (
    " Siz ilova ichidagi brauzerdan (masalan, Telegram) kirmoqdasiz — "
    "saytni Chrome yoki Safari'da oching."
)

# Brute-force himoyasi (jarayon ichida; ko'p worker bo'lsa har biri alohida hisoblaydi)
LOGIN_FAIL_WINDOW = timedelta(minutes=15)
LOGIN_MAX_FAILS_PER_USER = 10
LOGIN_MAX_FAILS_PER_IP = 60
_failed_attempts: dict[str, deque[datetime]] = defaultdict(deque)


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    ua = request.headers.get("user-agent")
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else None
    if not ip:
        ip = request.client.host if request.client else None
    return ua, ip


# ─── User-Agent tahlili ───────────────────────────────────

_WINDOWS_VERSIONS = {
    "10.0": "10/11",
    "6.3": "8.1",
    "6.2": "8",
    "6.1": "7",
    "6.0": "Vista",
    "5.1": "XP",
}

_BROWSER_PATTERNS: tuple[tuple[str, str], ...] = (
    ("Edge", r"Edg[A-Za-z]*/(\d+(?:\.\d+)?)"),
    ("Opera", r"OPR/(\d+(?:\.\d+)?)"),
    ("Samsung Internet", r"SamsungBrowser/(\d+(?:\.\d+)?)"),
    ("Yandex", r"YaBrowser/(\d+(?:\.\d+)?)"),
    ("UC Browser", r"UCBrowser/(\d+(?:\.\d+)?)"),
    ("Mi Browser", r"MiuiBrowser/(\d+(?:\.\d+)?)"),
    ("Huawei Browser", r"HuaweiBrowser/(\d+(?:\.\d+)?)"),
    ("Firefox", r"(?:FxiOS|Firefox)/(\d+(?:\.\d+)?)"),
    ("Chrome", r"(?:CriOS|Chrome)/(\d+(?:\.\d+)?)"),
    ("Safari", r"Version/(\d+(?:\.\d+)?)[^)]*Safari/"),
)


def parse_user_agent(ua: str | None) -> dict[str, Any]:
    """User-Agent satridan OS, versiya, brauzer, model va qurilma turini ajratadi."""
    out: dict[str, Any] = {
        "os": None,
        "os_version": None,
        "browser": None,
        "browser_version": None,
        "model": None,
        "device_type": None,
        "webview": False,
    }
    if not ua:
        return out
    s = ua

    # ── OS ──
    if re.search(r"iPhone|iPad|iPod", s):
        out["os"] = "iOS"
        m = re.search(r"OS (\d+)[._](\d+)(?:[._](\d+))?", s)
        if m:
            out["os_version"] = ".".join(p for p in m.groups() if p)
        out["model"] = "iPad" if "iPad" in s else "iPhone"
        out["device_type"] = "tablet" if "iPad" in s else "mobile"
    elif "Android" in s:
        out["os"] = "Android"
        m = re.search(r"Android (\d+(?:\.\d+)*)", s)
        if m:
            out["os_version"] = m.group(1)
        # "(Linux; Android 14; SM-A546E Build/UP1A...)" yoki qisqartirilgan UA
        # "(Linux; Android 10; K)" — "K" model emas
        mm = re.search(r"Android [^;)]+;\s*([^;)]+?)(?:\s+Build/|\))", s)
        if mm:
            model = mm.group(1).strip()
            if model and model.lower() not in {"k", "mobile", "tablet", "wv"}:
                out["model"] = model
        out["device_type"] = "mobile" if "Mobile" in s else "tablet"
    elif "Windows" in s:
        out["os"] = "Windows"
        m = re.search(r"Windows NT (\d+\.\d+)", s)
        if m:
            out["os_version"] = _WINDOWS_VERSIONS.get(m.group(1), m.group(1))
        out["device_type"] = "desktop"
    elif "CrOS" in s:
        out["os"] = "ChromeOS"
        out["device_type"] = "desktop"
    elif "Mac OS X" in s or "Macintosh" in s:
        out["os"] = "macOS"
        m = re.search(r"Mac OS X (\d+[._]\d+(?:[._]\d+)?)", s)
        if m:
            out["os_version"] = m.group(1).replace("_", ".")
        out["device_type"] = "desktop"
    elif "Linux" in s:
        out["os"] = "Linux"
        out["device_type"] = "desktop"

    # ── Brauzer ──
    for name, pattern in _BROWSER_PATTERNS:
        m = re.search(pattern, s)
        if m:
            out["browser"] = name
            out["browser_version"] = m.group(1).split(".")[0]
            break
    if out["browser"] is None and "Safari/" in s and out["os"] == "iOS":
        out["browser"] = "Safari"
    if out["browser"] is None and "Telegram" in s:
        out["browser"] = "Telegram"
    if "; wv" in s or " wv)" in s or "Telegram" in s:
        out["webview"] = True
    # iOS: WKWebView (Telegram/Instagram ichidagi brauzer) UA'da "Safari/" bo'lmaydi
    if out["os"] == "iOS" and "Safari/" not in s and not re.search(r"(CriOS|FxiOS|EdgiOS)/", s):
        out["webview"] = True
    return out


def _clean(v: Any, limit: int = 128) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s[:limit] or None


def build_device_info(
    client: dict[str, Any] | None, ua: str | None, ip: str | None
) -> dict[str, Any]:
    """Brauzer yuborgan ma'lumot + server UA tahlili → yagona flat dict."""
    parsed = parse_user_agent(ua)
    client = client or {}

    platform = _clean(client.get("platform")) or parsed["os"]
    # Brauzer yuborgan versiya (userAgentData high-entropy) aniqroq — "14.0.0" → "14"
    platform_version = _clean(client.get("platform_version")) or parsed["os_version"]
    if platform_version:
        platform_version = re.sub(r"(\.0)+$", "", platform_version)

    model = _clean(client.get("model"))
    if model and model.lower() in {"k", "mobile", "tablet"}:
        model = None
    model = model or parsed["model"]

    browser = parsed["browser"] or _clean(client.get("browser"), 64)
    browser_version = parsed["browser_version"] or _clean(client.get("browser_version"), 32)
    if browser_version:
        browser_version = browser_version.split(".")[0]

    return {
        "platform": platform,
        "platform_version": platform_version,
        "model": model,
        "brand": _clean(client.get("brand"), 64),
        "browser": browser,
        "browser_version": browser_version,
        "device_type": parsed["device_type"],
        "webview": bool(parsed["webview"]),
        "screen": _clean(client.get("screen"), 32),
        "timezone": _clean(client.get("timezone"), 64),
        "language": _clean(client.get("language"), 32),
        "touch": client.get("touch") if isinstance(client.get("touch"), bool) else None,
        "user_agent": (ua or _clean(client.get("user_agent"), 512) or "")[:512] or None,
        "ip": ip,
    }


def build_device_label(info: dict[str, Any]) -> str | None:
    """'Android 14 · Chrome 130 · Samsung SM-A546E' ko'rinishidagi qisqa tavsif."""
    parts: list[str] = []
    if info.get("platform"):
        parts.append(
            f"{info['platform']} {info['platform_version']}".strip()
            if info.get("platform_version")
            else str(info["platform"])
        )
    if info.get("browser"):
        parts.append(
            f"{info['browser']} {info['browser_version']}".strip()
            if info.get("browser_version")
            else str(info["browser"])
        )
    if info.get("model"):
        brand = info.get("brand")
        model = str(info["model"])
        if (
            brand
            and brand.lower() not in model.lower()
            and brand.lower()
            not in {
                "chromium",
                "google chrome",
                "chrome",
                "microsoft edge",
                "opera",
                "yandex",
            }
        ):
            model = f"{brand} {model}"
        parts.append(model)
    label = " · ".join(parts)
    return label[:255] or None


# ─── Qurilma bog'lash ────────────────────────────────────

DEVICE_ALERT_COOLDOWN = timedelta(minutes=15)


async def _device_alert_recipients(db: AsyncSession, user: User) -> list[Any]:
    """Super adminlar + talaba fakultetining admini (yoki fakultetga biriktirilmagan admin)."""
    from app.models.academic import Direction, Group
    from app.models.student import Student

    student_faculty = (
        await db.execute(
            select(Direction.faculty_id)
            .select_from(Student)
            .join(Group, Group.id == Student.group_id)
            .join(Direction, Direction.id == Group.direction_id)
            .where(Student.user_id == user.id)
        )
    ).scalar_one_or_none()
    admin_scope: ColumnElement[bool] = User.faculty_id.is_(None)
    if student_faculty is not None:
        admin_scope = or_(admin_scope, User.faculty_id == student_faculty)
    rows = await db.execute(
        select(User.id).where(
            User.is_active.is_(True),
            or_(
                User.role == UserRole.SUPER_ADMIN,
                and_(User.role == UserRole.ADMIN, admin_scope),
            ),
        )
    )
    return list(rows.scalars().all())


async def _recent_device_alert_exists(db: AsyncSession, user: User) -> bool:
    """Bir talaba qayta-qayta urinsa adminlar xabarga ko'milib ketmasin (15 daqiqada bir marta)."""
    from app.models.notification import Notification

    since = datetime.now(UTC) - DEVICE_ALERT_COOLDOWN
    found = (
        await db.execute(
            select(Notification.id)
            .where(
                Notification.type == NotificationType.GENERIC,
                Notification.created_at >= since,
                Notification.data["kind"].astext == "device_blocked",
                Notification.data["user_id"].astext == str(user.id),
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    return found is not None


async def enforce_device_binding(
    db: AsyncSession,
    user: User,
    device_id: str | None,
    request: Request,
    device_info: dict[str, Any] | None = None,
) -> None:
    """Talaba uchun bitta-qurilma siyosati.

    - Birinchi kirish: qurilma bog'lanadi (device_id + o'qiladigan label + to'liq info).
    - Bog'langan qurilma bilan: o'tadi (info yangilanadi — brauzer yangilangan bo'lishi mumkin).
    - Boshqa qurilma: admin/super_admin'ga xabar yuboriladi va 403 qaytariladi.
      Avtomatik qayta bog'lash YO'Q — faqat admin "qurilmani o'chirish" orqali.

    Faqat talaba rolga tegishli. device_id berilmasa — bog'lash o'tkazib yuboriladi.
    """
    if user.role != UserRole.STUDENT:
        return
    if not device_id or len(device_id) < 8:
        # Veb-ilova har doim yuboradi; yo'q bo'lsa — curl/Postman orqali qoidani chetlab o'tishga
        # urinish yoki juda eski sahifa. Bog'lanmasdan kirishga ruxsat berilmaydi.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Qurilma aniqlanmadi. Sahifani yangilab, qayta urinib ko'ring.",
        )

    ua, ip = _client_meta(request)
    info = build_device_info(device_info, ua, ip)
    label = build_device_label(info)
    now = datetime.now(UTC)

    if user.device_id is None:
        user.device_id = device_id
        user.device_label = label or (ua or "")[:255] or None
        user.device_info = {**info, "bound_at": now.isoformat()}
        user.device_bound_at = now
        await db.commit()
        return

    if user.device_id == device_id:
        # Shu qurilma — oldingi ma'lumot ustiga faqat yangi (bo'sh bo'lmagan) qiymatlar yoziladi,
        # brauzer bu safar device_info yubormasa ham brand/ekran/vaqt zonasi yo'qolmaydi.
        previous = dict(user.device_info or {})
        merged = {**previous, **{k: v for k, v in info.items() if v is not None}}
        merged["bound_at"] = previous.get("bound_at") or (
            user.device_bound_at.isoformat() if user.device_bound_at else now.isoformat()
        )
        merged["last_seen_at"] = now.isoformat()
        user.device_info = merged
        new_label = build_device_label(merged) or user.device_label
        if new_label != user.device_label:
            user.device_label = new_label
        await db.commit()
        return

    # Boshqa qurilma — adminlarga xabar + blok
    from app.services import notification as notification_svc

    admin_ids = await _device_alert_recipients(db, user)
    if admin_ids and not await _recent_device_alert_exists(db, user):
        await notification_svc.create_bulk(
            db,
            user_ids=list(admin_ids),
            type=NotificationType.GENERIC,
            title="Boshqa qurilmadan kirishga urinish",
            body=(
                f"{user.full_name} ({user.username}) boshqa qurilmadan kirishga urindi: "
                f"{label or 'noma`lum qurilma'}. Bog'langan qurilma: "
                f"{user.device_label or '—'}. Yangi qurilmaga ruxsat berish uchun talaba "
                f"kartasida eski qurilmani o'chiring."
            ),
            data={
                "kind": "device_blocked",
                "user_id": str(user.id),
                "username": user.username,
                "attempted_device": label,
                "attempted_user_agent": ua,
                "attempted_ip": ip,
                "bound_device": user.device_label,
            },
        )
        await db.commit()

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=DEVICE_BLOCKED_DETAIL + (WEBVIEW_HINT if info.get("webview") else ""),
    )


# ─── Login ───────────────────────────────────────────────


def _prune(key: str, now: datetime) -> deque[datetime]:
    q = _failed_attempts[key]
    while q and now - q[0] > LOGIN_FAIL_WINDOW:
        q.popleft()
    if not q:
        _failed_attempts.pop(key, None)
        return deque()
    return q


def _check_rate_limit(username: str, ip: str | None) -> None:
    now = datetime.now(UTC)
    user_q = _prune(f"u:{username.lower()}", now)
    ip_q = _prune(f"ip:{ip}", now) if ip else deque()
    blocked_q = None
    if len(user_q) >= LOGIN_MAX_FAILS_PER_USER:
        blocked_q = user_q
    elif ip and len(ip_q) >= LOGIN_MAX_FAILS_PER_IP:
        blocked_q = ip_q
    if blocked_q:
        retry_in = LOGIN_FAIL_WINDOW - (now - blocked_q[0])
        minutes = max(1, int(retry_in.total_seconds() // 60) + 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Juda ko'p urinish. {minutes} daqiqadan keyin qayta urinib ko'ring",
            headers={"Retry-After": str(int(retry_in.total_seconds()) + 1)},
        )


def _record_failure(username: str, ip: str | None) -> None:
    now = datetime.now(UTC)
    _failed_attempts[f"u:{username.lower()}"].append(now)
    if ip:
        _failed_attempts[f"ip:{ip}"].append(now)


def _clear_failures(username: str) -> None:
    _failed_attempts.pop(f"u:{username.lower()}", None)


async def _find_user_by_username(db: AsyncSession, username: str) -> User | None:
    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if user is not None:
        return user
    # Katta-kichik harf farqi bilan yozilgan login (admin/supervizor uchun qulaylik)
    return (
        await db.execute(select(User).where(func.lower(User.username) == username.lower()).limit(1))
    ).scalar_one_or_none()


async def authenticate(
    db: AsyncSession, username: str, password: str, request: Request | None = None
) -> User:
    """Login + parolni tekshiradi. Xatolar aniq ajratiladi:

    401 "Bunday login topilmadi" · 401 "Parol noto'g'ri" · 403 "Hisob bloklangan" ·
    429 "Juda ko'p urinish". Muvaffaqiyatda urinishlar hisobi tozalanadi.
    """
    username = username.strip()
    _ip = _client_meta(request)[1] if request else None
    _check_rate_limit(username, _ip)

    user = await _find_user_by_username(db, username)
    if not user:
        _record_failure(username, _ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bunday login topilmadi",
        )
    if not await verify_password_async(password, user.password_hash):
        _record_failure(username, _ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Parol noto'g'ri",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hisob bloklangan. Admin bilan bog'laning.",
        )
    _clear_failures(username)
    return user


async def issue_tokens_for(db: AsyncSession, user: User, request: Request) -> tuple[str, str, int]:
    """Yangi access + refresh yaratib, refresh'ni DB'ga yozadi.

    `(access_token, refresh_token, access_ttl_seconds)` qaytaradi.
    """
    access_token, _ = create_access_token(user.id, user.role.value)
    refresh_token, _jti, expires_at = create_refresh_token(user.id)

    ua, ip = _client_meta(request)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=expires_at,
            user_agent=(ua or "")[:500] or None,
            ip_address=(ip or "")[:45] or None,
        )
    )
    user.last_login_at = datetime.now(UTC)
    await db.commit()

    return access_token, refresh_token, settings.JWT_ACCESS_TTL_MIN * 60


async def refresh_tokens(
    db: AsyncSession, refresh_token: str, request: Request
) -> tuple[str, str, int]:
    """Refresh'ni tekshirib, yangi juftlik beradi. Rotation: eskisi bekor qilinadi.

    Grace: eskisi hozirgina (REFRESH_ROTATION_GRACE ichida) almashtirilgan bo'lsa — bu
    parallel so'rov/tab; xato o'rniga yana yangi juftlik beriladi (foydalanuvchi chiqib ketmaydi).
    """
    unauth = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token yaroqsiz",
    )

    try:
        decode_token(refresh_token, expected_type=TokenType.REFRESH)
    except JWTError as e:
        raise unauth from e

    token_hash = hash_refresh_token(refresh_token)
    db_token = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    if not db_token or db_token.expires_at <= now:
        raise unauth
    if db_token.revoked_at is not None:
        recently_rotated = (
            db_token.replaced_by_id is not None
            and now - db_token.revoked_at <= REFRESH_ROTATION_GRACE
        )
        if not recently_rotated:
            raise unauth

    user = await db.get(User, db_token.user_id)
    if not user or not user.is_active:
        raise unauth

    # Yangi juftlik
    new_access, _ = create_access_token(user.id, user.role.value)
    new_refresh, _jti, new_expires_at = create_refresh_token(user.id)

    ua, ip = _client_meta(request)
    new_row = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(new_refresh),
        expires_at=new_expires_at,
        user_agent=(ua or "")[:500] or None,
        ip_address=(ip or "")[:45] or None,
    )
    db.add(new_row)
    await db.flush()  # new_row.id uchun

    # Eskisini bekor qilish va rotation chain (grace holatida allaqachon bekor qilingan)
    if db_token.revoked_at is None:
        db_token.revoked_at = now
        db_token.replaced_by_id = new_row.id

    await db.commit()
    return new_access, new_refresh, settings.JWT_ACCESS_TTL_MIN * 60


async def logout(db: AsyncSession, refresh_token: str | None) -> None:
    """Refresh token'ni DB da bekor qilinadi. Token bo'lmasa — jim o'tadi."""
    if not refresh_token:
        return

    token_hash = hash_refresh_token(refresh_token)
    db_token = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    ).scalar_one_or_none()

    if db_token and db_token.revoked_at is None:
        db_token.revoked_at = datetime.now(UTC)
        await db.commit()


async def revoke_all_refresh_tokens(
    db: AsyncSession, user_id: Any, *, keep_token: str | None = None, commit: bool = False
) -> int:
    """Foydalanuvchining barcha aktiv sessiyalarini yopadi (parol/qurilma o'zgarganda).

    `keep_token` — joriy brauzerning refresh cookie'si; u saqlanadi (foydalanuvchi
    parolni o'zgartirgach o'zi chiqib ketmasin).
    """
    stmt = (
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    if keep_token:
        stmt = stmt.where(RefreshToken.token_hash != hash_refresh_token(keep_token))
    result = await db.execute(stmt)
    if commit:
        await db.commit()
    return int(getattr(result, "rowcount", 0) or 0)
