"""Rasmiy shartnoma shablonlari (HTML) — data-migratsiya

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-08-13

5 ta rasmiy shartnoma matni (4+2, pedagogik, ishlab chiqarish, sirtqi
tanishtiruv, turizm) — universitet hujjatlaridan HTML'ga o'girilgan.
Idempotent: nom bo'yicha mavjud bo'lsa yangilamaydi (admin tahrirlagan
bo'lishi mumkin — uning o'zgarishlarini bosib yubormaymiz).
Status 'active' — talabalar darhol tanlay oladi.
"""

import json
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e0f1a2b3c4d5"
down_revision: str | Sequence[str] | None = "d9e0f1a2b3c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

HTML_4_PLUS_2 = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: "Times New Roman", Times, serif; font-size: 14px; line-height: 1.15; color: #000; }
  p { margin: 0 0 10px 0; text-align: justify; text-indent: 1.25cm; }
  .text-center { text-align: center; text-indent: 0; }
  .text-right { text-align: right; text-indent: 0; }
  .bold { font-weight: bold; }
  .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 15px; }
  .subtitle { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 15px; }
  ul { margin: 0 0 10px 0; padding-left: 1.25cm; }
  li { text-align: justify; margin-bottom: 5px; }
  .signatures { width: 100%; border: none; margin-top: 30px; }
  .signatures td { width: 50%; vertical-align: top; text-align: left; padding: 0 10px; }
  .signatures td p { text-indent: 0; }
</style>
</head>
<body>
<div class="title">СHIRCHIQ DAVLAT PEDAGOGIKA UNIVERSITETI TALABALARINING "4+2" TARTIBI BOʻYICHA MALAKAVIY AMALIYOT O‘TASH TOʻG‘RISIDA</div>
<div class="subtitle">{contract_no}-sonli SHARTNOMA</div>
<p class="text-right">202{year} y. "{day}" {month} <span style="display:inline-block; width:2cm;"></span> Chirchiq shahri</p>

<p>O‘zbekiston Respublikasi Prezidentining 2022-yil 11-maydagi "2022-2026 yillarda xalq ta’limini rivojlantirish bo‘yicha milliy dasturni tasdiqlash to‘g‘risida"gi PF-134-son Farmoni hamda 2022 yil 21 iyundagi "Pedagogik ta’lim sifatini oshirish va pedagog kadrlar tayyorlovchi oliy ta’lim muassasalari faoliyatini yanada rivojlantirish chora-tadbirlari to‘g‘risida"gi PQ-289-son qaroriga muvofiq pedagog kadrlar tayyorlovchi oliy ta’lim muassasalari kunduzgi ta’lim shaklida tahsil olayotgan 2-4 bosqich talabalari uchun haftelik o‘quv mashg‘ulotlari "4+2" tartibida maktabgacha va umumiy o‘rta ta’lim muassasalarida amaliyot o‘tishini ta’minlash maqsadida Chirchiq davlat pedagogika universiteti (keyingi oʻrinlarda Universitet, deb yuritiladi) nomidan taʼlim muassasasi Ustavi hamda malakaviy pedagogik amaliyot Nizomiga asoslanib, ish yurituvchi rektor {university_rector_full_name}, bir tomondan, nomidan tashkilot Ustaviga asoslanib ish koʻruvchi {company_name} (keyingi oʻrinlarda Qabul qiluvchi muassasa, deb yuritiladi) {company_director_full_name} ikkinchi tomondan ushbu shartnomani quyidagilar haqida tuzdilar.</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">I. SHARTNOMANING PRЕDMЕTI</div>
<p>1.1. O‘zbekiston Respublikasi Prezidentining 2022-yil 11-maydagi "2022-2026 yillarda xalq ta’limini rivojlantirish bo‘yicha milliy dasturni tasdiqlash to‘g‘risida"gi PF-134-son Farmoni hamda 2022 yil 21 iyundagi "Pedagogik ta’lim sifatini oshirish va pedagog kadrlar tayyorlovchi oliy ta’lim muassasalari faoliyatini yanada rivojlantirish chora-tadbirlari to‘g‘risida"gi PQ-289-son qaroriga muvofiq pedagog kadrlar tayyorlovchi oliy ta’lim muassasalari kunduzgi ta’lim shaklida tahsil olayotgan 2-4 bosqich talabalari uchun haftelik o‘quv mashg‘ulotlari "4+2" tartibida maktabgacha va umumiy o‘rta ta’lim muassasalarida amaliyot o‘tishini tashkil etish hamda Oʻzbekiston Respublikasi Prezidentining 2017-yil 27-iyuldagi PQ-3151-son va 2018-yil 5-iyundagi PQ-3775 qarorlari ijrosini ta’minlash maqsadida amaliyotchi-talabaning malakaviy amaliyot oʻtashi, oliy maʼlumotga ega boʻlgan yosh mutaxassis (bakalavr)larning intellektual salohiyatidan unumli foydalanish va ularni mavjud ish oʻrinlari bilan ta’minlashga koʻmaklashiladi.</p>
<p>1.2. "4+2" tartibdagi amaliyot pedagogika oliy ta’lim muassasalarida uzluksiz ta’limga hozirgi kunning zamonaviy talablariga javob beradigan yetuk mutaxassislarni tayyorlash tizimining samaradorligi va sifatini oshirish uchun ikkinchi kursdan boshlab ta’lim yo‘nalishlari mutaxassislik fanlaridan amaliy mashg‘ulotlarni o‘quv darslariga muvofiq tashkil etishni belgilaydi.</p>
<p>1.3. "4+2" tartibidagi malakaviy amaliyot 2-kurslarda ─ "Oʻquv tanishuv" amaliyoti, 3-kurslarda ─ "malakaviy oʻquv" amaliyoti va 4-kurslarda ─ "Malakaviy pedagogik" amaliyot tarzida tashkil etiladi.</p>
<p>1.4. "4+2" tartibidagi amaliyot bakalavriat ta’lim yo‘nalishlari o‘quv rejalariga muvofiq ikkinchi kursdan boshlab tizimli ravishda oliy ta’lim muassasasi tomonidan ishlab chiqiladigan hamda qabul qiluvchi tashkilot bilan kelishib tasdiqlanadigan amaliyot dasturi asosida amalga oshiriladi.</p>
<p>1.5. Bakalavriat ta’lim yo‘nalishlari bo‘yicha pedagogik mutaxassislar tayyorlashning muhim qismi bo‘lgan amaliyot ta’lim-tarbiya jarayoniga zamonaviy pedagogik va axborot texnologiyalarini muvaffaqiyatli qo‘llayotgan, bu borada yetarli darajada ish tajribalariga ega bo‘lgan, o‘quv-moddiy ta’minoti bugungi kun talabalariga javob beradigan uzluksiz ta’lim tizimining maktabgacha, umumiy o‘rta, o‘rta-maxsus, maxsus maktab internatlar, akademik litsey va kasb-xunar ta’limi muassasalarida o‘tkaziladi.</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">II. Tomonlarning huquq va majburiyatlari</div>
<div class="bold" style="margin-bottom: 5px; text-indent: 1.25cm;">Universitet</div>
<p>2.1. amaliyotga ketayotgan talabalarga oldindan amaliyot o‘tkazish tartiblari, xavfsizlik texnikasi haqida zarur ko‘rsatmalar va yo‘l-yo‘riqlar ko‘rsatish;</p>
<p>2.2. zaruriyatga muvofiq qabul qiluvchi tashkilotga amaliyot boshlanishidan oldin borib, talabalar kelishiga zaruriy tayyorgarlik ishlarini tashkil etish;</p>
<p>2.3. amaliyotning butun davri uchun talabalarga amaliyot dasturi asosida reja-jadvalini tuzish, qabul qiluvchi tashkilotdan amaliyot rahbari bilan birgalikda ishning hajmi va tarkibini belgilash;</p>
<p>2.4. talabalarni amaliyot reja-jadvali va dasturi hamda kundalik bilan ta’minlash;</p>
<p>2.5. talabalarning amaliyot o‘tash joyiga yetib borishi va qaytishini nazorat qilish;</p>
<p>2.6. qabul qiluvchi tashkilotdan amaliyot rahbari bilan talabaning amaliyotni o‘tashi holati bo‘yicha muntazam ravishda aloqada bo‘lish;</p>
<p>2.7. amaliyot muddatlariga rioya qilinishini, shuningdek, amaliyot reja-jadvali va dasturi bajarilishini hamda kundalikni har kunlik to‘ldirishini nazoratini olib borish, uslubiy yordam ko‘rsatish ishlarini, zarur hollarda, talabalarning amaliyot o‘tash joylariga borib ko‘rish yo‘li bilan amalga oshirish;</p>
<p>2.8. talabalarning amaliyot hisobotini yozishga ko‘rsatma va tavsiyalar berish;</p>
<p>2.9. talabalarning amaliyot bo‘yicha hisobot himoyasida ishtirok etish va baholash;</p>
<p>2.10. amaliyotni o‘tashni takomillashtirish yuzasidan zarur hollarda o‘z taklif va mulohazalarini kafedra mudiriga (fakultet va Universitet Kengashida ko‘rib chiqish uchun) taqdim etish;</p>
<p>2.11. Amaliyot o‘taydigan talabalarning ro‘yxatini shartnomaga ilova qilish.</p>

