"""
Ma'lumotlar bazasini 0 dan tozalash va tizimni boshlang'ich holatga keltirish skripti.
Ishga tushirish: uv run python scripts/clean_and_reset_data.py
"""

import asyncio
from loguru import logger
from app.db.session import SessionLocal
from app.services.data_cleaner import reset_all_data
from app.core.config import settings

async def main():
    logger.info("🧹 Ma'lumotlar bazasini tozalash boshlandi...")
    async with SessionLocal() as db:
        counts = await reset_all_data(db)
        logger.info("📊 Tozalashdan keyingi jadval ko'rsatkichlari:")
        for tbl, cnt in sorted(counts.items()):
            logger.info(f"  • {tbl}: {cnt} ta yozuv")
            
    logger.success("✨ Baza muvaffaqiyatli tozalandi va 0 dan boshlash uchun tayyor holga keltirildi!")
    logger.info(f"👤 Super Admin: {settings.SUPERADMIN_USERNAME}")
    logger.info(f"🔒 Parol: {settings.SUPERADMIN_PASSWORD}")

if __name__ == "__main__":
    asyncio.run(main())
