/**
 * Backend Pydantic schemalariga mos TypeScript tiplari.
 *
 * Kelajakda `openapi-typescript` bilan avtomatik generatsiya qilamiz.
 * Hozircha qo'lda — bizda kamroq model bor.
 */

export type UUID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // ISO 8601

export type UserRole = "super_admin" | "admin" | "supervisor" | "student";

export type Gender = "male" | "female";

export type EducationForm = "daytime" | "evening" | "correspondence" | "distance";

export type DegreeType = "bachelor" | "master" | "phd";

export type StudentStatus = "studying" | "graduated" | "expelled" | "academic_leave";

export type ObjectKind = "organization" | "area" | "any";

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

// ─── Academic ────────────────────────────────────────────
export type Faculty = {
  id: UUID;
  name: string;
  code: string | null;
  created_at: ISODateTime;
};

export type FacultyCreate = {
  name: string;
  code?: string | null;
};

export type Direction = {
  id: UUID;
  faculty_id: UUID;
  code: string;
  name: string;
  created_at: ISODateTime;
};

export type DirectionCreate = {
  faculty_id: UUID;
  code: string;
  name: string;
};

export type AcademicYear = {
  id: UUID;
  name: string;
  start_date: ISODate;
  end_date: ISODate;
  is_active: boolean;
  created_at: ISODateTime;
};

export type AcademicYearCreate = {
  name: string;
  start_date: ISODate;
  end_date: ISODate;
  is_active: boolean;
};

export type Group = {
  id: UUID;
  direction_id: UUID;
  academic_year_id: UUID;
  name: string;
  course: number;
  created_at: ISODateTime;
};

export type GroupCreate = {
  direction_id: UUID;
  academic_year_id: UUID;
  name: string;
  course: number;
};

// ─── Student ─────────────────────────────────────────────
export type Student = {
  id: UUID;
  user_id: UUID;
  hemis_id: string;
  username: string;

  first_name: string;
  last_name: string;
  middle_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: ISODateTime | null;

  gender: Gender | null;
  birth_date: ISODate | null;

  jshshir: string | null;
  passport_number: string | null;

  region: string | null;
  district: string | null;

  group_id: UUID | null;
  group_name: string | null;
  direction_id: UUID | null;
  direction_code: string | null;
  direction_name: string | null;
  faculty_id: UUID | null;
  faculty_name: string | null;
  course: number | null;
  current_semester: number | null;
  is_graduating: boolean;
  enrollment_year: number | null;

  education_language: string | null;
  education_form: EducationForm | null;
  degree_type: DegreeType | null;

  status: StudentStatus;
  created_at: ISODateTime;
};

// ─── Practice Types ──────────────────────────────────────
export type GradingCriterion = {
  key: string;
  name: string;
  max: number;
  grader: string; // "system" | "supervisor" | "organization" | "department_head"
};

export type GradingRules = {
  min_total: number;
  criteria: GradingCriterion[];
};

export type PracticeType = {
  id: UUID;
  code: string;
  name: string;
  description: string | null;
  requires_contract: boolean;
  contract_template_ref: string | null;
  object_kind: ObjectKind;
  min_weeks: number;
  max_weeks: number;
  days_per_week: number | null;
  hours_per_day: number | null;
  allowed_courses: number[];
  grading_rules: GradingRules;
  syllabus_md: string | null;
  is_active: boolean;
  display_order: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

// ─── HEMIS Import ────────────────────────────────────────
export type HemisImportError = {
  row: number;
  hemis_id: string | null;
  message: string;
};

export type HemisCredentials = {
  hemis_id: string;
  full_name: string;
  username: string;
  password: string;
};

export type HemisImportResponse = {
  total_rows: number;
  created: number;
  skipped: number;
  errors: HemisImportError[];
  credentials: HemisCredentials[];
};
