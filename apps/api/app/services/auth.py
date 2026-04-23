"""Auth business logic — authenticate, login, refresh, logout."""

from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_refresh_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    return ua, ip


async def authenticate(db: AsyncSession, username: str, password: str) -> User:
    """Login + parolni tekshiradi. Xato yoki bloklangan hisob → HTTPException."""
    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login yoki parol noto'g'ri",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hisob bloklangan. Admin bilan bog'laning.",
        )
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
            user_agent=ua,
            ip_address=ip,
        )
    )
    user.last_login_at = datetime.now(UTC)
    await db.commit()

    return access_token, refresh_token, settings.JWT_ACCESS_TTL_MIN * 60


async def refresh_tokens(
    db: AsyncSession, refresh_token: str, request: Request
) -> tuple[str, str, int]:
    """Refresh'ni tekshirib, yangi juftlik beradi. Rotation: eskisi bekor qilinadi."""
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

    if not db_token or not db_token.is_active:
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
        user_agent=ua,
        ip_address=ip,
    )
    db.add(new_row)
    await db.flush()  # new_row.id uchun

    # Eskisini bekor qilish va rotation chain
    db_token.revoked_at = datetime.now(UTC)
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