<div class="bold" style="margin-bottom: 5px; text-indent: 1.25cm;">Qabul qilivchi muassasa</div>
<p>2.12. universitet bilan talabalar amaliyotni o‘tashi to‘g‘risida shartnomalar tuzadi;</p>
<p>2.13. amaliyotni o‘tash davrida talabalarga amaliyotchi maqomini beradi;</p>
<p>2.14. amaliyotni tashkil etishga ko‘maklashadi, malakali va tajribali mutaxassislar orasidan amaliyotchi bilan ishlash ko‘nikmasiga ega bo‘lgan amaliyot rahbarini tayinlaydi;</p>
<p>2.15. qabul qiluvchi tashkilot ma’muriyati yoki biriktirilgan rahbar tomonidan amaliyotchi talabalarning amaliyotga kelishi va topshiriqlarni bajarishi yuzasidan nazorat qilish mexanizmi joriy qilinadi;</p>
<p>2.16. amaliyotchiler uchun ish joyi va amaliyot davrida foydalanish uchun zaruriy materiallar ajratilishini tashkil etadi, faoliyati doirasida amaliyotchi talabalarga oylik maoshlar belgilashi mumkin;</p>
<p>2.17. hayot faoliyati va texnika xavfsizligi bo‘yicha zaruriy ko‘rsatmalar beradi, zarur bo‘lgan hollarda talabalarga mehnatning xavfsiz usullarini o‘rgatadi va bu haqda tegishli hujjatlarni rasmiylashtiradi;</p>
<p>2.18. amaliyot dasturiga muvofiq talabalarga joriy qilinadigan shart-sharoitlarni yaratadi;</p>
<p>2.19. talabalarga mavjud adabiyotlar, texnik va boshqa hujjatlardan foydalanish imkoniyatlarini beradi;</p>
<p>2.20. amaliyot samaradorligini oshirish maqsadida dasturda maktab rahbariyati uchun ajratilgan ballarni talabalarning amaliyot davrdagi faolliklari va oʻzlashtirish koʻrsatkichlariga muvofiq baholaydilar;</p>
<p>2.21. amaliyotchiga amaliyot davri davomida moliyaviy imkoniyat doirasida ish haqi to‘lanadigan lavozimga ishga qabul qilish masalasini hal qiladi;</p>
<p>2.22. tashkilotning ichki mehnat intizomini buzgan talaba haqida qabul qiluvchi tashkilot Universitet rektori (direktori)ga xabar qiladi;</p>
<p>2.23. talaba amaliyotni o‘tash davrida amaliyot o‘tash joyida baxtsiz hodisaga uchragan holatlar bo‘yicha javobgarlik masalalarini qonunchilik hujjatlari asosida ko‘rib chiqadi;</p>
<p>2.24. amaliyotchi-talabani amaliyot davrida bitiruv malakaviy ishi yuzasidan aprobasiyasini oʻtkazishga amaliy yordam berish;</p>
<p>2.25. qabul qiluvchi tashkilot rahbari talaba ta’lim olayotgan yo‘nalishi (mutaxassisligi) bo‘yicha bo‘sh ish joylari mavjud bo‘lgan taqdirda, uni vaqtinchalik ish xaqi to‘lanadigan lavozimga tayinlashi hamda talaba o‘qishni bitirgandan so‘ng to‘liq ish bilan ta’minlashi mumkin.</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">III. Tomonlarning javobgarligi</div>
<p>3.1. Universitet va qabul qiluvchi muassasa amaliyotni tashkil etish jarayonida shartnoma predmeti, taraflarning huquq va majburiyatlari, qabul qiluvchi tashkilotning ish faoliyati xususiyatlaridan kelib chiqqan holda amaliyotni tashkil etish va o‘tkazish tartibini, shartnomaning amal qilish muddatini, shartnomani bekor qilish asoslarini, shuningdek, taraflarning javobgarligini kelishib oladi;</p>
<p>3.2. amaliyotni tashkil etish va o‘tkazish uchun javobgarlik Universitet rektori (direktori) va amaliyot o‘taladigan tashkilot rahbari zimmasiga yuklatiladi;</p>
<p>3.3. talabalarning amaliyot reja-jadvali va dasturlarini to‘liq bajarilishiga o‘quv ishlari bo‘yicha prorektor, o‘quv-uslubiy boshqarma (bo‘lim) boshlig‘i, fakultet dekani, kafedra mudiri va universitetdagi amaliyot rahbari javobgar hisoblanadi.</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">IV. Fors-major holatlari</div>
<p>4.1. Agar ushbu shartnoma bo‘yicha majburiyatlar qisman yoki to‘liq bajarilmasligi yengib bo‘lmaydigan kuch, ya’ni favqulodda va muayyan sharoitlarda oldini olib bo‘lmaydigan vaziyatlar (fors-major) tufayli kelib chiqsa va agar bu holatlar mazkur shartnomaning bajarilishiga bevosita ta’sir etsa, tomonlar bunda bajarmaslik uchun javobgarlikdan ozod etiladilar;</p>
<p>4.2. Mazkur shartnoma bo‘yicha majburiyatlarni bajarish muddati yengib bo‘lmaydigan kuch holatlari amal qilgan, shuningdek ushbu holatlar yuzaga keltirgan vaqtga mutanosib ravishda uzaytiriladi;</p>
<p>4.3. Fors-major holati mavjud bo‘lgan tomon 5 kun ichida boshqa tomonni fors-major holati boshlangan muddatlarni ko‘rsatgan holda yozma ravishda ogohlantirishi lozim.</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">V. Shartnomani o‘zgartirish va bekor qilish tartibi</div>
<p>5.1. Majburiyatni bajarishni bir tomonlama bosh tortishga va shartnoma shartlarini bir tomonlama o‘zgartirishga yo‘l qo‘yilmaydi;</p>
<p>5.2. Ushbu shartnomaga har qanday o‘zgartirish va qo‘shimchalar tomonlar o‘rtasida yozma ravishda rasmiylashtirilgan va tomonlar o‘rtasida imzolangan taqdirda haqiqiy hisoblanadi.</p>
<p>5.3. Shartnomani muddatidan oldindan bekor qilishga tomonlarning kelishuviga muvofiq yoki qonun hujjatlarida nazarda tutilgan asoslarga ko‘ra yo‘l qo‘yiladi.</p>
<p>5.4. Mazkur shartnomani bekor qilishga qaror qilingan tomon ikkinchi tomonga o‘n kun oldin yozma bildirishnoma yuborishi shart.</p>
<p>5.5. Taʼlim muassasasi tegishli hujjatlar asosida tugatilganda bekor qilinadi.</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">VI. Nizolarni hal etish tartibi</div>
<p>6.1. Tomonlar o‘rtasida mazkur shartnoma yuzasidan kelib chiqadigan nizolar o‘zaro kelishuv asosida hal qilish choralari ko‘riladi.</p>
<p>6.2. Kelishuvga erishilmagan taqdirda nizolar qonunchilikda belgilangan qonun osti hujjatlari doirasida ko‘rib chiqiladi.</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">VII. Yakuniy qoidalar</div>
<p>7.1. Mazkur shartnoma bilan tartibga solinmagan masalalar qonun hujjatlarida belgilangan tartibda hal etiladi.</p>
<p>7.2. Ushbu shartnoma {contract_end_date} ga qadar amal qiladi.</p>
<p>7.3. Shartnoma davlat tilida, ikki nusxada tuziladi va ular bir xil yuridik kuchga ega.</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">Tomonlarning manzili va rekvizitlari:</div>
<table class="signatures">
  <tr>
    <td>
      <p class="bold">Universitet manzili:</p>
      <p>Chirchiq davlat pedagogika universiteti</p>
      <p>Pochta manzili: Chirchiq shahri A.Temur ko‘chasi 104 uy</p>
      <p>Telefon: (370) 716-68-11</p>
      <p>Faks: (370) 716-68-11 cspu.uz</p>
      <br>
      <p class="bold">Chirchiq davlat pedagogika universiteti rektori</p>
      <p>_________________ (imzo)</p>
      <p class="bold">M.Oʻ.</p>
      <div style="text-align: center; margin-top: 10px; width: 100px;">{qr_code}</div>
      <p>Chirchiq sh.</p>
      <p>202{year} y. "{day}" {month}</p>
    </td>
    <td>
      <p class="bold">Qabul qiluvchi muassasa</p>
      <p>Manzil: {company_name}</p>
      <br><br><br><br><br>
      <p>_________________ (imzo)</p>
      <p class="bold">M.Oʻ.</p>
      <br><br><br>
      <p>Toshkent</p>
      <p>202{year} y. "{day}" {month}</p>
    </td>
  </tr>
