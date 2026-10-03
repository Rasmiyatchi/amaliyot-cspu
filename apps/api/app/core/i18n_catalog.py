"""Generatsiya qilingan katalog — backend xato xabarlari uz→ru.

Barcha user-facing `HTTPException(detail=...)` va `ValidationError(...)` xabarlari
(app/services/, app/api/, app/core/) shu yerda ruschaga o'girilgan. Mexanizm:
app/core/i18n.py (EXACT — aniq moslik, PATTERNS — f-string'lar uchun regex,
`re.fullmatch` bilan tekshiriladi, tartib muhim: aniqroq shablonlar oldin).

Ataylab qamrab olinmagan xabarlar:
  - `HTTPException(403)` detail'siz (app/api/v1/stats.py) — FastAPI default
    "Forbidden" qaytaradi, katalog detail string'largagina qo'llanadi.
  - HEMIS / supervizor importidagi qator-darajali ValueError'lar
    (app/services/hemis.py, app/services/supervisor_import.py) — ular HTTP detail
    emas, import hisobotining body'sida qatorma-qator qaytadi.
  - Pydantic RequestValidationError (422) — strukturaviy format, frontend o'zi
    ko'rsatadi.
"""

EXACT: dict[str, str] = {
    ".docx fayl yuklang": "Загрузите файл .docx",
    "Admin topilmadi": "Администратор не найден",
    "Akademik yilga bog'langan guruhlar bor": "К учебному году привязаны группы",
    "Aktiv yoki tugagan biriktirishni o'chirib bo'lmaydi — avval bekor qiling": (
        "Нельзя удалить активное или завершённое прикрепление — сначала отмените его"
    ),
    "Allaqachon yashil": "Уже зелёный",
    "Amaliyot dasturi uchun amaliyot turi tanlash shart": (
        "Для программы практики необходимо выбрать тип практики"
    ),
    "Amaliyot turi topilmadi": "Тип практики не найден",
    "Ariza allaqachon tasdiqlangan": "Заявка уже подтверждена",
    "Ariza tasdiqlanmagan": "Заявка не подтверждена",
    "Ariza topilmadi": "Заявка не найдена",
    "Aynan shu kod VA nomli yo'nalish allaqachon mavjud "
    "(bir kod bilan boshqa nomli yo'nalish qo'shsa bo'ladi)": (
        "Направление с точно таким кодом И названием уже существует "
        "(с тем же кодом можно добавить направление с другим названием)"
    ),
    "Aynan shu kod va nomli yo'nalish allaqachon mavjud": (
        "Направление с точно таким кодом и названием уже существует"
    ),
    "Baholashga ruxsat yo'q": "Нет разрешения на оценивание",
    "Bekor qilingan amaliyotni baholab bo'lmaydi": "Нельзя оценивать отменённую практику",
    "Biriktirish sizga tegishli emas": "Прикрепление не принадлежит вам",
    "Biriktirish topilmadi": "Прикрепление не найдено",
    "Biriktirish topilmadi yoki siz supervizor emassiz": (
        "Прикрепление не найдено, или вы не являетесь его руководителем"
    ),
    "Biriktirish topilmadi yoki sizga tegishli emas": (
        "Прикрепление не найдено или не принадлежит вам"
    ),
    "Biriktirma topilmadi": "Вложение не найдено",
    "Bog'langan supervizorlar yoki amaliyotlar bor — is_active=false qiling": (
        "Есть привязанные руководители или практики — установите is_active=false"
    ),
    "Bu Amaliyot ID boshqa talabada mavjud yoki ma'lumot mos emas": (
        "Этот ID уже используется другим студентом, или данные не совпадают"
    ),
    "Bu biriktirish sizga tegishli emas": "Это прикрепление не принадлежит вам",
    "Bu profil boshqa qurilmaga bog'langan. Yangi qurilmadan kirish uchun "
    "administratorga murojaat qiling (eski qurilmani o'chirishi kerak).": (
        "Этот профиль привязан к другому устройству. Для входа с нового устройства "
        "обратитесь к администратору (он должен отвязать старое устройство)."
    ),
    "Bu talaba sizga biriktirilmagan": "Этот студент не прикреплён к вам",
    "Bu username allaqachon band": "Этот username уже занят",
    "Bu username band": "Этот username занят",
    "Bu username yoki email allaqachon mavjud": "Такой username или email уже существует",
    "Bugun check-in qilmagansiz": "Сегодня вы не сделали check-in",
    "Bugun qizil deb belgilangan — check-in mumkin emas": (
        "Сегодня отмечено красным — check-in невозможен"
    ),
    "Bunday guruh allaqachon mavjud": "Такая группа уже существует",
    "Dars tahlili topilmadi": "Анализ урока не найден",
    "Email allaqachon band": "Email уже занят",
    "Email band": "Email занят",
    "Fakultetga bog'langan yo'nalishlar bor — avval ularni o'chiring": (
        "К факультету привязаны направления — сначала удалите их"
    ),
    "Faqat 'admin' yoki 'super_admin' rol qo'llab-quvvatlanadi": (
        "Поддерживаются только роли 'admin' и 'super_admin'"
    ),
    "Faqat DRAFT shartnomani tahrirlash mumkin. Boshqasini bekor qiling.": (
        "Редактировать можно только договор в статусе DRAFT. Иначе сначала отмените его."
    ),
    "Faqat DRAFT shartnomasini o'chirish mumkin. Aktiv bo'lsa — REVOKE qiling.": (
        "Удалить можно только договор в статусе DRAFT. Если он активен — выполните REVOKE."
    ),
    "Faqat PDF va rasm (JPG, PNG) qabul qilinadi": (
        "Принимаются только PDF и изображения (JPG, PNG)"
    ),
    "Faqat Super Admin tasdiqlay oladi": "Подтверждать может только супер-админ",
    "Faqat o'tgan kunlar uchun qizilga belgilash mumkin": (
        "Отмечать красным можно только прошедшие дни"
    ),
    "Faqat rasm fayllari (jpg, png, webp)": "Только файлы изображений (jpg, png, webp)",
    "Faqat talaba amal qiladi": "Действие доступно только студенту",
    "Faqat talaba hisobot topshira oladi": "Сдавать отчёт может только студент",
    "Faqat tuzatishga qaytarilgan arizani qayta yuborish mumkin": (
        "Повторно отправить можно только заявку, возвращённую на доработку"
    ),
    "Fayl bo'sh": "Файл пуст",
    "Fayl hajmi katta": "Файл слишком большой",
    "Fayl mazmuni kengaytmaga mos emas": "Содержимое файла не соответствует расширению",
    "Fayl topilmadi": "Файл не найден",
    "Foydalanuvchi topilmadi": "Пользователь не найден",
    "Geo-fence tashqarisida — tashkilot hududida emassiz": (
        "Вне геозоны — вы не на территории организации"
    ),
    "Guruh topilmadi": "Группа не найдена",
    "Guruhga amaliyot biriktirishlari bog'langan — kurs/yil/yo'nalishni o'zgartirib "
    "bo'lmaydi. Yangi o'quv yili uchun yangi guruh yarating.": (
        "К группе привязаны прикрепления к практике — нельзя менять курс/год/направление. "
        "Создайте новую группу для нового учебного года."
    ),
    "Guruhga talabalar yoki amaliyot biriktirishlari bog'langan — "
    "tarixiy guruhni o'chirib bo'lmaydi": (
        "К группе привязаны студенты или прикрепления к практике — "
        "историческую группу удалить нельзя"
    ),
    "Hisob bloklangan. Admin bilan bog'laning.": (
        "Учётная запись заблокирована. Свяжитесь с администратором."
    ),
    "Hisobot allaqachon tasdiqlangan": "Отчёт уже подтверждён",
    "Hisobot topilmadi": "Отчёт не найден",
    "Hisobotni faqat 'submitted' yoki 'rejected' holatda ko'rib chiqish mumkin": (
        "Рассматривать отчёт можно только в статусе 'submitted' или 'rejected'"
    ),
    "Hududga bog'langan amaliyotlar bor": "К территории привязаны практики",
    "Hujjat topilmadi": "Документ не найден",
    "Joriy parol noto'g'ri": "Текущий пароль неверен",
    "Kafedraga bog'langan supervizorlar bor": "К кафедре привязаны руководители",
    "Kamida username yoki parolni kiriting": "Укажите хотя бы username или пароль",
    "Konflikt": "Конфликт",
    "Kun topilmadi": "День не найден",
    "Kundalik topilmadi": "Запись дневника не найдена",
    "Login generatsiya qila olmadim": "Не удалось сгенерировать логин",
    "Login yoki parol noto'g'ri": "Неверный логин или пароль",
    "Mazkur kontekstda (kurs/semestr/kategoriya/tartib) shunday template mavjud": (
        "В данном контексте (курс/семестр/категория/порядок) такой шаблон уже существует"
    ),
    "Murojaat topilmadi": "Обращение не найдено",
    "Noto'g'ri turi": "Неверный тип",
    "Noto'g'ri yo'l": "Неверный путь",
    "Noto'g'ri yoki muddati o'tgan token": "Недействительный или просроченный токен",
    "O'zgartirish mos emas": "Изменение недопустимо (конфликт данных)",
    "O'zingizni o'chirib bo'lmaydi": "Нельзя удалить самого себя",
    "PDF fayli topilmadi": "PDF-файл не найден",
    "PDF hali generatsiya qilinmagan": "PDF ещё не сгенерирован",
    "Qaytarish sababi kiritilishi shart": "Необходимо указать причину возврата",
    "Refresh cookie topilmadi": "Refresh cookie не найден",
    "Refresh token yaroqsiz": "Refresh token недействителен",
    "Rolni faqat admin/super_admin oralig'ida o'zgartirish mumkin": (
        "Роль можно менять только в пределах admin/super_admin"
    ),
    "Ruxsat yo'q": "Нет доступа",
    "Sana amaliyot diapazonidan tashqarida": "Дата вне диапазона практики",
    "Shablon fayli yo'q": "Файл шаблона отсутствует",
    "Shablon topilmadi": "Шаблон не найден",
    "Shartnoma allaqachon yopilgan": "Договор уже закрыт",
    "Shartnoma fayli hali yo'q": "Файл договора ещё отсутствует",
    "Shartnoma fayli topilmadi": "Файл договора не найден",
    "Shartnoma shabloni tanlanmagan": "Шаблон договора не выбран",
    "Shartnoma shabloni topilmadi": "Шаблон договора не найден",
    "Shartnoma topilmadi": "Договор не найден",
    "Shartnoma yopilgan — skanni o'zgartirib bo'lmaydi": ("Договор закрыт — изменить скан нельзя"),
    "Shu akademik yilda, shu yo'nalishda xuddi shunday nomli guruh mavjud": (
        "В этом учебном году по этому направлению уже есть группа с таким названием"
    ),
    "Shu kodli amaliyot turi mavjud": "Тип практики с таким кодом уже существует",
    "Shu nomli akademik yil mavjud": "Учебный год с таким названием уже существует",
    "Shu nomli hudud mavjud": "Территория с таким названием уже существует",
    "Shu nomli kafedra mavjud": "Кафедра с таким названием уже существует",
    "Shu nomli kafedra mavjud yoki fakultet topilmadi": (
        "Кафедра с таким названием уже существует, или факультет не найден"
    ),
    "Shu nomli yoki kodli fakultet mavjud": (
        "Факультет с таким названием или кодом уже существует"
    ),
    "Shu username yoki email allaqachon mavjud": "Такой username или email уже существует",
    "Siz bu biriktirishga amaliyot rahbari emassiz": (
        "Вы не являетесь руководителем практики для этого прикрепления"
    ),
    "Siz bu biriktirishga supervizor emassiz": ("Вы не являетесь руководителем этого прикрепления"),
    "Sizda faol ariza allaqachon bor — avval uni yakunlang yoki bekor qiling": (
        "У вас уже есть активная заявка — сначала завершите или отмените её"
    ),
    "Sizdan parol almashtirish talab qilinmaydi — oddiy /me/change-password ishlatilsin": (
        "Смена пароля от вас не требуется — используйте обычный /me/change-password"
    ),
    "Skan fayli topilmadi": "Файл скана не найден",
    "Skan hali yuklanmagan": "Скан ещё не загружен",
    "Skan yuklanmagan": "Скан не загружен",
    "Skan yuklash uchun avval PDF generatsiya qiling": (
        "Перед загрузкой скана сначала сгенерируйте PDF"
    ),
    "Supervizor bu tashkilotga biriktirilmagan": ("Руководитель не прикреплён к этой организации"),
    "Supervizorga bog'langan amaliyotlar bor — is_active=false qiling.": (
        "К руководителю привязаны практики — установите is_active=false."
    ),
    "Talaba kursi aniqlanmagan (guruhi yo'q)": "Курс студента не определён (нет группы)",
    "Talaba profili topilmadi": "Профиль студента не найден",
    "Talabaning amaliyot/topshiriq yozuvlari bor — avval ularni o'chiring": (
        "У студента есть записи практики/заданий — сначала удалите их"
    ),
    "Tasdiqlangan kundalikni o'zgartirib bo'lmaydi": (
        "Нельзя изменять подтверждённую запись дневника"
    ),
    "Tasdiqlangan tahlilni o'zgartirib bo'lmaydi": ("Нельзя изменять подтверждённый анализ"),
    "Tasdiqlangan topshiriqni o'chirib bo'lmaydi": ("Нельзя удалить подтверждённое задание"),
    "Tashkilot topilmadi": "Организация не найдена",
    "Tashkilot yaratishda xatolik (takroriy qiymat)": (
        "Ошибка при создании организации (повторяющееся значение)"
    ),
    "Tashkilot/kafedra topilmadi yoki xatolik": (
        "Организация/кафедра не найдена, или произошла ошибка"
    ),
    "Tizimda kamida bitta super admin qolishi kerak": (
        "В системе должен остаться хотя бы один супер-админ"
    ),
    "Topshiriq shabloni topilmadi": "Шаблон задания не найден",
    "Topshiriq tasdiqlangan — o'zgartirish mumkin emas": (
        "Задание подтверждено — изменение невозможно"
    ),
    "Topshiriq topilmadi": "Задание не найдено",
    "Ushbu amal uchun ruxsatingiz yo'q": "У вас нет разрешения на это действие",
    "Ushbu amaliyot turiga bog'langan yozuvlar bor — is_active=false qiling": (
        "К этому типу практики привязаны записи — установите is_active=false"
    ),
    "Ushbu talaba ushbu o'quv yilida shu amaliyot turiga (Bahorgi semestr) "
    "allaqachon biriktirilgan": (
        "Этот студент уже прикреплён к этому типу практики в этом учебном году (весенний семестр)"
    ),
    "Ushbu talaba ushbu o'quv yilida shu amaliyot turiga (Kuzgi semestr) "
    "allaqachon biriktirilgan": (
        "Этот студент уже прикреплён к этому типу практики в этом учебном году (осенний семестр)"
    ),
    "Ushbu talaba ushbu o'quv yilida shu amaliyot turiga allaqachon biriktirilgan": (
        "Этот студент уже прикреплён к этому типу практики в этом учебном году"
    ),
    "User topilmadi": "Пользователь не найден",
    "Username yoki Talaba ID band": "Username или ID студента занят",
    "Yig'ma jildni olishdan oldin yakuniy hisobotni topshirib, "
    "amaliyot rahbari (supervisor) tasdiqlashi kerak": (
        "Перед получением портфолио необходимо сдать итоговый отчёт и получить "
        "подтверждение руководителя практики (supervisor)"
    ),
    "Yo'nalishga bog'langan guruhlar bor": "К направлению привязаны группы",
    "Yozuv topilmadi": "Запись не найдена",
    "end_date start_date dan oldin bo'lolmaydi": "end_date не может быть раньше start_date",
    "end_date start_date'dan oldin bo'lolmaydi": "end_date не может быть раньше start_date",
    "kind: task | journal | analysis": "kind должен быть: task | journal | analysis",
    "max_weeks min_weeks dan kichik bo'lishi mumkin emas": (
        "max_weeks не может быть меньше min_weeks"
    ),
    "organization_id yoki area_id — faqat bittasi ko'rsatilishi kerak": (
        "organization_id или area_id — укажите только одно из двух"
    ),
    # ── 2026-10 audit: yangi va qamrab olinmagan xabarlar ──────────────────
    "Bu holatdagi arizani tasdiqlab bo'lmaydi": "Заявку в этом статусе нельзя подтвердить",
    "Bu holatdagi arizani rad etib bo'lmaydi": "Заявку в этом статусе нельзя отклонить",
    "Imzolangan yoki bekor qilingan shartnomani tahrirlab bo'lmaydi": (
        "Подписанный или отменённый договор нельзя редактировать"
    ),
    "Ushbu amal faqat administratorlar uchun": "Это действие доступно только администраторам",
    "Fayl PDF, JPG yoki PNG emas": "Файл не является PDF, JPG или PNG",
    "Hujjat PDF fayli topilmadi": "PDF-файл документа не найден",
    "Fakultet topilmadi": "Факультет не найден",
    "O'zingizni super admin rolidan chiqarib yoki bloklab bo'lmaydi": (
        "Нельзя снять с себя роль супер-администратора или заблокировать себя"
    ),
    "Tizimda kamida bitta faol super admin qolishi kerak": (
        "В системе должен остаться хотя бы один активный супер-администратор"
    ),
    "Bu kun qizil deb belgilangan — ketishni qayd etib bo'lmaydi": (
        "Этот день отмечен красным — уход отметить нельзя"
    ),
    "Bugun avval kelish (check-in) qayd etilmagan": "Сегодня ещё не отмечен приход (check-in)",
    "Joylashuv (GPS) ma'lumoti kelmadi. Telefonda joylashuvni yoqing va brauzerga ruxsat bering, "
    "so'ng qayta urinib ko'ring.": (
        "Данные о местоположении (GPS) не получены. Включите геолокацию на телефоне, разрешите её "
        "браузеру и попробуйте снова."
    ),
    "Faqat arxivdagi shartnomalarni arxivdan chiqarish mumkin": (
        "Из архива можно вернуть только архивные договоры"
    ),
    "Faqat arxivlangan (EXPIRED) yoki qoralama shartnomalarni o'chirish mumkin.": (
        "Удалять можно только архивные (EXPIRED) или черновые договоры."
    ),
    "PDF generatsiya qilishda xatolik yuz berdi": "Ошибка при создании PDF",
    "Shartnoma yaratishda kutilmagan xatolik yuz berdi. Ma'lumotlarni tekshirib qayta urinib "
    "ko'ring.": (
        "Непредвиденная ошибка при создании договора. Проверьте данные и попробуйте снова."
    ),
    "Faqat administrator tasdiqni bekor qila oladi": (
        "Отменить подтверждение может только администратор"
    ),
    "Faqat amaliyot rahbari (supervisor) yoki admin tasdiqlay oladi": (
        "Подтвердить может только руководитель практики (supervisor) или администратор"
    ),
    "Faqat tasdiqlangan hisobotni bekor qilish mumkin": (
        "Отменить можно только подтверждённый отчёт"
    ),
    "Faqat arxivdagi arizalarni arxivdan chiqarish mumkin": (
        "Из архива можно вернуть только архивные заявки"
    ),
    "Faqat arxivlangan (ARCHIVED/EXPIRED) arizalarni o'chirish mumkin.": (
        "Удалять можно только архивные (ARCHIVED/EXPIRED) заявки."
    ),
    "Shartnoma fayli hali shakllantirilmagan": "Файл договора ещё не сформирован",
    "Faol yoki yakunlangan amaliyot qaydnomasini o'chirib bo'lmaydi — u bilan birga davomat, "
    "topshiriqlar va baholar ham o'chib ketadi. Arxivlang.": (
        "Нельзя удалить ведомость активной или завершённой практики — вместе с ней удалятся "
        "посещаемость, задания и оценки. Переместите её в архив."
    ),
    "Talabaning amaliyot yoki ariza tarixi bor — o'chirib bo'lmaydi. O'rniga talaba statusini "
    "o'zgartiring (bitirgan / haydalgan).": (
        "У студента есть история практики или заявок — удалить нельзя. Вместо этого измените "
        "статус студента (выпускник / отчислен)."
    ),
    "Supervizorga talabalar biriktirilgan — o'chirib bo'lmaydi. O'rniga uni faolsizlantiring "
    "(is_active = false) yoki talabalarni boshqasiga o'tkazing.": (
        "К руководителю прикреплены студенты — удалить нельзя. Деактивируйте его (is_active = "
        "false) или передайте студентов другому руководителю."
    ),
    "Amaliyot biriktiruvi bekor qilingan. Ushbu amalni bajarib bo'lmaydi.": (
        "Прикрепление к практике отменено. Это действие выполнить нельзя."
    ),
    "Faqat tasdiqlangan kundalikni bekor qilish mumkin": (
        "Отменить можно только подтверждённый дневник"
    ),
    "Faqat tasdiqlangan tahlilni bekor qilish mumkin": (
        "Отменить можно только подтверждённый анализ"
    ),
    "Faqat tasdiqlangan topshiriqni bekor qilish mumkin": (
        "Отменить можно только подтверждённое задание"
    ),
    "Tasdiqlangan dars tahlilini amaliyot rahbari o'zgartira olmaydi": (
        "Руководитель практики не может изменить подтверждённый анализ урока"
    ),
    "Tasdiqlangan kundalikni amaliyot rahbari o'zgartira olmaydi": (
        "Руководитель практики не может изменить подтверждённый дневник"
    ),
    "Tasdiqlangan topshiriqni amaliyot rahbari qayta o'zgartira olmaydi yoki bekor qila olmaydi": (
        "Руководитель практики не может повторно изменить или отменить подтверждённое задание"
    ),
    "Tasdiqlangan topshiriqni amaliyot rahbari rad eta olmaydi": (
        "Руководитель практики не может отклонить подтверждённое задание"
    ),
    "Topshiriqni tasdiqlash uchun ball kiriting": "Чтобы подтвердить задание, укажите балл",
    "Biriktirma fayli topilmadi": "Файл вложения не найден",
    "Biriktirma sizga tegishli emas": "Вложение вам не принадлежит",
    "Noto'g'ri biriktirma": "Неверное вложение",
    "Sizda boshqa fakultet talabasini ko'rish huquqi yo'q": (
        "У вас нет права просматривать студентов другого факультета"
    ),
    "Sizda boshqa fakultet talabasini tahrirlash huquqi yo'q": (
        "У вас нет права редактировать студентов другого факультета"
    ),
    "Sizda boshqa fakultet talabasini o'chirish huquqi yo'q": (
        "У вас нет права удалять студентов другого факультета"
    ),
    "Fakultetga biriktirilgan adminlar bor — avval ularning fakultetini o'zgartiring": (
        "К факультету привязаны администраторы — сначала измените их факультет"
    ),
    # ── auth.py (aniq login xatolari, parol almashtirish qulfi) ──────────────
    "Bu profil boshqa qurilmaga bog'langan. Yangi qurilmadan kirish uchun "
    "administratorga murojaat qiling (eski qurilmani o'chirishi kerak). "
    "Siz ilova ichidagi brauzerdan (masalan, Telegram) kirmoqdasiz — "
    "saytni Chrome yoki Safari'da oching.": (
        "Этот профиль привязан к другому устройству. Чтобы войти с нового устройства, "
        "обратитесь к администратору (нужно отвязать старое устройство). "
        "Вы входите через встроенный браузер приложения (например, Telegram) — "
        "откройте сайт в Chrome или Safari."
    ),
    "Bunday login topilmadi": "Такой логин не найден",
    "Qurilma aniqlanmadi. Sahifani yangilab, qayta urinib ko'ring.": (
        "Устройство не определено. Обновите страницу и попробуйте снова."
    ),
    "Parol noto'g'ri": "Неверный пароль",
    "Avval parolni o'zgartirishingiz kerak": "Сначала необходимо сменить пароль",
    "Yangi parol login bilan bir xil bo'lmasin": "Новый пароль не должен совпадать с логином",
    # ── attendance.py (to'liq boshqaruv) ─────────────────────────────────────
    "Biriktirish bekor qilingan": "Прикрепление отменено",
    "Amaliyot yakunlangan": "Практика завершена",
    "O'zgarish yo'q": "Изменений нет",
    "Biriktirish va sana kerak": "Нужны прикрепление и дата",
    "Kelish vaqti tanlangan kunga mos emas": "Время прихода не соответствует выбранному дню",
    "Ketish vaqti uchun kelish vaqti ham kerak": "Для времени ухода нужно и время прихода",
    "Ketish vaqti kelish vaqtidan oldin bo'lishi mumkin emas": (
        "Время ухода не может быть раньше времени прихода"
    ),
    "Kelish va ketish orasidagi vaqt 24 soatdan oshmasin": (
        "Между приходом и уходом не должно пройти больше 24 часов"
    ),
    "Rad etish sababini kiriting": "Укажите причину отклонения",
    "Davomat super admin tomonidan o'zgartirildi": "Посещаемость изменена супер-администратором",
}

