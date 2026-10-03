"""FastAPI dependency'lar — auth va avtorizatsiya."""

from collections.abc import Callable, Coroutine
from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select

from app.core.security import TokenType, decode_token
from app.db.session import SessionDep
from app.models.enums import UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=True)

# must_change_password=True bo'lgan foydalanuvchi parolni almashtirmaguncha faqat shu
# yo'llarga kira oladi (frontend ham /change-password ga yo'naltiradi — bu server tomondagi qulf).
MUST_CHANGE_PASSWORD_ALLOWED_PATHS: frozenset[str] = frozenset(
    {
        "/api/v1/auth/me",
        "/api/v1/auth/me/change-password",
        "/api/v1/auth/me/force-change-password",
        "/api/v1/auth/logout",
        "/api/v1/auth/refresh",
    }
)


async def get_current_user(
    request: Request,
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

    if (
        user.must_change_password
        and request.url.path.rstrip("/") not in MUST_CHANGE_PASSWORD_ALLOWED_PATHS
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Avval parolni o'zgartirishingiz kerak",
            headers={"X-Must-Change-Password": "1"},
        )

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
RequireSupervisorOrAdmin = Annotated[
    User, Depends(require_role([UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]))
]
RequireStudent = Annotated[User, Depends(require_role([UserRole.STUDENT]))]


def require_permission(
    permission: str,
) -> Callable[[User], Coroutine[Any, Any, User]]:
    """Admin uchun modul huquqini (permission) tekshiruvchi dependency.

    - super_admin har doim to'liq cheklovsiz ruxsatga ega.
    - admin uchun:
      agar user.permissions ichida permission bo'lmasa -> 403 Forbidden.
      maxsus holat: agar permission "contracts" bo'lsa va user "practice" huquqiga ega bo'lsa -> ruxsat beriladi.
    - boshqa rollar uchun -> 403 Forbidden.
    """

    async def _checker(user: CurrentUser) -> User:
        if user.role == UserRole.SUPER_ADMIN:
            return user
        if user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ushbu amal faqat administratorlar uchun",
            )
        perms = user.permissions or []
        if permission not in perms:
            if permission == "contracts" and "practice" in perms:
                return user
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sizda ushbu modulga kirish huquqi yo'q ({permission})",
            )
        return user

    return _checker


RequireStructure = Annotated[User, Depends(require_permission("structure"))]
RequirePractice = Annotated[User, Depends(require_permission("practice"))]
RequireContracts = Annotated[User, Depends(require_permission("contracts"))]
RequireSupervisors = Annotated[User, Depends(require_permission("supervisors"))]
RequirePartners = Annotated[User, Depends(require_permission("partners"))]
RequireMonitoring = Annotated[User, Depends(require_permission("monitoring"))]
RequireInquiries = Annotated[User, Depends(require_permission("inquiries"))]
RequireSystem = Annotated[User, Depends(require_permission("system"))]