</table>
</body>
</html>"""

HTML_PEDAGOGICAL = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: "Times New Roman", Times, serif; font-size: 14px; line-height: 1.15; color: #000; }
  p { margin: 0 0 10px 0; text-align: justify; text-indent: 1.25cm; }
  .text-center { text-align: center; text-indent: 0; }
  .text-right { text-align: right; text-indent: 0; }
  .bold { font-weight: bold; }
  .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 15px; }
  ul { margin: 0 0 10px 0; padding-left: 1.25cm; }
  li { text-align: justify; margin-bottom: 5px; }
  .signatures { width: 100%; border: none; margin-top: 30px; }
  .signatures td { width: 50%; vertical-align: top; text-align: left; padding: 0 10px; }
  .signatures td p { text-indent: 0; }
</style>
</head>
<body>
<div class="title">Talabalarning o‘quv pedagogika amaliyotini o‘tkazish yuzasidan ikki tomonlama<br>{contract_no}-sonli SHARTNOMA</div>
<p>Chirchiq davlat pedagogika universiteti hamda {school_district} idagi {school_name} Direktori {school_director_name} tomonidan o‘zaro kelishuv asosida tuzilgan.</p>
<p class="text-right" style="text-indent:0;">202{year} yil. - Chirchiq shahri</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">SHARTNOMA MAZMUNI</div>
<ul>
  <li>talabalarining o‘quv amaliyoti o‘quv yilining {practice_start_month} oyidan {practice_end_month} oyigacha xaftasiga {practice_days_per_week} kun {practice_hours_per_day} soatdan o‘tkazish:</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">AMALIYOT O‘TKAZILADIGAN TA’LIM MUASSASANING MAJBURIYATLARI</div>
<p style="text-indent:0;">ta’lim muassasasi o‘quv rejasiga muvofiq {practice_field} talabalarining o‘quv pedagogik amaliyotini o‘tkazishga imkoniyat yaratish:</p>
<ul>
  <li>talabalarni ta’lim muassasasi o‘quv fanlari dasturlari hamda darsliklar bilan tanishtirish;</li>
  <li>talabalarga malakali mutaxassislarni biriktirish;</li>
  <li>talabalarni tarbiyaviy ishlarni o‘tkazishga tayyorlash va o‘z tajribalarini ularga o‘rgatish;</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">UNIVERSITET MAJBURIYATLARI</div>
<p style="text-indent:0;">amaliyot o‘tkaziladigan ta’lim muassasasini xabardor qilish va ichki tartibga rioya qilish:</p>
<ul>
  <li>o‘quv amaliyot boshlanishidan bir hafta avval amaliyotga boradigan talabalar soni, ta’lim yo‘nalish, amaliyot o‘tkazish muddati haqida shartnoma tuzgan ta’lim muassasasiga rahbariyatiga ma’lum qilish;</li>
  <li>talabalarning o‘quv amaliyot o‘tadigan ta’lim muassasasining ichki tartib-qoidalariga qat’iy rioya qilish va amaliyot davrida o‘tkaziladigan barcha tadbirlarda ularning faol ishtirok etishini ta’minlash;</li>
  <li>talabalarning amaliyot o‘tadigan ta’lim muassasasining ichki tartib-qoidalariga qat’iy rioya qilish hamda amaliyotchi talabalar va metodist o‘qituvchilarni ta’lim muassasasidagi turniket tizimiga a’zo bo‘lishi, amaliyot davrida o‘tkaziladigan tadbirlarda ularning faol ishtirok etishni ta’minlash;</li>
  <li>Amaliyot o‘taydigan talabalarning ro‘yxatini shartnomaga ilova qilish.</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">SHARTNOMANI BEKOR QILINISHI</div>
<p style="text-indent:0;">shartnoma qo‘yidagi hollarda bekor qilinishi mumkin:</p>
<ul>
  <li>o‘quv pedagogik amaliyot o‘tkazish bo‘yicha tomonlarning Nizomiga muvofiq ko‘zda tutilgan majburiyatlar bajarilmaganda;</li>
  <li>shartnomaga o‘zgartirish va qo‘shimchalar kiritish zaruriyati tug‘ilganda shartnoma har ikki tomonning imzosi qo‘yilgan kundan boshlab kuchga kiradi.</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">TOMONLARNING YURIDIK MANZILLARI</div>
<table class="signatures" style="margin-top:0;">
  <tr>
    <td>
      <p class="bold">Universitet manzili:</p>
      <p>Chirchiq davlat pedagogika universiteti</p>
      <p>Pochta manzili: Toshkent viloyati, Chirchiq shahri A.Temur ko‘chasi 104 uy</p>
      <p>Telefon: (370) 716-68-11</p>
      <p>Faks: (370) 716-68-11 cspu.uz</p>
    </td>
    <td>
      <p class="bold">Shartnoma tuzgan ta’lim muassasasi manzili:</p>
      <p>{school_name}</p>
      <p>Telefon: _________________</p>
    </td>
  </tr>
</table>

<div class="bold text-center" style="margin-top: 25px; margin-bottom: 10px;">TOMONLARNING IMZOSI</div>
<table class="signatures" style="margin-top:0;">
  <tr>
    <td>
      <p class="bold">Ta’lim muassasasi rahbari</p>
      <p>{university_rector_full_name}</p>
      <p>______________________ Imzo</p>
      <p class="bold">M.Oʻ.</p>
      <div style="text-align: center; margin-top: 10px; width: 100px;">{qr_code}</div>
    </td>
    <td>
      <p class="bold">Shartnoma tuzilgan muassasasi rahbari</p>
      <p>{school_director_name}</p>
      <p>______________________ Imzo</p>
      <p class="bold">M.Oʻ.</p>
    </td>
  </tr>
</table>
</body>
</html>"""

