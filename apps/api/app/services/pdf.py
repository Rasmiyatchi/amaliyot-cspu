"""PDF generation — WeasyPrint + Jinja2 + QR kod."""

import base64
from io import BytesIO
from pathlib import Path

import qrcode
from jinja2 import Environment, FileSystemLoader, select_autoescape
from loguru import logger
from weasyprint import HTML

from app.core.config import settings
from app.models.contract import Contract
from app.models.enums import ContractTemplate
from app.models.organization import Organization

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
STORAGE_DIR = Path(__file__).parent.parent.parent / "storage" / "contracts"

# Jinja environment
_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

# Template mapping
_TEMPLATE_FILES: dict[ContractTemplate, str] = {
    ContractTemplate.FOUR_PLUS_TWO: "contracts/4_plus_2.html",
    ContractTemplate.PEDAGOGICAL: "contracts/pedagogical.html",
    ContractTemplate.QUALIFYING: "contracts/qualifying.html",
    ContractTemplate.INTERNSHIP_PRODUCTION: "contracts/qualifying.html",  # keyinroq alohida
    ContractTemplate.PARTNERSHIP: "contracts/qualifying.html",  # keyinroq alohida
}


def _generate_qr_data_uri(url: str) -> str:
    """QR kod PNG — base64 data URI qaytaradi."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("ascii")


def build_verify_url(qr_token: str) -> str:
    """Public verification URL."""
    base = settings.WEB_URL.rstrip("/")
    return f"{base}/verify/{qr_token}"


def render_contract_pdf(contract: Contract, organization: Organization) -> bytes:
    """Shartnomani PDF sifatida generatsiya qiladi. Bytes qaytaradi."""
    template_file = _TEMPLATE_FILES.get(contract.template_ref)
    if not template_file:
        raise ValueError(f"Template topilmadi: {contract.template_ref}")

    template = _env.get_template(template_file)

    verify_url = build_verify_url(contract.qr_token)
    qr_data_uri = _generate_qr_data_uri(verify_url)

    html_content = template.render(
        contract=contract,
        org=organization,
        verify_url=verify_url,
        qr_data_uri=qr_data_uri,
    )

    pdf_bytes: bytes | None = HTML(string=html_content).write_pdf()
    if pdf_bytes is None:
        raise RuntimeError("WeasyPrint PDF generation returned None")

    logger.info(f"PDF generated: {contract.number} ({len(pdf_bytes)} bytes)")
    return bytes(pdf_bytes)


def render_supervisor_report_pdf(context: dict[str, object]) -> bytes:
    """Supervizorning talabalari bo'yicha yakuniy hisobot PDF'i."""
    template = _env.get_template("reports/supervisor_summary.html")
    html_content = template.render(**context)
    pdf_bytes: bytes | None = HTML(string=html_content).write_pdf()
    if pdf_bytes is None:
        raise RuntimeError("WeasyPrint PDF generation returned None")
    logger.info(f"Supervisor report PDF generated ({len(pdf_bytes)} bytes)")
    return bytes(pdf_bytes)


def render_records_pdf(context: dict[str, object]) -> bytes:
    """Qaydnomalar (baholash qaydnomasi) PDF'i."""
    template = _env.get_template("reports/records_sheet.html")
    html_content = template.render(**context)
    pdf_bytes: bytes | None = HTML(string=html_content).write_pdf()
    if pdf_bytes is None:
        raise RuntimeError("WeasyPrint PDF generation returned None")
    logger.info(f"Records PDF generated ({len(pdf_bytes)} bytes)")
    return bytes(pdf_bytes)


def save_contract_pdf(contract: Contract, pdf_bytes: bytes) -> str:
    """PDF'ni storage'ga saqlaydi, file path qaytaradi."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{contract.number.replace('/', '_')}.pdf"
    path = STORAGE_DIR / filename
    path.write_bytes(pdf_bytes)
    return str(path.relative_to(STORAGE_DIR.parent.parent))


def save_contract_scan(contract: Contract, content: bytes, original_filename: str) -> str:
    """Imzolangan skanni saqlaydi."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(original_filename).suffix.lower() or ".pdf"
    if ext not in {".pdf", ".jpg", ".jpeg", ".png"}:
        raise ValueError(f"Ruxsat etilmagan fayl turi: {ext}")
    filename = f"{contract.number.replace('/', '_')}_scan{ext}"
    path = STORAGE_DIR / filename
    path.write_bytes(content)
    return str(path.relative_to(STORAGE_DIR.parent.parent))


def read_pdf(relative_path: str) -> bytes:
    """Saqlangan PDF'ni o'qiydi."""
    abs_path = STORAGE_DIR.parent.parent / relative_path
    if not abs_path.exists():
        raise FileNotFoundError(f"PDF not found: {relative_path}")
    return abs_path.read_bytes()


def _safe_url_fetcher(url: str, timeout: int = 10, ssl_context: object = None) -> dict:
    """WeasyPrint uchun cheklangan URL fetcher — faqat data: URI.

    Shablon HTML'iga (yoki unga almashtirilgan qiymatlarga) file:// yoki
    http://ichki-xost kabi manzillar kirsa, WeasyPrint ularni O'QIB PDF'ga
    joylab yuborardi (SSRF/mahalliy fayl o'qish). QR kod data: URI bilan
    kiritiladi — boshqa hech narsa kerak emas.
    """
    if url.startswith("data:"):
        from weasyprint import default_url_fetcher

        return default_url_fetcher(url)
    raise ValueError(f"Tashqi URL'lar taqiqlangan: {url[:80]}")


def render_student_contract_pdf(html_template: str, data: dict[str, str], qr_token: str) -> bytes:
    """Yangi WYSIWYG tahrirlangan shablondan talaba shartnomasini PDF ga aylantirish."""
    import html as html_mod

    verify_url = build_verify_url(qr_token)
    qr_data_uri = _generate_qr_data_uri(verify_url)

    # Basic CSS for printing A4 and embedding font safely
    style = """
    <style>
        @page { size: A4; margin: 2cm; }
        body { font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #000; }
        .qr-code { width: 100px; height: 100px; }
    </style>
    """

    # QR kod tasvir tagi
    qr_img_tag = f'<img src="data:image/png;base64,{qr_data_uri}" class="qr-code" alt="QR Code" />'

    html_content = html_template

    # {qr_code} o'zgaruvchisini almashtirish
    if "{qr_code}" in html_content:
        html_content = html_content.replace("{qr_code}", qr_img_tag)
    else:
        # Agar yo'q bo'lsa, oxiriga qo'shib qo'yamiz
        html_content += f'<div style="text-align: right; margin-top: 30px;">{qr_img_tag}</div>'

    # Boshqa barcha o'zgaruvchilarni almashtirish — qiymatlar ESCAPE qilinadi:
    # talaba kiritgan matn hujjatga HTML sifatida emas, matn sifatida kiradi
    for key, value in data.items():
        placeholder = f"{{{key}}}"
        if placeholder in html_content:
            html_content = html_content.replace(placeholder, html_mod.escape(str(value)))

    # Asosiy HTML tuzilishi
    full_html = (
        f"<!DOCTYPE html><html><head><meta charset='utf-8'>{style}</head>"
        f"<body>{html_content}</body></html>"
    )

    pdf_bytes: bytes | None = HTML(
        string=full_html, url_fetcher=_safe_url_fetcher
    ).write_pdf()
    if pdf_bytes is None:
        raise RuntimeError("WeasyPrint PDF generation returned None")

    logger.info(f"Dynamic Student Contract PDF generated ({len(pdf_bytes)} bytes)")
    return bytes(pdf_bytes)
