import type { AttendanceDay, ISODate, ISODateTime } from "@/lib/api/types";

/**
 * Davomat, topshiriq va kundalik sanalari — O'zbekiston vaqti (Asia/Tashkent).
 *
 * O'zbekistonda yozgi vaqt yo'q: doimiy UTC+5. Backend ham shu siljishdan foydalanadi
 * (`UZB_TZ = timezone(timedelta(hours=5))`), shuning uchun "bugun" va soatlar brauzer
 * vaqt zonasidan qat'i nazar server bilan bir xil hisoblanadi. Formatlash Intl'ning
 * `timeZone: "UTC"` rejimida siljitilgan vaqt bilan qilinadi — IANA zona ma'lumotlari
 * bo'lmagan eski WebView'larda ham ishlaydi.
 */
export const TASHKENT_TZ = "Asia/Tashkent";
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** required_weekdays null bo'lsa — Dushanba..Shanba (ISO 1..6). */
export const DEFAULT_REQUIRED_WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5, 6];

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n: number) => n.toString().padStart(2, "0");

/** Local Date → YYYY-MM-DD (lokal vaqt zonasida). Faqat kalendar arifmetikasi uchun. */
export function formatDateStr(d: Date): ISODate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** YYYY-MM-DD → lokal Date (00:00). */
export function parseDateStr(s: ISODate): Date {
  const parts = s.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

/** YYYY-MM-DD → shu kunning UTC yarim tuni (ms). Vaqt zonasiga bog'liq bo'lmagan hisob uchun. */
function utcDayMs(s: ISODate): number {
  const parts = s.split("-").map(Number);
  return Date.UTC(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

/** Lahzani Toshkent devor soatiga siljitadi (natijani faqat getUTC* / timeZone "UTC" bilan o'qing). */
function toTashkentWallClock(value: Date | number | string): Date | null {
  const ms =
    typeof value === "number" ? value : value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms + TASHKENT_OFFSET_MS) : null;
}

/** Berilgan lahzadagi Toshkent sanasi (YYYY-MM-DD). */
export function tashkentDateStr(at: Date | number = Date.now()): ISODate {
  const wall = toTashkentWallClock(at) ?? new Date(Date.now() + TASHKENT_OFFSET_MS);
  return `${wall.getUTCFullYear()}-${pad2(wall.getUTCMonth() + 1)}-${pad2(wall.getUTCDate())}`;
}

/** Bugungi sana — Toshkent vaqti bo'yicha (server `today_uzb()` bilan bir xil). */
export function todayStr(): ISODate {
  return tashkentDateStr();
}

/**
 * Server sanasi/vaqti → Toshkent sanasi. "YYYY-MM-DD" o'zgarishsiz qaytadi; to'liq ISO vaqt
 * Toshkent kuniga o'tkaziladi (UTC'dagi sana 00:00–05:00 oralig'ida bir kun orqada bo'ladi).
 */
export function toTashkentDateStr(value: string): ISODate {
  if (DATE_ONLY_RE.test(value)) return value;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? tashkentDateStr(ms) : value.slice(0, 10);
}

/** Toshkent bo'yicha `s` kunining boshlanishi (00:00) — epoch ms. */
export function tashkentDayStartMs(s: ISODate): number {
  return utcDayMs(s) - TASHKENT_OFFSET_MS;
}

/** Toshkentdagi keyingi yarim tungacha qolgan vaqt (ms, > 0). */
export function msUntilNextTashkentMidnight(now: number = Date.now()): number {
  return tashkentDayStartMs(tashkentDateStr(now)) + DAY_MS - now;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function utcFormatter(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(opts)}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

/** ISO vaqt → Toshkent soati "HH:MM". Bo'sh/noto'g'ri → "—". */
export function formatTashkentTime(value: ISODateTime | null | undefined, locale: string): string {
  const wall = value ? toTashkentWallClock(value) : null;
  if (!wall) return "—";
  return utcFormatter(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    wall,
  );
}

/** ISO vaqt → Toshkent sana + soat. Bo'sh/noto'g'ri → "—". */
export function formatTashkentDateTime(
  value: ISODateTime | null | undefined,
  locale: string,
  opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  },
): string {
  const wall = value ? toTashkentWallClock(value) : null;
  if (!wall) return "—";
  return utcFormatter(locale, opts).format(wall);
}

/**
 * Kalendar sanasi (YYYY-MM-DD) yoki server vaqti → lokal tildagi sana matni (Toshkent kuni).
 * `new Date("YYYY-MM-DD")` UTC deb o'qiladi va g'arbiy zonalarda bir kun oldin ko'rinadi —
 * bu funksiya shu xatodan holi.
 */
export function formatTashkentDate(
  value: string | null | undefined,
  locale: string,
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" },
): string {
  if (!value) return "—";
  const day = toTashkentDateStr(value);
  if (!DATE_ONLY_RE.test(day)) return value;
  return utcFormatter(locale, opts).format(new Date(utcDayMs(day)));
}

/**
 * Faqat birinchi harfni katta qiladi. CSS `capitalize` har bir so'zni o'zgartiradi
 * ("3 Октября 2026 Г.") — sana sarlavhalari uchun shu funksiya ishlatiladi.
 */
export function capitalizeFirst(s: string, locale: string): string {
  return s ? s.charAt(0).toLocaleUpperCase(locale) + s.slice(1) : s;
}

/** Oy sarlavhasi: "Oktabr 2026" / "Октябрь 2026 г.". */
export function formatMonthLabel(year: number, month0: number, locale: string): string {
  return capitalizeFirst(
    new Date(year, month0, 1).toLocaleDateString(locale, { month: "long", year: "numeric" }),
    locale,
  );
}

/** ISO hafta kuni: 1=Dushanba ... 7=Yakshanba. */
export function isoWeekday(s: ISODate): number {
  const js = new Date(utcDayMs(s)).getUTCDay(); // 0=Yak..6=Shan
  return js === 0 ? 7 : js;
}

/** Bo'sh/null → Dush–Shan (sinxronizatsiya avto-qizil qiladigan kunlar bilan bir xil). */
export function effectiveWeekdays(requiredWeekdays: readonly number[] | null): readonly number[] {
  return requiredWeekdays && requiredWeekdays.length > 0
    ? requiredWeekdays
    : DEFAULT_REQUIRED_WEEKDAYS;
}

export function isRequiredDay(s: ISODate, requiredWeekdays: readonly number[] | null): boolean {
  return effectiveWeekdays(requiredWeekdays).includes(isoWeekday(s));
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return formatDateStr(d);
}

/** Lug'at tartibida YYYY-MM-DD solishtirish to'g'ri ishlaydi. */
export function clampDateStr(s: ISODate, min: ISODate, max: ISODate): ISODate {
  if (s < min) return min;
  if (s > max) return max;
  return s;
}

export function monthStartStr(year: number, month0: number): ISODate {
  return formatDateStr(new Date(year, month0, 1));
}

export function monthEndStr(year: number, month0: number): ISODate {
  return formatDateStr(new Date(year, month0 + 1, 0));
}

/** [from, to] inklyuziv oraliqdagi barcha kunlar (from > to bo'lsa bo'sh). */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  if (from > to) return out;
  let cur = from;
  // Himoya: 5 yildan uzun oraliq kutilmaydi
  for (let i = 0; i < 2000 && cur <= to; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/**
 * [from, to] oralig'idagi talab qilingan kunlar soni — backend `expected_days` bilan bir xil
 * (to'liq haftalar × kunlar soni + qoldiq kunlar).
 */
export function countRequiredDays(
  from: ISODate,
  to: ISODate,
  requiredWeekdays: readonly number[] | null,
): number {
  if (from > to) return 0;
  const wanted = new Set(effectiveWeekdays(requiredWeekdays));
  const total = Math.round((utcDayMs(to) - utcDayMs(from)) / DAY_MS) + 1;
  const fullWeeks = Math.floor(total / 7);
  let count = fullWeeks * wanted.size;
  const firstOfRemainder = utcDayMs(from) + fullWeeks * 7 * DAY_MS;
  for (let i = 0; i < total % 7; i++) {
    const js = new Date(firstOfRemainder + i * DAY_MS).getUTCDay();
    if (wanted.has(js === 0 ? 7 : js)) count += 1;
  }
  return count;
}

/** Python `round()` kabi (yarimni juftga) — server foizi bilan bir xil natija uchun. */
function roundHalfEven(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

export type AttendanceStatsToDate = {
  /**
   * Boshlanishdan min(bugun, tugash) gacha talab qilingan kunlar. Hafta kunlari belgilanmagan
   * (eski/import qilingan) biriktirishda server ham kutilgan kunni hisoblamaydi → null ("—").
   */
  expected: number | null;
  /** Foiz maxraji: `expected`, kunlar belgilanmagan bo'lsa — bugungacha yozuvlar soni (server kabi) */
  denominator: number;
  /** Bugungacha (bugun ham) yashil kunlar */
  green: number;
  red: number;
  pending: number;
  /** Oldindan tasdiqlangan kelajak kunlari — foizga kirmaydi */
  futureGreen: number;
  /** 0..100; amaliyot hali boshlanmagan bo'lsa null */
  percent: number | null;
};

/**
 * Davomat foizi — server formulasi: bugungacha yashil kunlar ÷ bugungacha kutilgan
 * (talab qilingan hafta kunlari) kunlar, 100 dan oshmaydi.
 */
export function attendanceStatsToDate(opts: {
  days: readonly AttendanceDay[];
  rangeStart: ISODate;
  rangeEnd: ISODate;
  requiredWeekdays: readonly number[] | null;
  today: ISODate;
}): AttendanceStatsToDate {
  const upto = opts.today < opts.rangeEnd ? opts.today : opts.rangeEnd;
  const hasWeekdays = !!opts.requiredWeekdays && opts.requiredWeekdays.length > 0;
  const expected = hasWeekdays
    ? countRequiredDays(opts.rangeStart, upto, opts.requiredWeekdays)
    : null;
  let green = 0;
  let red = 0;
  let pending = 0;
  let futureGreen = 0;
  for (const d of opts.days) {
    if (d.date > opts.today) {
      if (d.status === "green") futureGreen += 1;
      continue;
    }
    if (d.status === "green") green += 1;
    else if (d.status === "red") red += 1;
    else pending += 1;
  }
  // Server `compute_percent`: kunlar belgilanmagan bo'lsa maxraj — bugungacha mavjud yozuvlar
  const denominator = expected ?? green + red + pending;
  const percent =
    denominator > 0 ? Math.min(100, roundHalfEven((green / denominator) * 100)) : null;
  return { expected, denominator, green, red, pending, futureGreen, percent };
}

export type RangePreview = {
  /** Qirqilgan oraliq; kesishmasa null */
  from: ISODate | null;
  to: ISODate | null;
  /** Oraliqdagi (hafta kuni filtri bilan) nomzod kunlar */
  candidates: number;
  /** Yozuvsiz kunlar → yaratiladi */
  create: number;
  /** Mavjud yozuvlar → yangilanadi (fill rejimida faqat kutilayotgan va avto-qizil) */
  update: number;
  /** Allaqachon shu holatdagi yoki fill rejimida tegilmaydigan kunlar */
  skip: number;
};

/**
 * Oraliqni belgilash natijasini klient tomonda oldindan hisoblash.
 * `daysByDate` berilmasa create/update ajratilmaydi — barchasi `candidates` da.
 */
export function previewRange(opts: {
  dateFrom: ISODate;
  dateTo: ISODate;
  rangeStart: ISODate;
  rangeEnd: ISODate;
  requiredWeekdays: readonly number[] | null;
  onlyRequiredWeekdays: boolean;
  mode: "fill" | "overwrite";
  /** Qo'yiladigan holat — allaqachon shu holatdagi kun o'tkazib yuboriladi (server kabi) */
  status: "green" | "red";
  daysByDate?: ReadonlyMap<ISODate, AttendanceDay>;
}): RangePreview {
  const from = opts.dateFrom > opts.rangeStart ? opts.dateFrom : opts.rangeStart;
  const to = opts.dateTo < opts.rangeEnd ? opts.dateTo : opts.rangeEnd;
  if (!opts.dateFrom || !opts.dateTo || from > to) {
    return { from: null, to: null, candidates: 0, create: 0, update: 0, skip: 0 };
  }
  let candidates = 0;
  let create = 0;
  let update = 0;
  let skip = 0;
  for (const day of eachDay(from, to)) {
    if (opts.onlyRequiredWeekdays && !isRequiredDay(day, opts.requiredWeekdays)) continue;
    candidates += 1;
    if (!opts.daysByDate) continue;
    const rec = opts.daysByDate.get(day);
    if (!rec) create += 1;
    else if (rec.status === opts.status) skip += 1;
    // Server `super_admin_set_range`: fill rejimi faqat kutilayotgan va avto-qizil
    // (kelmagan, check-in'siz) kunlarni o'zgartiradi
    else if (
      opts.mode === "overwrite" ||
      rec.status === "pending" ||
      (rec.status === "red" && !rec.check_in_at)
    )
      update += 1;
    else skip += 1;
  }
  return { from, to, candidates, create, update, skip };
}

/** ISO datetime → <input type="datetime-local"> qiymati (Toshkent devor soati). */
export function toDatetimeLocal(iso: ISODateTime | null | undefined): string {
  const wall = iso ? toTashkentWallClock(iso) : null;
  if (!wall) return "";
  return (
    `${wall.getUTCFullYear()}-${pad2(wall.getUTCMonth() + 1)}-${pad2(wall.getUTCDate())}` +
    `T${pad2(wall.getUTCHours())}:${pad2(wall.getUTCMinutes())}`
  );
}

/** datetime-local qiymati (Toshkent devor soati) → ISO 8601 (UTC). Bo'sh/noto'g'ri → null. */
export function fromDatetimeLocal(value: string): ISODateTime | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const ms =
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) -
    TASHKENT_OFFSET_MS;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Oy navigatsiyasi uchun: sana qaysi (yil, oy0) ga tegishli. */
export function monthOf(s: ISODate): { year: number; month: number } {
  const d = parseDateStr(s);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export type MonthGridCell = {
  date: ISODate;
  dayNumber: number;
  inMonth: boolean;
  record: AttendanceDay | null;
  isRequired: boolean;
  isToday: boolean;
  inRange: boolean;
  isFuture: boolean;
};

/** Oy taqvimi katakchalari — Dushanbadan boshlanadi, to'liq haftalar (35/42 katak). */
export function buildMonthCells(opts: {
  year: number;
  month: number;
  daysByDate: ReadonlyMap<ISODate, AttendanceDay>;
  rangeStart: ISODate;
  rangeEnd: ISODate;
  requiredWeekdays: readonly number[] | null;
  today: ISODate;
}): MonthGridCell[] {
  const { year, month } = opts;
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Dushanba birinchi ustun: (getDay()+6)%7 → Dush=0 ... Yak=6
  const lead = (first.getDay() + 6) % 7;
  const cells: MonthGridCell[] = [];

  const push = (d: Date, inMonth: boolean) => {
    const date = formatDateStr(d);
    cells.push({
      date,
      dayNumber: d.getDate(),
      inMonth,
      record: opts.daysByDate.get(date) ?? null,
      isRequired: isRequiredDay(date, opts.requiredWeekdays),
      isToday: date === opts.today,
      inRange: date >= opts.rangeStart && date <= opts.rangeEnd,
      isFuture: date > opts.today,
    });
  };

  for (let i = lead; i > 0; i--) push(new Date(year, month, 1 - i), false);
  for (let d = 1; d <= daysInMonth; d++) push(new Date(year, month, d), true);
  const tail = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= tail; i++) push(new Date(year, month + 1, i), false);
  return cells;
}

export function compareMonth(
  a: { year: number; month: number },
  b: { year: number; month: number },
): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}