HTML_QUALIFYING_PRODUCTION = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: "Times New Roman", Times, serif; font-size: 14px; line-height: 1.15; color: #000; }
  p { margin: 0 0 10px 0; text-align: justify; text-indent: 1.25cm; }
  .text-center { text-align: center; text-indent: 0; }
  .text-right { text-align: right; text-indent: 0; }
  .bold { font-weight: bold; }
  .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 15px; }
  ul { margin: 0 0 10px 0; padding-left: 1.25cm; }
  li { text-align: justify; margin-bottom: 5px; }
  .signatures { width: 100%; border: none; margin-top: 30px; }
  .signatures td { width: 50%; vertical-align: top; text-align: left; padding: 0 10px; }
  .signatures td p { text-indent: 0; }
</style>
</head>
<body>
<div class="title">Talabalarning o‘quv malakaviy amaliyotini o‘tkazish yuzasidan ikki tomonlama<br>{contract_no}-sonli SHARTNOMA</div>
<p class="text-right" style="text-indent:0;">Chirchiq shahar "{day}" {month} 202{year} yil</p>

<p>Biz quyida imzo chekuvchilar, Chirchiq davlat pedagogika universiteti rektori {university_rector_full_name} bir tomondan va {company_name} direktori (rahbari) {company_director_full_name} ikkinchi tomondan quyidagi shartlar ko’satilgan shartnomani tuzishdi.</p>

