"""Parol hash, JWT encode/decode — auth uchun past darajali yordamchilar."""

import asyncio
import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any, cast
from uuid import UUID, uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
# Import paytida yaratiladigan VAQTINCHALIK parollar (login = parol, birinchi kirishda
# almashtiriladi) uchun yengilroq narx: 1000 qatorli Excel 4 baravar tezroq import bo'ladi.
# Tekshirish (verify) ikkala narxni ham taniydi.
_temp_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=10)


# ─── Parol ────────────────────────────────────────────────


def hash_password(password: str) -> str:
    return cast(str, pwd_context.hash(password))


def verify_password(plain: str, hashed: str) -> bool:
    return cast(bool, pwd_context.verify(plain, hashed))


# bcrypt ~0.25 s CPU oladi. API bitta uvicorn worker'da ishlaydi — sinxron chaqiruv butun
# event loop'ni to'xtatardi (ertalab yuzlab talaba bir vaqtda kirganda login timeout bo'lardi).
# Shuning uchun so'rov ichida faqat quyidagi async variantlar ishlatiladi (bcrypt GIL'ni bo'shatadi).


async def hash_password_async(password: str, *, temporary: bool = False) -> str:
    ctx = _temp_pwd_context if temporary else pwd_context
    return cast(str, await asyncio.to_thread(ctx.hash, password))


async def verify_password_async(plain: str, hashed: str) -> bool:
    return cast(bool, await asyncio.to_thread(pwd_context.verify, plain, hashed))


# ─── JWT ──────────────────────────────────────────────────


def _create_token(
    subject: str | UUID,
    token_type: TokenType,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """JWT yaratadi. `(token, jti)` qaytaradi — jti refresh token DB yozuvi uchun kerak."""
    now = datetime.now(UTC)
    jti = str(uuid4())
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": now + expires_delta,
        "jti": jti,
        "type": token_type.value,
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti


def create_access_token(user_id: UUID, role: str) -> tuple[str, str]:
    return _create_token(
        subject=user_id,
        token_type=TokenType.ACCESS,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TTL_MIN),
        extra_claims={"role": role},
    )


def create_refresh_token(user_id: UUID) -> tuple[str, str, datetime]:
    """`(token, jti, expires_at)` qaytaradi."""
    expires_at = datetime.now(UTC) + timedelta(days=settings.JWT_REFRESH_TTL_DAYS)
    token, jti = _create_token(
        subject=user_id,
        token_type=TokenType.REFRESH,
        expires_delta=timedelta(days=settings.JWT_REFRESH_TTL_DAYS),
    )
    return token, jti, expires_at


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    """Token'ni dekod qiladi va tekshiradi. Xato bo'lsa JWTError raise qiladi."""
    payload = cast(
        dict[str, Any],
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]),
    )
    if expected_type and payload.get("type") != expected_type.value:
        raise JWTError(f"Token type mismatch: expected {expected_type}")
    return payload


# ─── Refresh token hashing ────────────────────────────────


def hash_refresh_token(token: str) -> str:
    """Refresh token'ni DB da saqlash uchun SHA-256 hash. Plaintext saqlanmaydi."""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_secure_token(nbytes: int = 32) -> str:
    """Xavfsiz tasodifiy token (CSRF va b. uchun)."""
    return secrets.token_urlsafe(nbytes)
