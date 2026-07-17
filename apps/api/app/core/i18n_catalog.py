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
    "Faqat Super Admin tasdiqlay oladi": "Подтверждать может только супер-админ",
    "Faqat o'tgan kunlar uchun qizilga belgilash mumkin": (
        "Отмечать красным можно только прошедшие дни"
    ),
    "Faqat rasm fayllari (jpg, png, webp)": "Только файлы изображений (jpg, png, webp)",
    "Faqat talaba amal qiladi": "Действие доступно только студенту",
    "Faqat talaba hisobot topshira oladi": "Сдавать отчёт может только студент",
    "Fayl bo'sh": "Файл пуст",
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
    "Refresh cookie topilmadi": "Refresh cookie не найден",
    "Refresh token yaroqsiz": "Refresh token недействителен",
    "Rolni faqat admin/super_admin oralig'ida o'zgartirish mumkin": (
        "Роль можно менять только в пределах admin/super_admin"
    ),
    "Ruxsat yo'q": "Нет доступа",
    "Sana amaliyot diapazonidan tashqarida": "Дата вне диапазона практики",
    "Shablon fayli yo'q": "Файл шаблона отсутствует",
    "Shablon topilmadi": "Шаблон не найден",
    "Shartnoma fayli hali yo'q": "Файл договора ещё отсутствует",
    "Shartnoma topilmadi": "Договор не найден",
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
    "Siz bu biriktirishga supervizor emassiz": (
        "Вы не являетесь руководителем этого прикрепления"
    ),
    "Sizdan parol almashtirish talab qilinmaydi — oddiy /me/change-password ishlatilsin": (
        "Смена пароля от вас не требуется — используйте обычный /me/change-password"
    ),
    "Skan fayli topilmadi": "Файл скана не найден",
    "Skan yuklanmagan": "Скан не загружен",
    "Skan yuklash uchun avval PDF generatsiya qiling": (
        "Перед загрузкой скана сначала сгенерируйте PDF"
    ),
    "Supervizor bu tashkilotga biriktirilmagan": (
        "Руководитель не прикреплён к этой организации"
    ),
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
    "Tasdiqlangan tahlilni o'zgartirib bo'lmaydi": (
        "Нельзя изменять подтверждённый анализ"
    ),
    "Tasdiqlangan topshiriqni o'chirib bo'lmaydi": (
        "Нельзя удалить подтверждённое задание"
    ),
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
        "Этот студент уже прикреплён к этому типу практики в этом учебном году "
        "(весенний семестр)"
    ),
    "Ushbu talaba ushbu o'quv yilida shu amaliyot turiga (Kuzgi semestr) "
    "allaqachon biriktirilgan": (
        "Этот студент уже прикреплён к этому типу практики в этом учебном году "
        "(осенний семестр)"
    ),
    "Ushbu talaba ushbu o'quv yilida shu amaliyot turiga allaqachon biriktirilgan": (
        "Этот студент уже прикреплён к этому типу практики в этом учебном году"
    ),
    "User topilmadi": "Пользователь не найден",
    "Username yoki Talaba ID band": "Username или ID студента занят",
    "Yig'ma jildni olishdan oldin yakuniy hisobotni topshirib, "
    "kafedra mudiri tasdiqlashi kerak": (
        "Перед получением портфолио необходимо сдать итоговый отчёт и получить "
        "подтверждение заведующего кафедрой"
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
}