<div class="bold" style="margin-top: 15px; margin-bottom: 10px; text-indent: 1.25cm;">1. Shartnoma maqsadi</div>
<p>1.1. Universitet talabalarni ishlab chiqarish amaliyotiga yuboradi, Tashkilot esa ularga amaliyot o'tash uchun tegishli texnik va ishlab chiqarish bazasini ajratadi.</p>
<p>1.2. Amaliyot muddati: {practice_start_date} dan {practice_end_date} gacha.</p>

<div class="bold" style="margin-top: 15px; margin-bottom: 10px; text-indent: 1.25cm;">2. Tomonlarning majburiyatlari</div>
<div class="bold" style="margin-bottom: 5px; text-indent: 1.25cm;">2.1. Chirchiq davlat pedagogika universitetining majburiyatlari:</div>
<ul>
  <li>Shartnomada ko’rsatilgan muddatda talabalarni amaliyotga yo’llaydi va o’z vaqtida amaliyot o’taydigan tashkilotda bo’lishini taminlaydi;</li>
  <li>Amaliyotga yuborilgan talabalarga texnika va mehnat xavfsizligi bo’yicha tushuntirish berish va ko’nikmalar shakllantirish;</li>
  <li>Amaliyotchilarga universitet tomonidan tajribali mutaxassis o’qituvchilardan rahbarlar tayinlaydi;</li>
  <li>Amaliyot o’tuvchi talabalarni yetarli metodik qo’llanmalar, dasturlar bilan ta’minlaydi;</li>
  <li>Amaliyotchilar tomonidan amaliyot o’tkaziladigan tashkilotning ichki intizomi qonun-qoidalari to’liq bajarilishini ta’minlaydi.</li>
</ul>

<div class="bold" style="margin-bottom: 5px; text-indent: 1.25cm;">2.2 {company_name} majburiyatlari:</div>
<ul>
  <li>Talabalarni ishlab chiqarish ichki va tashqi qonun-qoidalari bilan tanishtirish va ular oldida kerakli talab va ko’rsatmalar qo’yish;</li>
  <li>Amaliyotchilar tomonidan amaliyot dasturida ko’zda tutilgan vazifalarni bajarish uchun imkoniyat yaratish va ularni amaliyot bilan bog’liq bo’lmagan ishlarga jalb qilmaslik;</li>
  <li>Talabalarni mehnat muhofazasi, texnika xavfsizligi va ishlab chiqarish sanitariyasi qoidalari bilan tanishtirish, borada tegishli xujjatlarni to’ldirish;</li>
  <li>Amaliyot oxirida har bir amaliyotchiga xarakteristika berish.</li>
</ul>

<div class="bold" style="margin-top: 15px; margin-bottom: 10px; text-indent: 1.25cm;">3. Tomonlarning javobgarligi</div>
<ul>
  <li>Tomonlar yuqori qonun chiqaruvchi tashkilotlar, vazirlik tomonidan qabul qilingan amaliyotga taalluqli ko’rsatma va qonunlarning bajarilishiga javobgardirlar;</li>
  <li>Ushbu shartnoma yuzasidan kelib chiqadigan barcha kelishmovchiliklar qonuniy yo’l bilan bartaraf qilinadi;</li>
  <li>Amaliyot yakunida talabaning yozma ravishda hisoboti bevosita amaliyot obyektidan tayinlangan rahbar imzolagandan so’ng tashkil etilgan komissiya ishtirokida qabul qilinadi;</li>
  <li>Komissiya tarkibiga amaliyot obyektidan tayinlangan rahbar va universitetdan tayinlangan ma’sullar kiritiladi, amaliyot natijasi bahosi talabaning kursdan kursga o’tishi va stipendiya belgilashda hisobga olinadi;</li>
  <li>Amaliyot dasturini bajarmagan, ishiga qoniqarsiz taqriz berilgan yoki hisobot himoyasida qoniqarsiz baho olgan talaba ta’til vaqtida o’z hisobidan qayta amaliyot o’taydi.</li>
</ul>

