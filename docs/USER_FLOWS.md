# Foydalanuvchi flow'lari — har rol uchun

> Har rol uchun: tizimga kirish dan tortib kundalik ishni bajarishgacha.
> Holat: 2026-05-02. Demo uchun.

---

## 🛡️ SUPER ADMIN flow

### Birinchi marta tizimga kirish
1. `/login` ochadi → username `superadmin`, parol `.env`dagi `SUPERADMIN_PASSWORD`
2. Avtomatik `/admin` ga yo'naltirilad → **purple-indigo gradient hero banner**
3. Sidebar'da o'ziga xos itemlar: **"Adminlar"** + **"Sozlamalar"**

### Kunlik vazifalar
**A. Boshqa adminlar yaratish**
1. Sidebar → "Adminlar" (`/admin/admins`)
2. "Yangi admin" tugmasi → forma: username, parol, F.I.SH., rol (admin yoki super_admin)
3. Saqlash → ro'yxatga qo'shiladi
4. Adminni tahrirlash uchun qatordan bosing → forma + credentials section
5. O'chirish: trash icon → ConfirmDialog. **Cheklov**: o'zini va oxirgi super_admin'ni o'chirib bo'lmaydi.

**B. Tizim sozlamalari**
1. Sidebar → "Sozlamalar" (`/admin/system-settings`)
2. Sayt nomi/tavsif, fayl yuklash limitlari, email toggle
3. **Profilaktika rejimi**:
   - "Profilaktikani yoqish" → ConfirmDialog → maintenance_mode=true
   - Talaba/supervizor/oddiy admin'larga 503 + animatsiyali splash
   - Super admin tizimni boshqarishda davom etadi
   - "Profilaktikani o'chirish" → hammasi tiklanadi

