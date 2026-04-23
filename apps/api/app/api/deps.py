"""FastAPI dependency'lar — auth va avtorizatsiya."""

from collections.abc import Callable, Coroutine
from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select

from app.core.security import TokenType, decode_token
from app.db.session import SessionDep
from app.models.enums import UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=True)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: SessionDep,
) -> User:
    """Access token'ni dekod qilib, user'ni yuklaydi. Token yaroqsiz → 401."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Noto'g'ri yoki muddati o'tgan token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token, expected_type=TokenType.ACCESS)
    except JWTError as e:
        raise credentials_exc from e

    sub = payload.get("sub")
    if not sub:
        raise credentials_exc

    try:
        user_id = UUID(sub)
    except ValueError as e:
        raise credentials_exc from e

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exc

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(
    allowed: list[UserRole],
) -> Callable[[User], Coroutine[Any, Any, User]]:
    """Ruxsat etilgan rollardan birini talab qiluvchi dependency yaratadi.

    Ishlatish:
        @router.get("/x")
        async def handler(user: Annotated[User, Depends(require_role([UserRole.ADMIN]))]): ...

    Bir nechta rol:
        Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
    """

    async def _checker(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ushbu amal uchun ruxsatingiz yo'q",
            )
        return user

    return _checker


# Tez-tez ishlatiladigan kombinatsiyalar
RequireSuperAdmin = Annotated[User, Depends(require_role([UserRole.SUPER_ADMIN]))]
RequireAdmin = Annotated[User, Depends(require_role([UserRole.SUPER_ADMIN, UserRole.ADMIN]))]
RequireSupervisor = Annotated[User, Depends(require_role([UserRole.SUPERVISOR]))]
RequireStudent = Annotated[User, Depends(require_role([UserRole.STUDENT]))]