PATTERNS: list[tuple[str, str]] = [
    # ── academic.py (_404 helper: "{entity} topilmadi: {id}") ────────────────
    (r"Fakultet topilmadi: (?P<id>.+)", "Факультет не найден: {id}"),
    (r"Yo'nalish topilmadi: (?P<id>.+)", "Направление не найдено: {id}"),
    (r"Kafedra topilmadi: (?P<id>.+)", "Кафедра не найдена: {id}"),
    (r"Guruh topilmadi: (?P<id>.+)", "Группа не найдена: {id}"),
    (r"Akademik yil topilmadi: (?P<id>.+)", "Учебный год не найден: {id}"),
    # ── student.py ───────────────────────────────────────────────────────────
    (r"Talaba topilmadi: (?P<id>.+)", "Студент не найден: {id}"),
    (r"Bu Talaba ID allaqachon mavjud: (?P<hemis_id>.+)",
     "Такой ID студента уже существует: {hemis_id}"),
    # ── practice_type.py / practice_assignment.py ────────────────────────────
    (r"Amaliyot turi topilmadi: (?P<id>.+)", "Тип практики не найден: {id}"),
    (r"Amaliyot turi aktiv emas: (?P<code>.+)", "Тип практики неактивен: {code}"),
    (r"Tashkilot topilmadi: (?P<id>.+)", "Организация не найдена: {id}"),
    (r"Tashkilot aktiv emas: (?P<name>.+)", "Организация неактивна: {name}"),
    (r"Hudud topilmadi: (?P<id>.+)", "Территория не найдена: {id}"),
    (r"Hudud aktiv emas: (?P<name>.+)", "Территория неактивна: {name}"),
    (r"Supervizor topilmadi: (?P<id>.+)", "Руководитель не найден: {id}"),
    (r"Supervizor aktiv emas: (?P<id>.+)", "Руководитель неактивен: {id}"),
    (r"'(?P<name>.+)' amaliyot turi tashkilot talab qiladi, hudud emas",
     "Тип практики '{name}' требует организацию, а не территорию"),
    (r"'(?P<name>.+)' amaliyot turi hudud talab qiladi, tashkilot emas",
     "Тип практики '{name}' требует территорию, а не организацию"),
    (r"Davomiylik juda qisqa: (?P<weeks>[\d.]+) hafta \(min: (?P<min>\d+)\)",
     "Длительность слишком короткая: {weeks} нед. (мин: {min})"),
    (r"Davomiylik juda uzun: (?P<weeks>[\d.]+) hafta "
     r"\(max: (?P<max>\d+), ta'til bilan: (?P<allowed>[\d.]+)\)",
     "Длительность слишком большая: {weeks} нед. (макс: {max}, с учётом каникул: {allowed})"),
    (r"(?P<course>\d+)-kurs '(?P<name>.+)' uchun ruxsat etilmagan \(ruxsat: (?P<allowed>.+)\)",
     "{course}-й курс не допускается к '{name}' (разрешены: {allowed})"),
    (r"Tashkilot sig'imi to'la \((?P<current>\d+)/(?P<capacity>\d+)\)",
     "Вместимость организации заполнена ({current}/{capacity})"),
    (r"'(?P<name>.+)' hududi sig'imi to'la \((?P<current>\d+)/(?P<capacity>\d+)\)",
     "Вместимость территории '{name}' заполнена ({current}/{capacity})"),
    (r"Supervizor sig'imi to'la \((?P<current>\d+)/(?P<capacity>\d+)\)",
     "Вместимость руководителя заполнена ({current}/{capacity})"),
    (r"Biriktirish topilmadi: (?P<id>.+)", "Прикрепление не найдено: {id}"),
    # ── contract.py / pdf.py ─────────────────────────────────────────────────
    (r"Shartnoma topilmadi: (?P<id>.+)", "Договор не найден: {id}"),
    (r"Shartnoma allaqachon (?P<status>.+)", "Договор уже {status}"),
    (r"Regen faqat DRAFT/GENERATED holatda \((?P<status>.+)\)",
     "Повторная генерация возможна только в статусе DRAFT/GENERATED ({status})"),
    (r"PDF generatsiya xatoligi: (?P<error>.+)", "Ошибка генерации PDF: {error}"),
    (r"Biriktirishlar topilmadi: (?P<ids>.+)", "Прикрепления не найдены: {ids}"),
    (r"Biriktirish boshqa tashkilotga tegishli: (?P<id>.+)",
     "Прикрепление относится к другой организации: {id}"),
    (r"Talabaning yo'nalishi aniqlanmagan: assignment=(?P<id>.+)",
     "Направление студента не определено: assignment={id}"),
    (r"Template topilmadi: (?P<ref>.+)", "Шаблон не найден: {ref}"),
    # ── fayl yuklash (contracts/hemis/supervisors/uploads/contract_template) ─
    # Aniqroq variantlar oldin — umumiy "Qo'llab-quvvatlanmaydigan format" oxirida.
    (r"Qo'llab-quvvatlanmaydigan format: (?P<format>.+)\. \.xlsx fayl yuklang\.",
     "Неподдерживаемый формат: {format}. Загрузите файл .xlsx."),
    (r"Qo'llab-quvvatlanmaydigan format: (?P<format>.+)\. \.xlsx yuklang\.",
     "Неподдерживаемый формат: {format}. Загрузите .xlsx."),
    (r"Qo'llab-quvvatlanmaydigan format: (?P<format>.+)",
     "Неподдерживаемый формат: {format}"),
    (r"Fayl juda katta \(max (?P<max>\d+) MB\)", "Файл слишком большой (макс. {max} MB)"),
    (r"Fayl hajmi maksimaldan oshdi \((?P<size>\d+) KB > (?P<max>\d+) MB\)",
     "Размер файла превышает максимум ({size} KB > {max} MB)"),
    (r"Ruxsat etilmagan fayl turi: \.(?P<ext>.+)\. Ruxsat etilgan: (?P<allowed>.+)",
     "Недопустимый тип файла: .{ext}. Разрешены: {allowed}"),
    (r"Ruxsat etilmagan fayl turi: (?P<ext>.+)", "Недопустимый тип файла: {ext}"),
    (r"Noto'g'ri turi: (?P<kind>.+)", "Неверный тип: {kind}"),
    (r"DOCX o'qib bo'lmadi: (?P<error>.+)", "Не удалось прочитать DOCX: {error}"),
    # ── attendance.py ────────────────────────────────────────────────────────
    (r"Sana amaliyot diapazonidan tashqarida \((?P<start>.+) – (?P<end>.+)\)",
     "Дата вне диапазона практики ({start} – {end})"),
    (r"Geo-fence tashqarisida — tashkilot hududida emassiz \(masofa: (?P<distance>\d+) m\)",
     "Вне геозоны — вы не на территории организации (расстояние: {distance} м)"),
    (r"Allaqachon (?P<status>.+)", "Уже {status}"),
    # ── grading.py ───────────────────────────────────────────────────────────
    (r"Bunday mezon yo'q: (?P<key>.+)", "Такого критерия нет: {key}"),
    (r"'(?P<name>.+)' avtomatik hisoblanadi — qo'lda qo'yib bo'lmaydi",
     "'{name}' рассчитывается автоматически — вручную выставить нельзя"),
    (r"Ball 0 va (?P<max>\d+) oralig'ida bo'lishi kerak",
     "Балл должен быть в диапазоне от 0 до {max}"),
    (r"Avval barcha mezonlarni baholang: (?P<names>.+)",
     "Сначала оцените все критерии: {names}"),
    # ── task.py ──────────────────────────────────────────────────────────────
    (r"Bu shablonga (?P<count>\d+) ta topshiriq bog'langan — avval ularni o'chiring "
     r"yoki shablonni faqat 'is_active=false' qilib qo'ying",
     "К этому шаблону привязано {count} заданий — сначала удалите их "
     "или просто установите шаблону 'is_active=false'"),
    (r"Mos kelmaydigan template: (?P<ids>.+)", "Неподходящие шаблоны: {ids}"),
]
