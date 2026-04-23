"""Loguru konfiguratsiyasi — barcha logger'lar uchun umumiy format."""

import logging
import sys
from types import FrameType

from loguru import logger

from app.core.config import settings


class InterceptHandler(logging.Handler):
    """Standard logging → loguru redirector."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level: str | int = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame: FrameType | None = logging.currentframe()
        depth = 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging() -> None:
    logger.remove()

    fmt = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    logger.add(
        sys.stdout,
        format=fmt,
        level="DEBUG" if settings.APP_DEBUG else "INFO",
        colorize=True,
        backtrace=settings.APP_DEBUG,
        diagnose=settings.APP_DEBUG,
    )

    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

    for name in (
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
        "fastapi",
        "sqlalchemy.engine",
    ):
        logging.getLogger(name).handlers = [InterceptHandler()]
        logging.getLogger(name).propagate = False