<div class="bold" style="margin-top: 15px; margin-bottom: 10px; text-indent: 1.25cm;">4. Shartnoma muddati va alohida shartlari</div>
<ul>
  <li>Shartnoma har ikkala tomon imzolagandan keyin kuchga kiradi va 2028-yil 31-avgustgacha amal qiladi;</li>
  <li>Mazkur shartnoma bo’yicha amaliyot o’tash davri o’quv jarayoni jadvali asosida belgilanadi, bu haqida kamida 1 hafta ilgari muassasa, tashkilot, korxona rahbariyati ogohlantiradi;</li>
  <li>Taraflar o’rtasida malakaviy amaliyot bilan bog’liq bo’lmagan boshqa munosabatlar alohida shartnoma asosida tartibga solinadi.</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">TOMONLARNING YURIDIK MANZILLARI</div>
<table class="signatures" style="margin-top:0;">
  <tr>
    <td>
      <p class="bold">Universitet manzili:</p>
      <p>Chirchiq davlat pedagogika universiteti</p>
      <p>Pochta manzili: Toshkent viloyati, Chirchiq shahri A.Temur ko‘chasi 104 uy</p>
      <p>Telefon: (370) 716-68-11</p>
      <p>Faks: (370) 716-68-11 cspu.uz</p>
    </td>
    <td>
      <p class="bold">Shartnoma tuzgan ta’lim muassasasi manzili:</p>
      <p>{company_name}</p>
      <p>Telefon: _________________</p>
    </td>
  </tr>
</table>

<div class="bold text-center" style="margin-top: 25px; margin-bottom: 10px;">TOMONLARNING IMZOSI</div>
<table class="signatures" style="margin-top:0;">
  <tr>
    <td>
      <p class="bold">Ta’lim muassasasi rahbari</p>
      <p>{university_rector_full_name}</p>
      <p>______________________ Imzo</p>
      <p class="bold">M.Oʻ.</p>
      <p>"{day}" {month} 202{year} yil</p>
      <div style="text-align: center; margin-top: 10px; width: 100px;">{qr_code}</div>
    </td>
    <td>
      <p class="bold">Shartnoma tuzilgan muassasasi rahbari</p>
      <p>{company_director_full_name}</p>
      <p>______________________ Imzo</p>
      <p class="bold">M.Oʻ.</p>
      <p>"{day}" {month} 202{year} yil</p>
    </td>
  </tr>
</table>
</body>
</html>"""

HTML_INTRO_CORRESPONDENCE = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: "Times New Roman", Times, serif; font-size: 14px; line-height: 1.15; color: #000; }
  p { margin: 0 0 10px 0; text-align: justify; text-indent: 1.25cm; }
  .text-center { text-align: center; text-indent: 0; }
  .text-right { text-align: right; text-indent: 0; }
  .bold { font-weight: bold; }
  .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 15px; }
  ul { margin: 0 0 10px 0; padding-left: 1.25cm; }
  li { text-align: justify; margin-bottom: 5px; }
  .signatures { width: 100%; border: none; margin-top: 30px; }
  .signatures td { width: 50%; vertical-align: top; text-align: left; padding: 0 10px; }
  .signatures td p { text-indent: 0; }
</style>
</head>
<body>
<div class="title">Talabalarning o‘quv malakaviy amaliyotini o‘tkazish yuzasidan ikki tomonlama<br>{contract_no}-sonli SHARTNOMA</div>
<p>Chirchiq davlat pedagogika universiteti hamda {school_district} idagi {school_name} Direktori {school_director_name} tomonidan o‘zaro kelishuv asosida tuzilgan.</p>
<p class="text-right" style="text-indent:0;">202{year} yil. - Chirchiq shahri</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">SHARTNOMA MAZMUNI</div>
<ul>
  <li>talabalarining o‘quv amaliyoti o‘quv yilining {practice_start_month} oyidan {practice_end_month} oyigacha xaftasiga {practice_days_per_week} kun {practice_hours_per_day} soatdan o‘tkazish:</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">AMALIYOT O‘TKAZILADIGAN TA’LIM MUASSASANING MAJBURIYATLARI</div>
<p style="text-indent:0;">ta’lim muassasasi o‘quv rejasiga muvofiq {practice_field} Malakaviy amaliyotini o‘tkazishga imkoniyat yaratish:</p>
<ul>
  <li>talabalarni ta’lim muassasasi o‘quv fanlari dasturlami hamda darsliklar bilan tanishtirish;</li>
  <li>talabalarni mehnat muhofazasi, texnika xavfsizligi va ishlab chiqarish sanitariyasi qoidalari bilan tanishtirish borada tegishli xujjatlarni to’ldirish;</li>
  <li>o`quv-uslubiy ko`rgazmali jihozlarni har bir mavzu uchun tayyorlash zaruriyati bilan tanishtirish;</li>
  <li>o`quv mashg`ulotlarining dars ishlanmalari va mavzu rejalarini ishlab chiqish bilan tanishtirish;</li>
  <li>ta`lim muassasalari hujjatlarini olib borish (sinf qaydnomasi), bolalar kundaliklari, daftarlarini tekshirishni tushuntirish;</li>
  <li>amaliyotni o‘tash davrida talabalarga amaliyotchi maqomini beradi;</li>
  <li>talabalarga malakali mutaxassislarni biriktirish;</li>
  <li>talabalarni tarbiyaviy ishlarni o‘tkazishga tayyorlash va o‘z tajribalarini ularga o‘rgatish;</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">UNIVERSITET MAJBURIYATLARI</div>
<p style="text-indent:0;">amaliyot o‘tkaziladigan ta’lim muassasasini xabardor qilish va ichki tartibga rioya qilish:</p>
<ul>
  <li>o‘quv amaliyot boshlanishidan bir hafta avval amaliyotga boradigan talabalar soni, ta’lim yo‘nalish, amaliyot o‘tkazish muddati haqida shartnoma tuzgan ta’lim muassasasiga rahbariyatiga ma’lum qilish;</li>
  <li>talabalarning o‘quv amaliyot o‘tadigan ta’lim muassasasining ichki tartib-qoidalariga qat’iy rioya qilish va amaliyot davrida o‘tkaziladigan barcha tadbirlarda ularning faol ishtirok etishini ta’minlash;</li>
  <li>talabalarning amaliyot o‘tadigan ta’lim muassasasining ichki tartib-qoidalariga qat’iy rioya qilish hamda amaliyotchi talabalar va metodist o‘qituvchilarni ta’lim muassasasidagi turniket tizimiga a’zo bo‘lishi, amaliyot davrida o‘tkaziladigan tadbirlarda ularning faol ishtirok etishni ta’minlash;</li>
  <li>Amaliyot o‘taydigan talabalarning ro‘yxatini shartnomaga ilova qilish.</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">SHARTNOMANI BEKOR QILINISHI</div>
<p style="text-indent:0;">shartnoma quyidagi hollarda bekor qilinishi mumkin:</p>
<ul>
  <li>o‘quv malakaviy amaliyot o‘tkazish bo‘yicha tomonlarning Nizomiga muvofiq ko‘zda tutilgan majburiyatlar bajarilmaganda;</li>
  <li>shartnomaga o‘zgartirish va qo‘shimchalar kiritish zaruriyati tug‘ilganda shartnoma har ikki tomonning imzosi qo‘yilgan kundan boshlab kuchga kiradi.</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">TOMONLARNING YURIDIK MANZILLARI</div>
<table class="signatures" style="margin-top:0;">
  <tr>
    <td>
      <p class="bold">Universitet manzili:</p>
      <p>Chirchiq davlat pedagogika universiteti</p>
      <p>Pochta manzili: Toshkent viloyati, Chirchiq shahri A.Temur ko‘chasi 104 uy</p>
      <p>Telefon: (71) 716-68-11</p>
      <p>Faks: (71) 716-68-11 cspu.uz</p>
    </td>
    <td>
      <p class="bold">Shartnoma tuzgan ta’lim muassasasi manzili:</p>
      <p>{school_name}</p>
      <p>Telefon: _________________</p>
    </td>
  </tr>
</table>

<div class="bold text-center" style="margin-top: 25px; margin-bottom: 10px;">TOMONLARNING IMZOSI</div>
<table class="signatures" style="margin-top:0;">
  <tr>
    <td>
      <p class="bold">Ta’lim muassasasi rahbari</p>
      <p>{university_rector_full_name}</p>
      <p>______________________ Imzo</p>
      <p class="bold">M.Oʻ.</p>
      <p>"{day}" {month} 202{year} yil</p>
      <div style="text-align: center; margin-top: 10px; width: 100px;">{qr_code}</div>
    </td>
    <td>
      <p class="bold">Shartnoma tuzilgan muassasasi rahbari</p>
      <p>{school_director_name}</p>
      <p>______________________ Imzo</p>
      <p class="bold">M.Oʻ.</p>
      <p>"{day}" {month} 202{year} yil</p>
    </td>
  </tr>
</table>
</body>
</html>"""