PATTERNS: list[tuple[str, str]] = [
    # ── 2026-10 audit ────────────────────────────────────────────────────────
    (
        r"Sizda ushbu modulga kirish huquqi yo'q \((?P<perm>[a-z_]+)\)",
        "У вас нет доступа к этому модулю ({perm})",
    ),
    (
        r"Ball maksimaldan oshmasin \(max (?P<max>\d+)\)",
        "Балл не должен превышать максимум (макс. {max})",
    ),
    (
        r"Tashkilot hududidan tashqaridasiz: masofa (?P<d>\d+) m, ruxsat etilgan radius "
        r"(?P<r>\d+) m \(GPS aniqligi ±(?P<acc>\d+) m\)\. "
        r"Binoga yaqinroq borib qayta urinib ko'ring\.",
        "Вы находитесь вне территории организации: расстояние {d} м, допустимый радиус {r} м "
        "(точность GPS ±{acc} м). Подойдите ближе к зданию и попробуйте снова.",
    ),
    (
        r"Tashkilot hududidan tashqaridasiz: masofa (?P<d>\d+) m, ruxsat etilgan radius "
        r"(?P<r>\d+) m\. Binoga yaqinroq borib qayta urinib ko'ring\.",
        "Вы находитесь вне территории организации: расстояние {d} м, допустимый радиус {r} м. "
        "Подойдите ближе к зданию и попробуйте снова.",
    ),
    (
        r"Ketishni qayd etish uchun kamida 6 soat amaliyot o'tgan bo'lishi shart\. "
        r"Qolgan vaqt: (?P<rem>\d+:\d{2}) \(soat:daqiqa\)",
        "Для отметки ухода должно пройти не менее 6 часов практики. Осталось: {rem} (ч:мин)",
    ),
    (r"Qaydnoma topilmadi: (?P<id>.+)", "Ведомость не найдена: {id}"),
    # ── auth.py (brute-force himoyasi) ───────────────────────────────────────
    (
        r"Juda ko'p urinish\. (?P<minutes>\d+) daqiqadan keyin qayta urinib ko'ring",
        "Слишком много попыток. Повторите через {minutes} мин.",
    ),
    # ── attendance.py (oraliq) ───────────────────────────────────────────────
    (
        r"Oraliq amaliyot muddati bilan kesishmaydi \((?P<range>.+)\)",
        "Диапазон не пересекается со сроком практики ({range})",
    ),
    # ── academic.py (_404 helper: "{entity} topilmadi: {id}") ────────────────
    (r"Fakultet topilmadi: (?P<id>.+)", "Факультет не найден: {id}"),
    (r"Yo'nalish topilmadi: (?P<id>.+)", "Направление не найдено: {id}"),
    (r"Kafedra topilmadi: (?P<id>.+)", "Кафедра не найдена: {id}"),
    (r"Guruh topilmadi: (?P<id>.+)", "Группа не найдена: {id}"),
    (r"Akademik yil topilmadi: (?P<id>.+)", "Учебный год не найден: {id}"),
    # ── student.py ───────────────────────────────────────────────────────────
    (r"Talaba topilmadi: (?P<id>.+)", "Студент не найден: {id}"),
    (
        r"Bu Talaba ID allaqachon mavjud: (?P<hemis_id>.+)",
        "Такой ID студента уже существует: {hemis_id}",
    ),
    # ── practice_type.py / practice_assignment.py ────────────────────────────
    (r"Amaliyot turi topilmadi: (?P<id>.+)", "Тип практики не найден: {id}"),
    (r"Amaliyot turi aktiv emas: (?P<code>.+)", "Тип практики неактивен: {code}"),
    (r"Tashkilot topilmadi: (?P<id>.+)", "Организация не найдена: {id}"),
    (r"Tashkilot aktiv emas: (?P<name>.+)", "Организация неактивна: {name}"),
    (r"Hudud topilmadi: (?P<id>.+)", "Территория не найдена: {id}"),
    (r"Hudud aktiv emas: (?P<name>.+)", "Территория неактивна: {name}"),
    (r"Supervizor topilmadi: (?P<id>.+)", "Руководитель не найден: {id}"),
    (r"Supervizor aktiv emas: (?P<id>.+)", "Руководитель неактивен: {id}"),
    (
        r"'(?P<name>.+)' amaliyot turi tashkilot talab qiladi, hudud emas",
        "Тип практики '{name}' требует организацию, а не территорию",
    ),
    (
        r"'(?P<name>.+)' amaliyot turi hudud talab qiladi, tashkilot emas",
        "Тип практики '{name}' требует территорию, а не организацию",
    ),
    (
        r"Davomiylik juda qisqa: (?P<weeks>[\d.]+) hafta \(min: (?P<min>\d+)\)",
        "Длительность слишком короткая: {weeks} нед. (мин: {min})",
    ),
    (
        r"Davomiylik juda uzun: (?P<weeks>[\d.]+) hafta "
        r"\(max: (?P<max>\d+), ta'til bilan: (?P<allowed>[\d.]+)\)",
        "Длительность слишком большая: {weeks} нед. (макс: {max}, с учётом каникул: {allowed})",
    ),
    (
        r"(?P<course>\d+)-kurs '(?P<name>.+)' uchun ruxsat etilmagan \(ruxsat: (?P<allowed>.+)\)",
        "{course}-й курс не допускается к '{name}' (разрешены: {allowed})",
    ),
    (
        r"Tashkilot sig'imi to'la \((?P<current>\d+)/(?P<capacity>\d+)\)",
        "Вместимость организации заполнена ({current}/{capacity})",
    ),
    (
        r"'(?P<name>.+)' hududi sig'imi to'la \((?P<current>\d+)/(?P<capacity>\d+)\)",
        "Вместимость территории '{name}' заполнена ({current}/{capacity})",
    ),
    (
        r"Supervizor sig'imi to'la \((?P<current>\d+)/(?P<capacity>\d+)\)",
        "Вместимость руководителя заполнена ({current}/{capacity})",
    ),
    (r"Biriktirish topilmadi: (?P<id>.+)", "Прикрепление не найдено: {id}"),
    # ── contract.py / pdf.py ─────────────────────────────────────────────────
    (r"Shartnoma topilmadi: (?P<id>.+)", "Договор не найден: {id}"),
    (r"Shartnoma allaqachon (?P<status>.+)", "Договор уже {status}"),
    (
        r"Regen faqat DRAFT/GENERATED holatda \((?P<status>.+)\)",
        "Повторная генерация возможна только в статусе DRAFT/GENERATED ({status})",
    ),
    (r"PDF generatsiya xatoligi: (?P<error>.+)", "Ошибка генерации PDF: {error}"),
    (r"Biriktirishlar topilmadi: (?P<ids>.+)", "Прикрепления не найдены: {ids}"),
    (
        r"Biriktirish boshqa tashkilotga tegishli: (?P<id>.+)",
        "Прикрепление относится к другой организации: {id}",
    ),
    (
        r"Talabaning yo'nalishi aniqlanmagan: assignment=(?P<id>.+)",
        "Направление студента не определено: assignment={id}",
    ),
    (r"Template topilmadi: (?P<ref>.+)", "Шаблон не найден: {ref}"),
    # ── fayl yuklash (contracts/hemis/supervisors/uploads/contract_template) ─
    # Aniqroq variantlar oldin — umumiy "Qo'llab-quvvatlanmaydigan format" oxirida.
    (
        r"Qo'llab-quvvatlanmaydigan format: (?P<format>.+)\. \.xlsx fayl yuklang\.",
        "Неподдерживаемый формат: {format}. Загрузите файл .xlsx.",
    ),
    (
        r"Qo'llab-quvvatlanmaydigan format: (?P<format>.+)\. \.xlsx yuklang\.",
        "Неподдерживаемый формат: {format}. Загрузите .xlsx.",
    ),
    (r"Qo'llab-quvvatlanmaydigan format: (?P<format>.+)", "Неподдерживаемый формат: {format}"),
    (r"Fayl juda katta \(max (?P<max>\d+) MB\)", "Файл слишком большой (макс. {max} MB)"),
    (
        r"Fayl hajmi maksimaldan oshdi \((?P<size>\d+) KB > (?P<max>\d+) MB\)",
        "Размер файла превышает максимум ({size} KB > {max} MB)",
    ),
    (
        r"Ruxsat etilmagan fayl turi: \.(?P<ext>.+)\. Ruxsat etilgan: (?P<allowed>.+)",
        "Недопустимый тип файла: .{ext}. Разрешены: {allowed}",
    ),
    (r"Ruxsat etilmagan fayl turi: (?P<ext>.+)", "Недопустимый тип файла: {ext}"),
    (r"Noto'g'ri turi: (?P<kind>.+)", "Неверный тип: {kind}"),
    (r"DOCX o'qib bo'lmadi: (?P<error>.+)", "Не удалось прочитать DOCX: {error}"),
    # ── attendance.py ────────────────────────────────────────────────────────
    (
        r"Sana amaliyot diapazonidan tashqarida \((?P<start>.+) – (?P<end>.+)\)",
        "Дата вне диапазона практики ({start} – {end})",
    ),
    (
        r"Geo-fence tashqarisida — tashkilot hududida emassiz \(masofa: (?P<distance>\d+) m\)",
        "Вне геозоны — вы не на территории организации (расстояние: {distance} м)",
    ),
    (r"Allaqachon (?P<status>.+)", "Уже {status}"),
    # ── grading.py ───────────────────────────────────────────────────────────
    (r"Bunday mezon yo'q: (?P<key>.+)", "Такого критерия нет: {key}"),
    (
        r"'(?P<name>.+)' avtomatik hisoblanadi — qo'lda qo'yib bo'lmaydi",
        "'{name}' рассчитывается автоматически — вручную выставить нельзя",
    ),
    (
        r"Ball 0 va (?P<max>\d+) oralig'ida bo'lishi kerak",
        "Балл должен быть в диапазоне от 0 до {max}",
    ),
    (r"Avval barcha mezonlarni baholang: (?P<names>.+)", "Сначала оцените все критерии: {names}"),
    # ── task.py ──────────────────────────────────────────────────────────────
    (
        r"Bu shablonga (?P<count>\d+) ta topshiriq bog'langan — avval ularni o'chiring "
        r"yoki shablonni faqat 'is_active=false' qilib qo'ying",
        "К этому шаблону привязано {count} заданий — сначала удалите их "
        "или просто установите шаблону 'is_active=false'",
    ),
    (r"Mos kelmaydigan template: (?P<ids>.+)", "Неподходящие шаблоны: {ids}"),
    # ── practice_application.py / contract_template.py / pdf.py (ariza tizimi) ─
    (r"Preview xatosi: (?P<error>.+)", "Ошибка предпросмотра: {error}"),
    (r"«(?P<label>.+)» maydoni to'ldirilishi shart", "Поле «{label}» обязательно для заполнения"),
    (
        r"«(?P<label>.+)» uchun noto'g'ri qiymat: (?P<value>.+)",
        "Недопустимое значение для «{label}»: {value}",
    ),
    (r"Tashqi URL'lar taqiqlangan: (?P<url>.+)", "Внешние URL запрещены: {url}"),
]
