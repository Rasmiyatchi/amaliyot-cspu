"""Qidiruv yordamchilari — o'zbekcha apostroflar farqsiz.

"O'g'li", "Oʻgʻli" va "O’g’li" bir xil topilishi kerak: HEMIS, Excel va telefon
klaviaturalari turli belgilarni yozadi. Shuning uchun ham qidiruv so'zidan, ham
ustundan barcha apostrof turlari olib tashlanadi va kichik harfga o'tkaziladi.
"""

from typing import Any

from sqlalchemy import func

__all__ = ["escape_like", "like_pattern", "normalize_term", "normalized_col"]

_APOSTROPHES = ("'", "’", "‘", "ʻ", "ʼ", "`")


def normalize_term(term: str) -> str:
    s = term.strip().lower()
    for ch in _APOSTROPHES:
        s = s.replace(ch, "")
    return s


def normalized_col(col: Any) -> Any:
    """SQL: lower(col) dan barcha apostroflar olib tashlangan ifoda."""
    expr = func.lower(col)
    for ch in _APOSTROPHES:
        expr = func.replace(expr, ch, "")
    return expr


def escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def like_pattern(term: str) -> str:
    """`normalized_col(...).like(like_pattern(term), escape="\\\\")` uchun naqsh."""
    return f"%{escape_like(normalize_term(term))}%"
