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

export type Department = {
  id: UUID;
  faculty_id: UUID;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: ISODateTime;
};

export type DepartmentCreate = {
  faculty_id: UUID;
  name: string;
  code?: string | null;
  is_active?: boolean;
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

  device_id: string | null;
  device_label: string | null;
  device_bound_at: ISODateTime | null;

  gender: Gender | null;

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
export type OrganizationRef = { id: UUID; name: string };

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
  faculty_id: UUID | null;
  faculty_name: string | null;
  department_id: UUID | null;
  department_name: string | null;
  organizations: OrganizationRef[];
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
  faculty_id?: UUID | null;
  department_id?: UUID | null;
  organization_ids?: UUID[];
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
  /** 4+2 kabi yillik amaliyotlarda kuzgi/bahorgi baho alohida; qisqa amaliyotlarda null */
  semester: Semester | null;
  /** ISO hafta kunlari: 1=Dushanba ... 7=Yakshanba — davomat foizi maxraji */
  required_weekdays: number[] | null;
  status: AssignmentStatus;
  final_grade: number | null;
  credit_earned: boolean;
  /** Qo'lda baholanadigan mezonlar: {mezon_key: ball} */
  criteria_scores: Record<string, number>;
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
  semester?: Semester | null;
  required_weekdays?: number[] | null;
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

// ─── System Settings ─────────────────────────────────────
export type SystemSettings = {
  id: UUID;
  site_name: string;
  site_description: string | null;
  max_file_size_mb: number;
  allowed_file_types: string[];
  email_notifications_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  extra: Record<string, unknown>;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type SystemSettingsPublic = {
  site_name: string;
  site_description: string | null;
  maintenance_mode: boolean;
  maintenance_message: string | null;
};

export type SystemSettingsUpdate = Partial<{
  site_name: string;
  site_description: string | null;
  max_file_size_mb: number;
  allowed_file_types: string[];
  email_notifications_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string | null;
}>;

// ─── Admins (admin + super_admin users) ──────────────────
export type Admin = {
  id: UUID;
  username: string;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  full_name: string;
  role: "admin" | "super_admin";
  is_active: boolean;
  last_login_at: ISODateTime | null;
  created_at: ISODateTime;
};

export type AdminCreate = {
  username: string;
  password: string;
  email?: string | null;
  phone?: string | null;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  role?: "admin" | "super_admin";
};

export type AdminUpdate = {
  email?: string | null;
  phone?: string | null;
  first_name?: string;
  last_name?: string;
  middle_name?: string | null;
  role?: "admin" | "super_admin";
  is_active?: boolean;
};

// ─── Notifications ───────────────────────────────────────
export type NotificationType =
  | "task_approved"
  | "task_rejected"
  | "journal_approved"
  | "journal_rejected"
  | "analysis_approved"
  | "analysis_rejected"
  | "attendance_rejected"
  | "attendance_override"
  | "contract_generated"
  | "contract_activated"
  | "generic";

export type Notification = {
  id: UUID;
  user_id: UUID;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: ISODateTime | null;
  created_at: ISODateTime;
};

export type NotificationUnreadCount = { unread: number };

// ─── Tasks / Journal / LessonAnalysis ────────────────────
export type Semester = "fall" | "spring";

export type TaskCategory = "spiritual" | "academic" | "report";

export type TaskType =
  | "essay"
  | "event_scenario"
  | "event_participation"
  | "analytical_note"
  | "plan"
  | "protocol"
  | "presentation"
  | "open_lesson"
  | "test_lesson"
  | "lesson_analysis_batch"
  | "interactive_pack"
  | "other";

export type TaskStatus = "not_started" | "submitted" | "approved" | "rejected";

export type JournalStatus = "draft" | "submitted" | "approved" | "rejected";

export type TaskTemplate = {
  id: UUID;
  practice_type_id: UUID;
  course: number;
  semester: Semester;
  category: TaskCategory;
  type: TaskType;
  title: string;
  description: string | null;
  points: number;
  quantity: number;
  month_hint: string | null;
  display_order: number;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type TaskAttachment = {
  path: string;
  name: string;
  mime?: string;
  size?: number;
  id?: string;
  uploaded_at?: string;
  uploaded_by_id?: string;
};

export type Task = {
  id: UUID;
  assignment_id: UUID;
  template_id: UUID;
  template_title: string;
  template_type: TaskType;
  template_category: TaskCategory;
  template_course: number;
  template_semester: Semester;
  template_points: number;
  template_quantity: number;
  template_month_hint: string | null;
  template_description: string | null;
  status: TaskStatus;
  submission_md: string | null;
  attachments: TaskAttachment[];
  due_date: string | null;
  is_overdue: boolean;
  notes: string | null;
  submitted_at: ISODateTime | null;
  points_earned: number | null;
  graded_by_id: UUID | null;
  graded_by_name: string | null;
  graded_at: ISODateTime | null;
  rejection_reason: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type JournalEntry = {
  id: UUID;
  assignment_id: UUID;
  date: ISODateTime;
  content_md: string | null;
  attachments: TaskAttachment[];
  status: JournalStatus;
  approved_by_id: UUID | null;
  approved_by_name: string | null;
  approved_at: ISODateTime | null;
  rejection_reason: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type LessonAnalysis = {
  id: UUID;
  assignment_id: UUID;
  date: ISODateTime;
  subject: string;
  teacher_name: string;
  grade_level: string | null;
  quarter: number;
  analysis_md: string | null;
  attachments: TaskAttachment[];
  status: JournalStatus;
  approved_by_id: UUID | null;
  approved_by_name: string | null;
  approved_at: ISODateTime | null;
  rejection_reason: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type AssignmentProgress = {
  assignment_id: UUID;
  tasks_total: number;
  tasks_by_status: Record<TaskStatus, number>;
  tasks_max_points: number;
  tasks_earned_points: number;
  journal_by_status: Record<JournalStatus, number>;
  analysis_by_status: Record<JournalStatus, number>;
};

export type TaskSubmitRequest = {
  submission_md: string;
  attachments?: TaskAttachment[];
};

export type TaskGradeRequest = {
  points_earned?: number | null;
};

export type TaskRejectRequest = {
  rejection_reason: string;
};

export type JournalCreateRequest = {
  date: ISODateTime;
  content_md?: string | null;
  attachments?: TaskAttachment[];
};

export type JournalUpdateRequest = {
  content_md?: string | null;
  attachments?: TaskAttachment[];
};

export type JournalRejectRequest = { rejection_reason: string };

export type LessonAnalysisCreateRequest = {
  date: ISODateTime;
  subject: string;
  teacher_name: string;
  grade_level?: string | null;
  quarter: number;
  analysis_md?: string | null;
  attachments?: TaskAttachment[];
};

export type LessonAnalysisUpdateRequest = Partial<LessonAnalysisCreateRequest>;

// ─── Attendance ──────────────────────────────────────────
export type AttendanceDayStatus = "pending" | "green" | "red";

export type AttendanceEventKind = "check_in" | "check_out";

export type AttendanceEvent = {
  id: UUID;
  attendance_day_id: UUID;
  assignment_id: UUID;
  kind: AttendanceEventKind;
  event_at: ISODateTime;
  lat: string | number | null;
  lng: string | number | null;
  accuracy_m: string | number | null;
  distance_m: string | number | null;
  is_within_fence: boolean;
  wifi_ssid: string | null;
  device_id: string | null;
  note: string | null;
  created_at: ISODateTime;
};

export type AttendanceDay = {
  id: UUID;
  assignment_id: UUID;
  date: ISODate;
  status: AttendanceDayStatus;
  check_in_at: ISODateTime | null;
  check_out_at: ISODateTime | null;
  approved_by_id: UUID | null;
  approved_by_name: string | null;
  approved_at: ISODateTime | null;
  note: string | null;
  student_id: UUID | null;
  student_full_name: string | null;
  student_hemis_id: string | null;
  organization_name: string | null;
  area_name: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type AttendanceDayDetail = AttendanceDay & {
  events: AttendanceEvent[];
};

export type AttendanceOverride = {
  id: UUID;
  attendance_day_id: UUID;
  super_admin_id: UUID;
  super_admin_name: string | null;
  previous_status: AttendanceDayStatus;
  new_status: AttendanceDayStatus;
  reason: string;
  created_at: ISODateTime;
};

export type AttendanceMarkRedRequest = {
  date: ISODate;
  note?: string | null;
};

export type AttendanceApproveRequest = {
  note?: string | null;
};

export type AttendanceRejectRequest = {
  note: string;
};

export type AttendanceOverrideRequest = {
  new_status: AttendanceDayStatus;
  reason: string;
};

export type CheckInRequest = {
  lat?: number | null;
  lng?: number | null;
  accuracy_m?: number | null;
  wifi_ssid?: string | null;
  device_id?: string | null;
  note?: string | null;
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
  allowed_education_forms: string[];
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
  amaliyot_id: string | null;
  message: string;
};

export type HemisCredentials = {
  amaliyot_id: string;
  full_name: string;
  group_name: string | null;
  course: number | null;
  direction_code: string | null;
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
