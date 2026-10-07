# Deploy — CHDPU Amaliyot Platformasi

Ubuntu 22.04+ VPS uchun bosqichma-bosqich qo'llanma.

## 0. Ushbu release (2026-10 — audit va tuzatishlar)

**Migratsiyalar:** `a1c3e5f7b9d1` (`users.device_info` JSONB) → `b2d4f6a8c0e3`
(`contracts.contract_template_id` + `variable_values`) → `c3e5a7b9d1f4` (2026-09-27 dan oldin
yaratilgan, ruxsatlari bo'sh adminlarga barcha modullar qaytariladi — ilgari ro'yxatda ular
"Standart (barcha)" deb ko'rinib, aslida hech qayerga kira olmasdi) → `d4f6b8c0e2a5`
(`access_restrictions` — foydalanuvchi/guruh uchun kirishni vaqtincha to'xtatish). API konteyner
ishga tushganda `alembic upgrade head` avtomatik bajaradi. HEAD = `d4f6b8c0e2a5`.

**Kirish cheklovlari (2026-10-07):** super admin bitta talaba/supervizor yoki butun guruh uchun
kirishni to'xtatadi (Tizim → Kirish cheklovlari yoki talaba kartasi). Cheklangan foydalanuvchi
login va har bir so'rovda `423` oladi, ekranida "Texnik ishlar" yoki "Kirish cheklangan" ko'rinadi;
chiqish mumkin, muddati o'tgach ekran o'zi ochiladi. Super adminga cheklov qo'yilmaydi.

**Skan yuklash (2026-10-07):** chegara 20 MB (avval 10). Fayl turi mazmuni bo'yicha aniqlanadi
(PDF/JPEG/PNG), kengaytmasiz yoki noto'g'ri nomlangan fayl ham qabul qilinadi; HEIC, hajm va
tur xatolari aniq matn bilan qaytadi. aaPanel proksisida `client_max_body_size 25M;` (§11.5)
BO'LISHI SHART — aks holda nginx 1 MB dan katta faylni o'zi rad etadi.

**Xabarlar sahifasi (2026-10-07):** har rol uchun `/…/notifications` — qidiruv, tur va sana
filtrlari, to'liq tafsilot. Talabalar sarlavhada qo'ng'iroq olishdi.

**Diqqat — portlar:** `docker-compose.prod.yml` yana faqat **127.0.0.1** ga bog'lanadi
(API `127.0.0.1:8000`, web `127.0.0.1:8080`). aaPanel / host Nginx shu serverning o'zida bo'lsa
hech narsa qilish shart emas. Agar proksi BOSHQA mashinada bo'lsa yoki lokal tarmoqdan
to'g'ridan-to'g'ri kirish kerak bo'lsa, `.env.prod` ga qo'shing:
```
WEB_BIND=0.0.0.0
API_BIND=0.0.0.0
```
**Majburiy env:** `POSTGRES_PASSWORD`, `SECRET_KEY`, `SUPERADMIN_PASSWORD`, `APP_URL`, `WEB_URL`
bo'sh bo'lsa compose endi aniq xato bilan to'xtaydi (avval jimgina bo'sh qiymat bilan ishga
tushib ketardi; bo'sh `WEB_URL` QR kodlarni ishlamaydigan qilardi).

**SECRET_KEY:** production'da namuna qiymat (`CHANGE_ME...`, `dev-only-change-me`) yoki 16 belgidan
qisqa kalit bo'lsa API **ishga tushmaydi** — bunday kalit bilan istalgan kishi admin tokenini
soxtalashtira olardi. Yangilash: `openssl rand -hex 32` (barcha foydalanuvchilar qayta kiradi).

**Proksi va IP:** API mijoz IP manzilini faqat ishonchli proksilar (aaPanel/host nginx, docker
tarmog'i) yozgan `X-Forwarded-For` dan oladi — mijozning o'zi yuborgan qiymat endi ishlatilmaydi
(login cheklovi va audit jurnali uchun). Standart: `FORWARDED_ALLOW_IPS=127.0.0.1,10.0.0.0/8,
172.16.0.0/12,192.168.0.0/16`. Universitet Wi-Fi'da yuzlab talaba bitta tashqi IP ortida
bo'lgani uchun bitta IP'dan 15 daqiqadagi xato loginlar chegarasi 300 (`LOGIN_MAX_FAILS_PER_IP`);
har bir login uchun alohida 10 ta.

**Yuklangan fayllar** endi `storage/uploads/u/<user_id>/...` ga saqlanadi (fayl egasi yo'lda).
Eski fayllar joyida qoladi, ko'chirish shart emas.

**Bazani tozalash** HTTP orqali endi YO'Q (`POST /system-settings/reset-database` olib tashlandi).
Kerak bo'lsa faqat terminaldan, tasdiqlash so'zi bilan:
```bash
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod \
  exec -e ALLOW_DATABASE_RESET=1 api python scripts/clean_and_reset_data.py
```
(super admin, shartnoma shablonlari va audit jurnali saqlanadi).

**Asosiy o'zgarishlar:**
- Davomat: super admin har qanday kunni tahrirlaydi (status, kelish/ketish vaqti, izoh),
  kun/oraliq/oyni oldindan yashil yoki qizil qiladi (bitta yoki ko'p talaba), "Talabalar"
  bo'yicha jamlanma sahifa; kech kelgan talaba yarim tundan keyin ham ketishni qayd eta oladi.
- Login: aniq xato xabarlari, bitta qurilma qoidasi qayta qat'iy ishlaydi, qurilma ma'lumoti
  o'qiladigan ko'rinishda, Telegram ichidagi brauzer ogohlantirishi, urinishlar cheklovi.
- GPS: har bosishda ruxsat qayta so'raladi, aniqlik ko'rsatiladi, ruxsat yo'q bo'lsa yo'riqnoma.
- Xavfsizlik: shartnoma yaratish faqat ruxsatli adminlar uchun, ommaviy QR tekshiruv faqat token
  bo'yicha, fayllarga kirish cheklandi, fakultet adminlari faqat o'z fakultetini ko'radi/eksport
  qiladi, tarixi bor talaba/supervizor/qaydnomani o'chirib bo'lmaydi.
- Ishlash: parol hash va PDF generatsiya event-loop'ni bloklamaydi (ko'p talaba bir vaqtda
  kirganda timeout bo'lmaydi).

## 0.1. Oldingi release (Phase 17 — 2026-06)

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

API yangilanganda Alembic migration avto-bajariladi (`infra/docker/entrypoint.sh`).

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

---

## 11. aaPanel serverga deploy (amaliyot.cspu.uz — 2026-08)

Universitet bergan server: aaPanel + Ubuntu 22. **MUHIM: aaPanel nginx'ni O'ZI
boshqaradi — /etc/nginx ga qo'lda tegmang, faqat panel UI ("Conf" tugmasi)
orqali tahrirlang.** Bizning compose 80/443 ni band qilmaydi (API 127.0.0.1:8000,
web 127.0.0.1:8080) — aaPanel bilan port to'qnashuvi yo'q.

### 11.1 DNS
`amaliyot.cspu.uz` A-yozuvi server IP'siga ko'rsatsin. Tekshirish:
```bash
dig +short amaliyot.cspu.uz
```

### 11.2 Docker o'rnatish (aaPanel Terminal yoki SSH)
```bash
curl -fsSL https://get.docker.com | sh
docker compose version   # v2 chiqishi kerak
```

### 11.3 Repo + env
```bash
mkdir -p /opt/chdpu && cd /opt/chdpu
# Private repo uchun deploy key: ssh-keygen -t ed25519; ochiq kalitni
# GitHub → repo → Settings → Deploy keys ga qo'shing
git clone git@github.com:Rasmiyatchi/amaliyot-cspu.git .

# Env'ni ESKI serverdan ko'chirish eng oson:
scp root@ESKI_SERVER_IP:/opt/chdpu/.env.prod /opt/chdpu/.env.prod
# Keyin domenni yangilang:
#   APP_URL=https://amaliyot.cspu.uz
#   WEB_URL=https://amaliyot.cspu.uz
#   CORS_ORIGINS=https://amaliyot.cspu.uz
```

### 11.4 Ma'lumotlarni eski serverdan ko'chirish (birinchi ishga tushirishdan OLDIN)
Eski serverda:
```bash
cd /opt/chdpu
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod \
  exec postgres pg_dump -U chdpu -d chdpu --no-owner -Fc > /tmp/chdpu.dump
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod \
  cp api:/app/storage /tmp/chdpu_storage
scp /tmp/chdpu.dump root@YANGI_SERVER_IP:/tmp/
scp -r /tmp/chdpu_storage root@YANGI_SERVER_IP:/tmp/
```
Yangi serverda (faqat postgres'ni ko'tarib, dump qaytariladi, KEYIN to'liq stack):
```bash
cd /opt/chdpu
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod up -d postgres
sleep 10
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod \
  exec -T postgres pg_restore -U chdpu -d chdpu --no-owner --clean --if-exists < /tmp/chdpu.dump
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod up -d --build
# API boot'da yangi migratsiyalarni o'zi bajaradi (alembic upgrade head)
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod \
  cp /tmp/chdpu_storage/. api:/app/storage/
```

### 11.5 aaPanel'da sayt
1. Avval yaratilgan **PHP-проект** `amaliyot.cspu.uz` ni O'CHIRING (u bo'sh, PHP bizga kerak emas).
2. **Веб-сайты → Proxy-проект → Добавить**: domen `amaliyot.cspu.uz`,
   maqsad (target) `http://127.0.0.1:8080`.
3. Sayt qatorida **Conf** ni oching va `location /` blokidan OLDIN quyidagini qo'shing:
```nginx
    client_max_body_size 25M;

    # Og'ir importlar — uzoq timeout
    location ~ ^/api/v1/(hemis|supervisors)/import$ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }
```
4. Saqlang — aaPanel nginx'ni o'zi reload qiladi.

### 11.6 SSL
Sayt → **Настройки → SSL → Let's Encrypt** → sertifikat oling →
**Force HTTPS** yoqing. (DNS 11.1 ishlagan bo'lishi shart.)

### 11.7 Tekshirish
```bash
curl -s https://amaliyot.cspu.uz/api/v1/health
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod ps
docker compose -f infra/compose/docker-compose.prod.yml --env-file .env.prod logs api | tail -20
```
Brauzerda: login, talabalar ro'yxati, shartnoma shablonlari (5 ta rasmiy),
til almashtirgich (uz/ru), talaba profili — ariza berish.

> Eslatma: eski serverda generatsiya qilingan shartnoma PDF'laridagi QR havolalar
> eski domenga (`chdpu.porfolio.uz/verify/...`) ishora qiladi. Eski domen
> o'chirilsa, kerakli shartnomalarni yangi domen bilan qayta generatsiya qiling.
