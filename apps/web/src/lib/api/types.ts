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

export type AssignmentStatus = "draft" | "active" | "completed" | "cancelled";

export type ContractStatus = "draft" | "generated" | "active" | "expired" | "revoked";

export type ContractTemplate =
  | "4_plus_2"
  | "pedagogical"
  | "qualifying"
  | "internship_production"
  | "partnership";

export type OrganizationKind =
  | "school"
  | "mtt"
  | "lyceum"
  | "college"
  | "company"
  | "university"
  | "other";

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

// ─── Organization ─────────────────────────────────────────
export type Organization = {
  id: UUID;
  name: string;
  legal_name: string | null;
  kind: OrganizationKind;
  director_full_name: string;
  director_position: string | null;
  region: string;
  district: string | null;
  address_line: string;
  phone: string;
  email: string | null;
  website: string | null;
  fax: string | null;
  inn: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_correspondent: string | null;
  bank_mfo: string | null;
  capacity: number;
  work_days: number[];
  work_hours: Record<string, unknown>;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_m: number;
  wifi_ssids: string[];
  notes: string | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type OrganizationCreate = Omit<Organization, "id" | "created_at" | "updated_at">;

// ─── Area ─────────────────────────────────────────────────
export type Area = {
  id: UUID;
  name: string;
  description: string | null;
  region: string;
  district: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_bounds: Record<string, unknown> | null;
  capacity: number;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type AreaCreate = Omit<Area, "id" | "created_at" | "updated_at">;

// ─── Supervisor ───────────────────────────────────────────
export type Supervisor = {
  id: UUID;
  user_id: UUID;
  username: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: ISODateTime | null;
  position: string;
  specialty: string | null;
  experience_years: number | null;
  capacity: number;
  rating: number;
  organization_id: UUID | null;
  organization_name: string | null;
  created_at: ISODateTime;
};

export type SupervisorCreate = {
  username: string;
  password: string;
  email?: string | null;
  phone?: string | null;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  position: string;
  specialty?: string | null;
  experience_years?: number | null;
  organization_id?: UUID | null;
  capacity: number;
};

// ─── Practice Assignment ──────────────────────────────────
export type PracticeAssignment = {
  id: UUID;
  student_id: UUID;
  student_full_name: string;
  student_hemis_id: string;
  student_group_name: string | null;
  student_course: number | null;
  practice_type_id: UUID;
  practice_type_code: string;
  practice_type_name: string;
  requires_contract: boolean;
  academic_year_id: UUID;
  academic_year_name: string;
  organization_id: UUID | null;
  organization_name: string | null;
  area_id: UUID | null;
  area_name: string | null;
  supervisor_id: UUID | null;
  supervisor_full_name: string | null;
  start_date: ISODate;
  end_date: ISODate;
  status: AssignmentStatus;
  final_grade: number | null;
  credit_earned: boolean;
  cancelled_reason: string | null;
  cancelled_at: ISODateTime | null;
  notes: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type PracticeAssignmentCreate = {
  student_id: UUID;
  practice_type_id: UUID;
  academic_year_id: UUID;
  organization_id?: UUID | null;
  area_id?: UUID | null;
  supervisor_id?: UUID | null;
  start_date: ISODate;
  end_date: ISODate;
  notes?: string | null;
};

export type PracticeAssignmentBulkCreate = Omit<PracticeAssignmentCreate, "student_id"> & {
  student_ids: UUID[];
};

export type BulkAssignmentError = {
  student_id: UUID;
  error: string;
};

export type BulkAssignmentResult = {
  requested: number;
  created: number;
  failed: BulkAssignmentError[];
  assignment_ids: UUID[];
};

// ─── Contracts ────────────────────────────────────────────
export type ContractStudent = {
  assignment_id?: string | null;
  hemis_id: string;
  full_name: string;
  direction_code: string;
  direction_name: string;
  course: number;
  group_name: string | null;
  start_date: string;
  end_date: string;
};

export type Contract = {
  id: UUID;
  number: string;
  template_ref: ContractTemplate;
  status: ContractStatus;
  organization_id: UUID;
  organization_name: string;
  academic_year_id: UUID;
  academic_year_name: string;
  practice_type_id: UUID;
  practice_type_name: string;
  students: ContractStudent[];
  students_count: number;
  start_date: ISODate;
  end_date: ISODate;
  pdf_path: string | null;
  scan_path: string | null;
  qr_token: string;
  generated_at: ISODateTime | null;
  signed_at_org: ISODateTime | null;
  revoked_reason: string | null;
  revoked_at: ISODateTime | null;
  created_by_id: UUID;
  created_by_name: string | null;
  notes: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type ContractCreate = {
  template_ref: ContractTemplate;
  organization_id: UUID;
  academic_year_id: UUID;
  practice_type_id: UUID;
  assignment_ids: UUID[];
  start_date: ISODate;
  end_date: ISODate;
  notes?: string | null;
};

export type ContractVerifyResponse = {
  number: string;
  template_ref: ContractTemplate;
  status: ContractStatus;
  organization_name: string;
  practice_type_name: string;
  start_date: ISODate;
  end_date: ISODate;
  students_count: number;
  generated_at: ISODateTime | null;
  signed_at_org: ISODateTime | null;
  revoked_reason: string | null;
  revoked_at: ISODateTime | null;
  is_valid: boolean;
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