HTML_TOURISM = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: "Times New Roman", Times, serif; font-size: 14px; line-height: 1.15; color: #000; }
  p { margin: 0 0 10px 0; text-align: justify; text-indent: 1.25cm; }
  .text-center { text-align: center; text-indent: 0; }
  .text-right { text-align: right; text-indent: 0; }
  .bold { font-weight: bold; }
  .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 15px; }
  ul { margin: 0 0 10px 0; padding-left: 1.25cm; }
  li { text-align: justify; margin-bottom: 5px; }
  .signatures { width: 100%; border: none; margin-top: 30px; }
  .signatures td { width: 50%; vertical-align: top; text-align: left; padding: 0 10px; }
  .signatures td p { text-indent: 0; }
</style>
</head>
<body>
<div class="title">Talabalarning malakaviy amaliyotini o‘tkazish yuzasidan ikki tomonlama<br>SHARTNOMA {contract_no}</div>
<p class="text-right" style="text-indent:0;">Chirchiq shahri "{day}" {month} 202{year} yil</p>

<p>Chirchiq davlat pedagogika universiteti hamda {company_name} rahbari {company_director_full_name} tomonidan o‘zaro kelishuv asosida tuzilgan</p>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">SHARTNOMA MAZMUNI</div>
<ul>
  <li>talabalarining malakaviy amaliyoti o‘quv yilining {practice_start_month} oyidan {practice_end_month} oyigacha xaftasiga {practice_days_per_week} kun {practice_hours_per_day} soatdan o‘tkazish:</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">AMALIYOT O‘TKAZILADIGAN TASHKILOT (MUASSASA)NING MAJBURIYATLARI</div>
<p style="text-indent:0;">ta’lim muassasasi o‘quv rejasiga muvofiq {student_field} talabalarining {student_name} malakaviy amaliyotini o‘tkazishga imkoniyat yaratish:</p>
<ul>
  <li>talabalarni tashkilot (muassasa) hamda meyoriy xujjatlari bilan tanishtirish;</li>
  <li>talabalarga malakali mutaxassislarni biriktirish;</li>
  <li>talabalarni mutaxassisligi bo‘yicha ishlarni o‘tkazishga tayyorlash va o‘z tajribalarini ularga o‘rgatish;</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">UNIVERSITET MAJBURIYATLARI</div>
<p style="text-indent:0;">amaliyot o‘tkaziladigan tashkilot (muassasa)ni xabardor qilish va ichki tartibga rioya qilish:</p>
<ul>
  <li>amaliyot boshlanishidan bir hafta avval amaliyotga boradigan talabalar soni, ta’lim yo‘nalish, amaliyot o‘tkazish muddati haqida shartnoma tuzgan tashkilot (muassasa) rahbariyatiga ma’lum qilish;</li>
  <li>talabalarning amaliyot o‘tadigan tashkilot (muassasa)ning ichki tartib-qoidalariga qat’iy rioya qilish va amaliyot davrida faol ishtirok etishini ta’minlash;</li>
  <li>talabalarning amaliyot o‘tadigan tashkilot (muassasa)ning amaliyotchi talabalar va soha mutaxassislarini tashkilot (muassasa)dagi barcha tizimga a’zo bo‘lishi, amaliyot davrida o‘tkaziladigan tadbirlarda ularning faol ishtirok etishni ta’minlash;</li>
  <li>amaliyot o‘tash uchun shartnomaga talabalarning ro‘yxatini ilova qilish.</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">SHARTNOMANI BEKOR QILINISHI</div>
