"""Auth endpoints: /login, /refresh, /logout, /me + profile + password + avatar."""

from typing import Annotated

from fastapi import (
    APIRouter,
    Cookie,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.session import SessionDep
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    ProfileUpdateRequest,
    TokenResponse,
    UserMeResponse,
)
from app.services.auth import (
    authenticate,
    issue_tokens_for,
    refresh_tokens,
)
from app.services.auth import (
    logout as logout_service,
)

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "rt"
COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=settings.JWT_REFRESH_TTL_DAYS * 86400,
        httponly=True,
        samesite="strict",
        secure=settings.APP_ENV != "development",
        path=COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path=COOKIE_PATH)


@router.post("/login", response_model=TokenResponse, summary="Login")
async def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    db: SessionDep,
) -> TokenResponse:
    user = await authenticate(db, data.username, data.password)
    access, refresh, ttl = await issue_tokens_for(db, user, request)
    _set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=access, expires_in=ttl)


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh(
    request: Request,
    response: Response,
    db: SessionDep,
    rt: Annotated[str | None, Cookie()] = None,
) -> TokenResponse:
    if not rt:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh cookie topilmadi",
        )
    access, new_refresh, ttl = await refresh_tokens(db, rt, request)
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=access, expires_in=ttl)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Logout")
async def logout(
    response: Response,
    db: SessionDep,
    rt: Annotated[str | None, Cookie()] = None,
) -> None:
    await logout_service(db, rt)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserMeResponse, summary="Current user info")
async def me(user: CurrentUser) -> CurrentUser:
    return user


@router.patch(
    "/me",
    response_model=UserMeResponse,
    summary="O'z profilini tahrirlash (ism, email, telefon)",
)
async def update_me(
    data: ProfileUpdateRequest, db: SessionDep, user: CurrentUser
) -> CurrentUser:
    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(user, key, value)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email allaqachon band") from e
    await db.refresh(user)
    return user


@router.post(
    "/me/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="O'z parolini o'zgartirish",
)
async def change_my_password(
    data: ChangePasswordRequest, db: SessionDep, user: CurrentUser
) -> None:
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Joriy parol noto'g'ri"
        )
    user.password_hash = hash_password(data.new_password)
    await db.commit()


@router.post(
    "/me/avatar",
    response_model=UserMeResponse,
    summary="Avatar yuklash",
)
async def upload_avatar(
    db: SessionDep,
    user: CurrentUser,
    file: UploadFile = File(...),
) -> CurrentUser:
    from app.services import uploads as uploads_svc

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Faqat rasm fayllari (jpg, png, webp)",
        )
    attachment = await uploads_svc.save_file(db, file, user)
    user.avatar_url = f"/api/v1/uploads/file/{attachment['path']}"
    await db.commit()
    await db.refresh(user)
    return user
