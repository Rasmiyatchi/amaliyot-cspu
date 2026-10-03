"""So'rov meta-ma'lumotlari (mijoz IP manzili).

IP manzil uvicorn'ning `--proxy-headers --forwarded-allow-ips=<ishonchli proksilar>` sozlamasi
orqali olinadi: X-Forwarded-For o'ngdan chapga o'qilib, birinchi ishonchsiz manzil mijoz
deb olinadi. Mijozning o'zi yuborgan (chapdagi) XFF qiymatiga ishonilmaydi — ilgari login
cheklovi va audit jurnali aynan shu soxtalashtiriladigan qiymatni ishlatardi.
"""

from fastapi import Request


def client_ip(request: Request | None) -> str | None:
    if request is None or request.client is None:
        return None
    return request.client.host or None
