# Deploy — CHDPU Amaliyot Platformasi

Ubuntu 22.04+ VPS uchun bosqichma-bosqich qo'llanma.

## 0. Ushbu release o'zgarishlari (Phase 17 — 2026-06)

Rahbariyat feedback'iga javoban katta yangilash. **Yangi env talab qilinmaydi**;
yangi Python dependency (`docxtpl`) `uv.lock` da bor — image build avtomatik o'rnatadi
(qo'lda harakat shart emas).

**Yangi xususiyatlar:**
- **5-kurs** hamma joyda + guruh tanlash bug tuzatildi; "HEMIS id" → "Amaliyot id".
- **Import shablonlari** — talaba (13 ustun, id'siz) + o'qituvchi (yagona FISh)
  parserlari; namuna shablon yuklab olish; login/parol **Excel** eksporti.
- **Amaliyotlar Monitoringi** filtrlari (o'quv yili/mutaxassislik/kurs/guruh);
  **Shartnomalar** tab dizayni; yangi **Qaydnomalar** sahifa (Excel + Baholash PDF).
- **DOCX shartnoma shablonlari** (super admin yuklaydi, `{{ maydon }}` aniqlanadi).
- **Talaba amaliyot arizasi** → super admin QR tasdiq + hudud bo'yicha **ilova**.
- **Talaba ↔ admin murojaat** (chat).

**Yangi migrationlar** (API container start'da `alembic upgrade head` avto-bajaradi):
`e9a1c7b3f0d2` (practice_types.education_forms) → `f1b3d5a7c9e0` (contract_templates)
→ `a2c4e6b8d0f1` (practice_applications) → `b3d5f7a9c1e2` (inquiries). HEAD =
`b3d5f7a9c1e2`. `git pull` + `up -d --build` yetarli.

**Storage:** DOCX shablonlar `storage/contract_templates/` da saqlanadi (mavjud
`apistorage` volume ichida — qo'shimcha sozlash shart emas).

> ⚠️ **Lokal dev DB** migration zanjiridan orqada bo'lishi mumkin. Lokal sinovdan
> oldin: `cd apps/api && .venv/bin/alembic upgrade head`.

## 1. Pre-rekvizitlar

VPS'da quyidagilar bo'lishi kerak:

```bash
# Docker + compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# (relogin kerak)

# Nginx + certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx git
```

DNS:
- `chdpu.example.uz` → VPS IP (A record)
- `qr.chdpu.example.uz` → VPS IP (A record) — public QR verify uchun

## 2. Repo'ni klonlash

```bash
sudo mkdir -p /srv/chdpu && sudo chown $USER:$USER /srv/chdpu
cd /srv/chdpu
git clone https://github.com/<your-org>/InternshipCHDPU.git .
```

## 3. Production env

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Almashtirilishi shart:
- `APP_URL`, `WEB_URL` — sizning domeningiz
- `CORS_ORIGINS`
- `POSTGRES_PASSWORD` — `openssl rand -base64 24`
- `SECRET_KEY` — `openssl rand -hex 32`
- `SUPERADMIN_PASSWORD` — kuchli parol

**Muhim**: `.env.prod` ni hech qachon git'ga commit qilmang. `.gitignore` da bor.

> 💡 **Tavsiya**: `cp .env.prod .env` qiling. Compose `.env` ni avtomatik o'qiydi,
> shunda barcha `docker compose` buyruqlarini (`logs`, `exec`, `ps`, `up`)
> `--env-file .env.prod` siz ishlatasiz. Aks holda HAR BIR buyruqqa `--env-file`
> qo'shish shart (yo'qsa `POSTGRES_PASSWORD ... missing` xatosi chiqadi).

## 4. Stack'ni ishga tushirish

```bash
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod up -d --build
```

> Quyidagi barcha buyruqlarda `--env-file .env.prod` kerak (yoki 3-bo'limdagi
> `cp .env.prod .env` ni bajargan bo'lsangiz — kerak emas).

Birinchi marta:
1. Postgres + Redis volumelari yaratiladi
2. API container Alembic migration'ni avto-bajaradi
3. Super admin DB'ga seed qilinadi (`SUPERADMIN_*` env'lari bilan)
4. Web container Nginx orqali static fayllarni serve qiladi

Holati tekshirish:
```bash
docker compose -f infra/compose/docker-compose.prod.yml ps
docker compose -f infra/compose/docker-compose.prod.yml logs -f api
curl -fsS http://127.0.0.1:8000/api/v1/health
curl -fsS http://127.0.0.1:8080/healthz
```

## 5. Edge Nginx (TLS + domen)

> ⚠️ **DIQQAT — BIRINCHI MARTA sozlashda:** `edge.conf` PLACEHOLDER domenlar
> (`chdpu.example.uz`) bilan keladi. Uni ILK marta sozlaganda ko'chiring,
> domenlarni almashtiring va certbot ishlating.
>
> **KEYINGI yangilashlarda** `edge.conf` ni to'g'ridan-to'g'ri `cp` QILMANG —
> u sizning haqiqiy domen + sertifikat konfiguratsiyangizni ustidan yozadi
> (`cannot load certificate ... example.uz` xatosi). Faqat kerakli
> o'zgarishni (masalan import timeout blokini) qo'lda `chdpu.conf` ga qo'shing.
>
> Agar alohida `qr.` subdomeningiz bo'lmasa, edge.conf'dagi ikkinchi (QR)
> server blokini olib tashlang — QR verify asosiy domen ostida ishlaydi
> (`https://<domain>/verify/<token>`).

```bash
sudo cp infra/nginx/edge.conf /etc/nginx/sites-available/chdpu.conf
sudo nano /etc/nginx/sites-available/chdpu.conf
# `chdpu.example.uz` va `qr.chdpu.example.uz` ni o'z domenlaringizga almashtiring
sudo ln -s /etc/nginx/sites-available/chdpu.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

TLS sertifikat (Let's Encrypt):
```bash
sudo certbot --nginx \
  -d chdpu.example.uz \
  -d qr.chdpu.example.uz \
  --redirect --agree-tos -m admin@chdpu.uz
```

Sertifikat avto-yangilanadi (certbot.timer).

## 6. Tekshirish

- https://chdpu.example.uz → Login sahifasi ochilishi kerak
- Super admin sifatida login (env'da kiritgan login + parol)
- https://chdpu.example.uz/admin/system-settings → sayt nomini o'zgartirib ko'ring
- https://qr.chdpu.example.uz/verify/some-token → public QR verify (404 normal, hali shartnoma yo'q)
- **Rescue**: agar profilaktika rejimini yoqib qoldirsangiz va bloklangan bo'lsangiz — `https://chdpu.example.uz/rescue` orqali super admin login qiling

## 7. Backup

Postgres dump (cron uchun):
```bash
docker compose -f infra/compose/docker-compose.prod.yml exec postgres \
    pg_dump -U chdpu -d chdpu | gzip > /srv/chdpu/backups/db-$(date +%F).sql.gz
```

Storage volumi (uploads + contracts):
```bash
docker run --rm -v chdpu-prod_apistorage:/data -v $(pwd)/backups:/backup alpine \
    tar czf /backup/storage-$(date +%F).tar.gz -C /data .
```

## 8. Yangilash

```bash
cd /srv/chdpu
git pull
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod up -d --build
```

API yangilanganda Alembic migration avto-bajariladi (`api.Dockerfile` CMD'si).

## 9. Monitoring

Loglar:
```bash
docker compose -f infra/compose/docker-compose.prod.yml logs -f --tail=200 api
docker compose -f infra/compose/docker-compose.prod.yml logs -f --tail=200 web
sudo journalctl -u nginx -f
```

Disk:
```bash
docker system df
df -h /var/lib/docker
```

## 10. Tez-tez uchraydigan muammolar

**Migration xato beradi (api start bo'lmaydi):**
```bash
docker compose -f infra/compose/docker-compose.prod.yml logs api | grep -i alembic
# Kerak bo'lsa qo'lda:
docker compose -f infra/compose/docker-compose.prod.yml exec api alembic current
docker compose -f infra/compose/docker-compose.prod.yml exec api alembic upgrade head
```

**WeasyPrint PDF ishlamayapti:**
Container ichida cairo/pango bor — agar host Nginx'da xato bo'lsa, `client_max_body_size` ni tekshiring (25M qo'yilgan).

**Profilaktika qoldirib unutdingiz:**
`https://your-domain/rescue` → super admin login → Sozlamalar → profilaktikani o'chirish.

**CORS xatoliklar:**
`.env.prod` da `CORS_ORIGINS` aynan domenlaringizga to'g'ri ekanini tekshiring (https:// bilan, oxirida slashsiz).