**C. Davomat override**
1. Sidebar → "Davomat" → biror talaba qatori
2. Detail dialog → "Override" tugmasi (faqat super_admin'ga ko'rinadi)
3. Yangi status (yashil/qizil/kutilmoqda) + sabab → audit log
4. AttendanceOverride yozuvi qoladi (ko'rinadigan)

### Boshqalardan farqi
- Profilaktika paytida ham ishlay oladi
- Admin foydalanuvchilarni boshqaradi
- System Settings → tahrirlay oladi (admin faqat ko'radi)
- Override uchun yagona ruxsat

---

## 👤 ADMIN flow

### Birinchi sessiya
1. Login (super admin yaratgan creds)
2. `/admin` → indigo-blue gradient hero
3. **KPI dashboard**: 8 ta StatCard, capacity alerts, recent overrides

### To'liq oqim — semestr boshidan oxirigacha

#### Bosqich 1: Akademik tuzilish
1. Sidebar → "Akademik" (`/admin/academic`)
2. Tab'lar: Fakultet, Yo'nalish, O'quv yili, Guruh
3. Har biri uchun forma: nomi, kodi, va h.k.
4. Eng kerakli: 1+ fakultet, 1+ yo'nalish, 1+ guruh, aktiv o'quv yili (2025-2026 default seed)

#### Bosqich 2: Talabalar import
1. Sidebar → "Talabalar" → "HEMIS Import" tugmasi
2. Excel fayl yuklash (18 ustunli, `resourses/data...xlsx`)
3. Backend parse: 123 talaba yaratiladi
4. Login: `hemis_id` / `passport_number`
5. CSV eksport — filtrlangan talabalarni jadvalda ko'rib, "CSV eksport" tugmasi

#### Bosqich 3: Tashkilot va supervizor
1. Sidebar → "Obyektlar" — tab: Tashkilotlar / Hududlar
2. Tashkilot yaratish: nomi, INN, bank, manzil, telefon, geo-fence (xarita orqali)
3. Sidebar → "Rahbarlar" → "Yangi rahbar"
4. Forma: F.I.SH., username, parol, lavozim, sig'im, tashkilotga biriktirish

#### Bosqich 4: Amaliyot biriktirish
1. Sidebar → "Biriktirish" → "Yangi biriktirish" wizard
2. 4 qadam: amaliyot turi → o'quv yili → guruh + talabalar (bulk) → tashkilot/hudud + supervizor → sana
3. Yaratish → status DRAFT
4. Detail dialog'da "**Amaliyotni boshlash**" tugmasi → status ACTIVE → talaba check-in qila oladi

#### Bosqich 5: Shartnoma
1. Sidebar → "Shartnomalar" → "Yangi shartnoma"
2. Tanlash: shablon (4+2/pedagogik/qualifying) + tashkilot + amaliyot turi + biriktirishlar
3. Yaratish (status DRAFT)
4. Detail dialog'da "**PDF generatsiya**" → QR + WeasyPrint → status GENERATED
5. "PDF yuklab olish" → fayl tushadi
6. Skan yuklash (imzolangan versiya) → status ACTIVE
7. QR'da `verify_url` → public sahifa (auth siz)

#### Bosqich 6: Topshiriqlar
1. Assignments → biror qator → detail dialog → "Topshiriqlar" tab
2. "Tanlab qo'shish" yoki "Barchasini qo'shish" — sillabusdan 22-43 ta task
3. Ortiqchasini trash icon bilan o'chirish
4. Talaba submit qiladi → tasdiqlash uchun supervizor bilan parallel admin ham ko'ra oladi

#### Bosqich 7: Davomat
1. Sidebar → "Davomat"
2. Filtr: biriktirish/status/sana
3. Qatorga bosish → detail (events, override history)
4. "Qizilga belgilash" — kun o'tgan, talaba kelmagan bo'lsa
5. CSV eksport — oylik hisobot uchun

#### Bosqich 8: Hisobot va arxiv
1. Assignment detail → "Yig'ma jild" bo'limi
2. ZIP yoki alohida PDF (cover/journal/analyses/tasks)
3. Kafedra mudiri uchun himoyaga olib boriladi

### Notifications
- Bell icon (sidebar pastida) → har 30s yangilanadi
- Talaba submit qilsa, supervizor approve qilsa — admin'ga doim borishmaydi (faqat student'ga)
- Admin "kutilayotgan tasdiqlar" home page'da statistic'da ko'radi

### Profilim
- Sidebar pastida user nomi → profile dialog
- F.I.SH., email, telefon o'zgartirish
- Avatar yuklash
- Parol o'zgartirish (joriy parol kerak)

---

## 🎓 SUPERVISOR flow

### Birinchi sessiya
1. Login (admin yaratgan creds)
2. `/supervisor` → blue-indigo gradient hero
3. **KPI**: assignment soni, bugungi davomat, kutilayotgan ko'rib chiqish, ball

### Kunlik vazifalar

**A. Davomat tasdiqlash**
1. Hero ostida "Bugun" + "Boshqa kunlar" cardlar
2. Talaba check-in qilgan → status PENDING
3. Supervisor "✓" — status GREEN, "✗" — status RED + sabab
4. Reject sababi PromptDialog'da

**B. Topshiriqlar/kundalik/dars tahlili tasdiqlash**
1. Sahifaning pastida "Ko'rib chiqish" card → 3 ta tab
2. **Topshiriqlar** tab: status pending → grade dialog (ball + tasdiq yoki rad sababi)
3. **Kundalik** tab: o'qib bosing → kontent + approve/reject
4. **Dars tahlillari** tab: subject + teacher + analysis_md + approve/reject

**C. Bir nechta talaba bilan ishlash**
- Hero ostida assignment filter tugmalari ("Barchasi", har talaba alohida)
- Tanlash → faqat shu talaba ma'lumotlari ko'rinadi

### Notifications
- Bell icon header'da
- Talaba check-in qilsa darhol notification (hozirda yo'q — Phase 12 da student'ga only triggerlar; supervisor uchun keyin qo'shiladi)
- Pending'lar — dashboard KPI da ko'rinadi

### Profilim
- Header o'ng tomonda user → Profile dialog
- Email, telefon, avatar o'zgartirish
- Parol o'zgartirish

---

## 🎒 STUDENT flow

### Birinchi sessiya
1. Login: HEMIS ID + passport seriyasi (masalan `354231100489` / `AD0193680`)
2. `/student` → emerald-teal gradient hero
3. Hero pastida: bugungi davomat, oxirgi 7 kun, amaliyot muddati

### Kunlik amaliyot kuni

**A. Maktabga kelish** (geo-fence ishlaydi)
1. Telefon/kompyuterda /student ochish
2. **"Kelish"** katta tugmasi → browser GPS so'raydi → geo-fence tekshiriladi
3. Tashkilot radius'ida (default 100m) → check-in qabul → status PENDING
4. Tashqarida → 400 xato "Geo-fence tashqarisida" + masofa ko'rsatadi
5. WiFi SSID whitelist'da bo'lsa — masofadan qat'iy nazar qabul

**B. Ketish**
1. Xuddi shu tugma "Ketish"ga aylanadi
2. Bosish → check-out yozuv qo'shiladi → kun yakunlanadi UI'da
3. Status hali PENDING — supervizor tasdiqi kutiladi

**C. Topshiriqlar yuborish**
1. Hero pastida "Akademik" panel → 3 tab: Topshiriqlar / Kundalik / Dars tahlillari
2. **Topshiriqlar tab**: 22 ta task (3-kurs uchun 11+11 yoki 4-kurs uchun 12+12)
3. Qatorga bosish → submit dialog
   - Sillabus matnini ko'radi
   - Markdown javob yozadi (50K belgigacha)
   - **Fayl biriktirish** (drag+drop yoki bosish — PDF/JPG/PNG/DOC/DOCX, 10MB)
   - "Yuborish" → status SUBMITTED
4. Reject bo'lsa → sabab ko'rinadi → qayta yozib yuborish (revision loop)
5. Approved bo'lsa → ball ko'rinadi (`points_earned/template_points`)

**D. Kundalik yozuvi**
1. "Kundalik" tab → "Yangi kundalik"
2. Sana (default bugungi) + matn
3. Yuborish → SUBMITTED
4. Tahrir (agar approved bo'lmasa) — sabab tozalanadi, qaytadan yuboriladi
5. Fayl biriktirish (yangi yaratilgan kundalikda)

**E. Dars tahlili**
1. "Dars tahlillari" tab → "Yangi dars tahlili"
2. Sana + chorak + fan + o'qituvchi + sinf + analysis matn
3. Fayl biriktirish (kuzatuv qaydlar)

### Yig'ma jild
1. Sahifaning pastida **"Yig'ma jild"** card
2. **"Yig'ma jildni yuklab olish"** → ZIP tushadi (cover + journal + analyses + tasks + shartnoma)
3. Alohida PDF'lar: cover/journal/analyses/tasks alohida button'lar

### Mening hujjatlarim
- "Mening hujjatlarim" card — barcha biriktirilgan fayllar (task/journal/analysis sources bilan)
- Har biriga "Yuklab olish" tugmasi

### Notifications
- Header o'ng tomonda bell icon
- Notifications:
  - "Topshiriq tasdiqlandi: ... (3 ball)" — supervizor approve qildi
  - "Topshiriq rad etildi: ... [sabab]" — qayta yozish kerak
  - "Davomat rad etildi: 2026-04-21" — supervizor RED qildi
  - "Override: red→green tibbiy sabab bilan" — super admin override qildi
- Click → o'qildi belgilanadi

### Profilim
- Header o'ng tomonda user → profile dialog
- Email, telefon, avatar o'zgartirish
- Parol o'zgartirish (joriy parol kerak — passport yoki o'zgartirgan parol)

### Profilaktika rejimi
- Tizim profilaktikada bo'lsa → animatsiyali splash ko'rinadi
- Faqat super admin foydalana oladi
- 60 sekundda avto check, profilaktika tugashi bilan tizim qaytadi

---

## Roli o'zgarishlari (matrix)

| Amal | Talaba | Supervizor | Admin | Super admin |
|---|:--:|:--:|:--:|:--:|
| Login | ✅ | ✅ | ✅ | ✅ |
| Profil tahrirlash + parol | ✅ | ✅ | ✅ | ✅ |
| Avatar yuklash | ✅ | ✅ | ✅ | ✅ |
| Check-in/out | ✅ | – | – | – |
| Task submit | ✅ | – | – | – |
| Journal/Analysis CRUD | ✅ | – | – | – |
| Davomat approve/reject | – | ✅* | – | ✅ |
| Task approve/reject + ball | – | ✅* | ✅ | ✅ |
| Journal/Analysis approve/reject | – | ✅* | ✅ | ✅ |
| Davomat override (red↔green) | – | – | – | **✅ faqat** |
| Mark red (kun o'tgan) | – | – | ✅ | ✅ |
| Assignment lifecycle | – | – | ✅ | ✅ |
| Talaba/supervizor/tashkilot CRUD | – | – | ✅ | ✅ |
| Shartnoma CRUD + PDF | – | – | ✅ | ✅ |
| HEMIS Excel import | – | – | ✅ | ✅ |
| CSV eksport | – | – | ✅ | ✅ |
| Yig'ma jild ZIP | ✅ (o'ziniki) | ✅ (talabalari) | ✅ | ✅ |
| Stats dashboard | ✅ (sodda) | ✅ | ✅ | ✅ kengaytirilgan |
| **Admin foydalanuvchilar CRUD** | – | – | – | **✅ faqat** |
| **System Settings** | ko'rmaydi | ko'rmaydi | ko'radi (read-only) | **✅ tahrirlay oladi** |
| **Maintenance bypass** | ❌ | ❌ | ❌ | **✅** |

`*` Supervizor faqat o'ziga biriktirilgan talabalar uchun

---

## Notification triggerlari (kim kimdan oladi)

| Trigger | Kim oladi |
|---|---|
| Task tasdiqlandi/rad etildi | Talaba |
| Journal tasdiqlandi/rad etildi | Talaba |
| Lesson Analysis tasdiqlandi/rad etildi | Talaba |
| Davomat rad etildi (supervisor) | Talaba |
| Davomat override (super admin) | Talaba |
| Shartnoma generated/active | (hozir hech kim — keyin admin) |
| Yangi assignment yaratildi | (kelajak — talaba) |

Hozircha **faqat talaba notification oladi**. Supervizor uchun "talaba submit qildi" notification kelajakda qo'shiladi.
