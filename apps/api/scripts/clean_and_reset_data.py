"""Ma'lumotlar bazasini sinov ma'lumotlaridan tozalash (faqat terminal orqali).

Ishga tushirish (apps/api ichida):
    uv run python scripts/clean_and_reset_data.py

Production'da qo'shimcha: ALLOW_DATABASE_RESET=1 muhit o'zgaruvchisi va terminalda "TOZALASH"
so'zini yozib tasdiqlash shart. Super admin(lar), shartnoma shablonlari va audit jurnali saqlanadi.
"""

import asyncio
import sys

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.data_cleaner import ResetNotAllowedError, reset_all_data
from loguru import logger

CONFIRM_WORD = "TOZALASH"


def confirm() -> bool:
    print(f"Muhit: {settings.APP_ENV}. Barcha talabalar, supervizorlar, adminlar, biriktirishlar,")
    print("davomat, shartnomalar va yuklangan fayllar O'CHIRILADI (super admin saqlanadi).")
    answer = input(f'Davom etish uchun "{CONFIRM_WORD}" deb yozing: ').strip()
    return answer == CONFIRM_WORD


async def main() -> int:
    async with SessionLocal() as db:
        try:
            deleted = await reset_all_data(db)
        except ResetNotAllowedError as e:
            logger.error(str(e))
            return 2

    for table, count in sorted(deleted.items()):
        logger.info(f"  • {table}: {count} ta yozuv o'chirildi")
    logger.success("Baza tozalandi. Super admin login va paroli o'zgartirilmadi.")
    return 0


if __name__ == "__main__":
    if not confirm():
        print("Bekor qilindi.")
        sys.exit(1)
    sys.exit(asyncio.run(main()))
