"""Backend xato xabarlari tarjimasi — mexanizm va katalog sog'lomligi."""

from app.core.i18n import pick_lang, translate_detail
from app.core.i18n_catalog import EXACT, PATTERNS


class TestPickLang:
    def test_default_uz(self) -> None:
        assert pick_lang(None) == "uz"
        assert pick_lang("") == "uz"
        assert pick_lang("uz-UZ") == "uz"
        assert pick_lang("en-US,en;q=0.9") == "uz"

    def test_ru_variantlari(self) -> None:
        assert pick_lang("ru") == "ru"
        assert pick_lang("ru-RU,ru;q=0.9,en;q=0.8") == "ru"
        assert pick_lang("RU") == "ru"


class TestTranslateDetail:
    def test_exact(self) -> None:
        assert translate_detail("Login yoki parol noto'g'ri", "ru") == "Неверный логин или пароль"

    def test_pattern_parametr_bilan(self) -> None:
        out = translate_detail("Talaba topilmadi: abc-123", "ru")
        assert out == "Студент не найден: abc-123"

    def test_apostrofli_pattern(self) -> None:
        out = translate_detail("Tashkilot sig'imi to'la (5/5)", "ru")
        assert "5/5" in out and "сig'imi" not in out
        assert out != "Tashkilot sig'imi to'la (5/5)"

    def test_notanish_xabar_ozgarishsiz(self) -> None:
        msg = "Mavjud bo'lmagan xabar 123"
        assert translate_detail(msg, "ru") == msg

    def test_uz_tilida_tegilmaydi(self) -> None:
        msg = "Login yoki parol noto'g'ri"
        assert translate_detail(msg, "uz") == msg


class TestCatalogSoglomligi:
    def test_boslar_yoq(self) -> None:
        assert all(k and v for k, v in EXACT.items())
        assert all(p and t for p, t in PATTERNS)

    def test_patternlar_kompilyatsiya_bolar(self) -> None:
        import re

        for p, _ in PATTERNS:
            re.compile(p)

    def test_pattern_shablonlari_guruhlarga_mos(self) -> None:
        # Har bir {name} placeholder regexdagi named group'da bo'lishi kerak
        import re
        import string

        for p, tmpl in PATTERNS:
            groups = set(re.compile(p).groupindex)
            fields = {
                f for _, f, _, _ in string.Formatter().parse(tmpl) if f
            }
            assert fields <= groups, f"{tmpl!r} da regexda yo'q guruh bor: {fields - groups}"
