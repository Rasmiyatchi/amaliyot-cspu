"""Auth endpoints: /login, /refresh, /logout, /me."""

from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status

from app.api.deps import CurrentUser
from app.core.config import settings
from app.db.session import SessionDep
from app.schemas.auth import LoginRequest, TokenResponse, UserMeResponse
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
