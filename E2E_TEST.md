# Qo'lda E2E test ssenariysi — CHDPU Amaliyot Platformasi

3 rol (Super Admin · Admin · Supervisor) + Talaba bo'yicha qadamma-qadam tekshiruv.
Har bir qadam yonida ☐ — bajarilgach ✅ qo'ying.

> Belgilar: 🆕 = ushbu release'da qo'shilgan yangi xususiyat.

---

## 0. Tayyorgarlik (bir marta)

☐ Backend migratsiya: `cd apps/api && .venv/bin/alembic upgrade head` (xato bo'lmasin)
☐ Backend ishga tushadi: `uvicorn app.main:app --reload` → `GET /api/v1/health` 200
☐ Frontend ishga tushadi: `pnpm --filter web dev` → login sahifa ochiladi
☐ Super admin login bo'ladi (`.env` dagi SUPERADMIN login/parol)

### Asosiy ma'lumotlarni yaratish (Super Admin)
☐ Akademik tuzilma → **Fakultet** qo'shildi
☐ 🆕 Akademik tuzilma → **Kafedralar** tabida kafedra qo'shildi (fakultet tanlab)
☐ Yo'nalish qo'shildi (8 raqamli kod, fakultetga)
☐ O'quv yili qo'shildi va **aktiv** qilindi
☐ Guruh qo'shildi (yo'nalish + o'quv yili + kurs)
☐ Obyektlar → tashkilot qo'shildi (kamida 2 ta)

---

## 1. Super Admin

### 1.1 Akademik filtrlar 🆕
☐ Yo'nalishlar: qidiruv + **fakultet filtri** ishlaydi
☐ Guruhlar: qidiruv + **yo'nalish/o'quv yili/kurs** filtrlari ishlaydi

### 1.2 Talabalar import + maxfiylik 🆕
☐ Talabalar → **Excel Import** → namuna fayl yuklandi, talabalar yaratildi
☐ Login/parol CSV yuklab olindi
☐ Talaba detalida **passport/JSHSHIR/tug'ilgan sana YO'Q** (faqat jins)
☐ 🆕 Talabalar → **O'quv yili filtri** ishlaydi; yangi (bo'sh) yil tanlanса ro'yxat bo'sh

### 1.3 Amaliyot turlari 🆕
☐ **Yangi amaliyot turi** tugmasi ko'rinadi (faqat super admin)
☐ Yangi tur yaratildi (kod, obyekt turi, hafta, kurslar) va ro'yxatda chiqdi
☐ Turni tahrirlash + o'chirish ishlaydi

### 1.4 Obyektlar — lokatsiya 🆕
☐ Tashkilot/hudud qo'shishda **Google Maps link yoki `41.31, 69.28`** kiritib "Qo'llash" → marker joylashadi
☐ Ro'yxatda **Viloyat (joylashuv) filtri** ishlaydi

### 1.5 Supervizorlar 🆕
☐ Yangi supervizor: **fakultet + kafedra** tanlanadi (kafedra fakultetga qarab)
☐ Yangi supervizor: **5 tagacha tashkilot** belgilanadi (6-chisi bloklanadi)
☐ 🆕 Supervizor **Excel import** → yaratildi, login/parol CSV chiqdi
☐ Ro'yxatda supervizorning tashkilot(lar)i + fakultet/kafedra ko'rinadi

### 1.6 Biriktirishlar 🆕
☐ **Status tablar** (Barchasi/Qoralama/Aktiv/Tugagan/Bekor) ishlaydi
☐ Talabani amaliyotga biriktirish (tur, obyekt, supervizor, sana)
☐ Supervizorga uning tashkilotidan tashqari obyekt berilsa — xato beradi

### 1.7 Davomat 🆕
☐ **Fakultet → yo'nalish → guruh** kaskad filtri ishlaydi
☐ **CSV eksport** filtrlarni hisobga oladi (fakultet/yo'nalish/guruh ustunlari bor)

### 1.8 Yakuniy hisobotlar 🆕
☐ Fakultet/yo'nalish/guruh/kurs/qidiruv filtri ishlaydi
☐ **CSV eksport** (yakuniy ball, kredit, sanalar bilan)
☐ Kartochkada guruh + ball ko'rinadi

### 1.9 Audit log (faqat super admin)
☐ Audit log sahifasi ochiladi va yozuvlar bor

---

## 2. Admin (fakultet mas'uli)

☐ Admin login bo'ladi
☐ Yuqoridagi funksiyalar (1.1–1.8) admin uchun ham ishlaydi
☐ 🆕 **Audit log / super-admin sozlamalari adminda KO'RINMAYDI** (eski holatdagidek)
☐ Yangi qurilmadan kirish urinishi bo'lsa — adminga **bildirishnoma** keladi (qo'ng'iroq belgisi)

---

## 3. Supervisor (amaliyot rahbari)

☐ Supervizor login bo'ladi (import qilingan login/parol bilan)
☐ Birinchi kirishda parol almashtirish so'raladi
☐ Dashboard: biriktirilgan talabalar ko'rinadi
☐ Davomatni tasdiqlash (yashil) / rad etish (qizil) ishlaydi
☐ 🆕 Talabaga topshiriq berishda **deadline majburiy** (bo'sh qoldirilsa xato)
☐ 🆕 Deadline o'tib ketsa — **"Muddati o'tgan topshiriqlar"** kartasi ko'rinadi
☐ 🆕 **"Hisobot (PDF)"** tugmasi → talabalar umumiy baho PDF yuklab olindi
☐ Topshiriq/kundalik/dars tahlilini ko'rib chiqish (tasdiq/rad) ishlaydi

---

## 4. Talaba

☐ Talaba login bo'ladi (import login/parol); majburiy parol almashtirish
☐ 🆕 **Bitta-qurilma**: shu brauzerda qayta login — muammosiz
☐ 🆕 **Boshqa qurilma/brauzer**dan login → **bloklanadi** ("boshqa qurilmaga bog'langan")
☐ 🆕 Admin talaba detalida **"Qurilmani o'chirish"** → talaba yangi qurilmadan kira oladi
☐ Check-in / check-out (geo) ishlaydi
☐ Topshiriq yuborish; deadline o'tgan topshiriq qizil/ogohlantirish bilan ko'rinadi
☐ Kundalik + dars tahlili yuborish
☐ Yakuniy hisobot yuklash

---

## 5. Regress (eski funksiyalar buzilmaganini tekshirish)

☐ Shartnoma generatsiya (QR bilan) ishlaydi
☐ Public QR verify (`/verify/{token}`) ishlaydi
☐ Yig'ma jild (arxiv) eksport ishlaydi
☐ Bildirishnomalar (qo'ng'iroq) ishlaydi
☐ Tizim sozlamalari (sayt nomi, profilaktika) ishlaydi

---

## Eslatma — bilib qo'yish kerak

- **Bitta-qurilma**: qurilma ID brauzer `localStorage`'da saqlanadi. Incognito yoki
  boshqa brauzer = "boshqa qurilma". `crypto.randomUUID` HTTPS yoki localhost'da ishlaydi.
- **Supervizor multi-org**: assignment tashkiloti supervizor tashkilotlaridan biri
  bo'lishi shart (supervizorga umuman tashkilot biriktirilmagan bo'lsa — tekshirilmaydi).
- **O'quv yili**: yangi yil yaratilganda bo'sh; import aktiv yilga tushadi.
