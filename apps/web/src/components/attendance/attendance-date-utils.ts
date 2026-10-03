import type { AttendanceDay, ISODate, ISODateTime } from "@/lib/api/types";

/** required_weekdays null bo'lsa — Dushanba..Shanba (ISO 1..6). */
export const DEFAULT_REQUIRED_WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5, 6];

const pad2 = (n: number) => n.toString().padStart(2, "0");

/** Local Date → YYYY-MM-DD (lokal vaqt zonasida). */
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

export function todayStr(): ISODate {
  return formatDateStr(new Date());
}

/** ISO hafta kuni: 1=Dushanba ... 7=Yakshanba. */
export function isoWeekday(s: ISODate): number {
  const js = parseDateStr(s).getDay(); // 0=Yak..6=Shan
  return js === 0 ? 7 : js;
}

export function isRequiredDay(s: ISODate, requiredWeekdays: readonly number[] | null): boolean {
  const list =
    requiredWeekdays && requiredWeekdays.length > 0 ? requiredWeekdays : DEFAULT_REQUIRED_WEEKDAYS;
  return list.includes(isoWeekday(s));
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

export type RangePreview = {
  /** Qirqilgan oraliq; kesishmasa null */
  from: ISODate | null;
  to: ISODate | null;
  /** Oraliqdagi (hafta kuni filtri bilan) nomzod kunlar */
  candidates: number;
  /** Yozuvsiz kunlar → yaratiladi */
  create: number;
  /** Mavjud yozuvlar → yangilanadi (fill rejimida faqat pending) */
  update: number;
  /** Fill rejimida allaqachon green/red bo'lgan kunlar */
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
    else if (opts.mode === "overwrite" || rec.status === "pending") update += 1;
    else skip += 1;
  }
  return { from, to, candidates, create, update, skip };
}

/** ISO datetime → <input type="datetime-local"> qiymati (lokal vaqt). */
export function toDatetimeLocal(iso: ISODateTime | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatDateStr(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** datetime-local qiymati → ISO 8601 (UTC, offset bilan ekvivalent). Bo'sh → null. */
export function fromDatetimeLocal(value: string): ISODateTime | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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