<p style="text-indent:0;">shartnoma qo‘yidagi hollarda bekor qilinishi mumkin:</p>
<ul>
  <li>amaliyot o‘tkazish bo‘yicha tomonlarning Nizomiga muvofiq ko‘zda tutilgan majburiyatlar bajarilmaganda;</li>
  <li>shartnomaga o‘zgartirish va qo‘shimchalar kiritish zaruriyati tug‘ilganda shartnoma har ikki tomonning imzosi qo‘yilgan kundan boshlab kuchga kiradi.</li>
</ul>

<div class="bold text-center" style="margin-top: 15px; margin-bottom: 10px;">TOMONLARNING YURIDIK MANZILLARI</div>
<table class="signatures" style="margin-top:0;">
  <tr>
    <td>
      <p class="bold">Chirchiq davlat pedagogika universiteti</p>
      <p>Pochta manzili: Toshkent viloyati, Chirchiq shahri A.Temur ko‘chasi 104 uy</p>
      <p>Telefon: (370) 716-68-11</p>
      <p>Faks: (370) 716-68-11 cspu.uz</p>
    </td>
    <td>
      <p class="bold">Shartnoma tuzgan tashkilot (muassasa) manzili:</p>
      <p>{company_name}</p>
      <p>Telefon: _________________</p>
    </td>
  </tr>
</table>

<div class="bold text-center" style="margin-top: 25px; margin-bottom: 10px;">TOMONLARNING IMZOSI</div>
<table class="signatures" style="margin-top:0;">
  <tr>
    <td>
      <p class="bold">Ta’lim muassasasi rahbari</p>
      <p>{university_rector_full_name}</p>
      <p>____________________________________________</p>
      <p>Imzo</p>
      <div style="text-align: center; margin-top: 10px; width: 100px;">{qr_code}</div>
    </td>
    <td>
      <p class="bold">Shartnoma tuzigan tashkilot (muassasa) rahbari</p>
      <p>{company_director_full_name}</p>
      <p>____________________________________________</p>
      <p>Imzo</p>
    </td>
  </tr>
</table>
</body>
</html>"""

_TEMPLATES = [
    {
        "name": "4+2 Amaliyot Shartnomasi (2025-2026)",
        "description": "Chirchiq davlat pedagogika universiteti talabalarining 4+2 tartibida malakaviy amaliyot o'tashi bo'yicha shartnoma",
        "html": HTML_4_PLUS_2,
        "placeholders": ["contract_no", "day", "month", "year", "university_rector_full_name", "company_name", "company_director_full_name", "practice_start_date", "practice_end_date", "contract_end_date", "qr_code"],
    },
    {
        "name": "Pedagogik Amaliyot Shartnomasi (2025-2026)",
        "description": "Talabalarning o'quv-pedagogika amaliyotini maktab va ta'lim muassasalarida o'tkazish bo'yicha shartnoma",
        "html": HTML_PEDAGOGICAL,
        "placeholders": ["contract_no", "day", "month", "year", "school_district", "school_name", "school_director_name", "university_rector_full_name", "practice_start_month", "practice_end_month", "practice_days_per_week", "practice_hours_per_day", "practice_field", "qr_code"],
    },
    {
        "name": "Ishlab Chiqarish Malakaviy Amaliyot Shartnomasi",
        "description": "Ishlab chiqarish va tashkilotlarda malakaviy amaliyot o'tash bo'yicha shartnoma",
        "html": HTML_QUALIFYING_PRODUCTION,
        "placeholders": ["contract_no", "day", "month", "year", "company_name", "company_director_full_name", "university_rector_full_name", "practice_start_date", "practice_end_date", "qr_code"],
    },
    {
        "name": "Tanishtiruv Malakaviy Amaliyot Shartnomasi (Sirtqi)",
        "description": "Sirtqi ta'lim shakli talabalarining tanishtiruv malakaviy amaliyotini o'tkazish bo'yicha shartnoma",
        "html": HTML_INTRO_CORRESPONDENCE,
        "placeholders": ["contract_no", "day", "month", "year", "school_district", "school_name", "school_director_name", "university_rector_full_name", "practice_start_month", "practice_end_month", "practice_days_per_week", "practice_hours_per_day", "practice_field", "qr_code"],
    },
    {
        "name": "Turizm Amaliyot Shartnomasi",
        "description": "Turizm va mehmonxona xo'jaligi yo'nalishi talabalarining amaliyotini o'tkazish bo'yicha shartnoma",
        "html": HTML_TOURISM,
        "placeholders": ["contract_no", "day", "month", "year", "company_name", "company_director_full_name", "university_rector_full_name", "practice_start_month", "practice_end_month", "practice_days_per_week", "practice_hours_per_day", "student_field", "student_name", "qr_code"],
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    for t in _TEMPLATES:
        exists = conn.execute(
            sa.text("SELECT 1 FROM contract_templates WHERE name = :name"),
            {"name": t["name"]},
        ).scalar()
        if exists:
            continue
        conn.execute(
            sa.text(
                """
                INSERT INTO contract_templates
                    (id, name, description, html_content, placeholders, variables,
                     status, created_at, updated_at)
                VALUES
                    (:id, :name, :description, :html, CAST(:placeholders AS jsonb),
                     CAST('[]' AS jsonb), 'active', now(), now())
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "name": t["name"],
                "description": t["description"],
                "html": t["html"],
                "placeholders": json.dumps(t["placeholders"]),
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    for t in _TEMPLATES:
        conn.execute(
            sa.text(
                "DELETE FROM contract_templates WHERE name = :name AND html_content IS NOT NULL"
            ),
            {"name": t["name"]},
        )
