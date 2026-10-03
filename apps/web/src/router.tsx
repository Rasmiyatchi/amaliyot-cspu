import { createBrowserRouter } from "react-router-dom";

import { RouteErrorScreen } from "@/components/error-boundary";
import { RouteFallback } from "@/components/route-loading";
import { lazyPage } from "@/lib/lazy-route";
import { ChangePasswordPage } from "@/routes/change-password";
import { Home } from "@/routes/home";
import { Login } from "@/routes/login";
import { NotFound } from "@/routes/not-found";
import { Protected } from "@/routes/protected";
import { RootLayout } from "@/routes/root-layout";
import { VerifyPage } from "@/routes/verify";

// Xato chegaralari: har bir yuqori darajadagi route va har bir layout ichida (pathless route) —
// sahifa yiqilsa layout (sidebar) saqlanadi, react-router'ning inglizcha standart sahifasi chiqmaydi.
const errorElement = <RouteErrorScreen />;

// Bosh sahifa, login, parolni almashtirish va QR tekshiruv darhol yuklanadi. Admin, supervizor
// va talaba bo'limlari esa alohida chunk'larda — kerak bo'lganda (lib/lazy-route.ts).
const admin = {
  layout: lazyPage(() => import("@/components/admin/admin-layout"), "AdminLayout"),
  home: lazyPage(() => import("@/routes/dashboard/admin/index"), "AdminHome"),
  academic: lazyPage(() => import("@/routes/dashboard/admin/academic"), "AcademicPage"),
  students: lazyPage(() => import("@/routes/dashboard/admin/students"), "StudentsPage"),
  faculties: lazyPage(() => import("@/routes/dashboard/admin/structure/faculties"), "FacultiesPage"),
  departments: lazyPage(
    () => import("@/routes/dashboard/admin/structure/departments"),
    "DepartmentsPage",
  ),
  directions: lazyPage(
    () => import("@/routes/dashboard/admin/structure/directions"),
    "DirectionsPage",
  ),
  groups: lazyPage(() => import("@/routes/dashboard/admin/structure/groups"), "GroupsPage"),
  academicYears: lazyPage(
    () => import("@/routes/dashboard/admin/structure/academic-years"),
    "AcademicYearsPage",
  ),
  structureStudents: lazyPage(
    () => import("@/routes/dashboard/admin/structure/students"),
    "StructureStudentsPage",
  ),
  practiceTypes: lazyPage(
    () => import("@/routes/dashboard/admin/practice-types"),
    "PracticeTypesPage",
  ),
  assignments: lazyPage(() => import("@/routes/dashboard/admin/assignments"), "AssignmentsPage"),
  attendance: lazyPage(() => import("@/routes/dashboard/admin/attendance"), "AttendancePage"),
  taskTemplates: lazyPage(
    () => import("@/routes/dashboard/admin/task-templates"),
    "TaskTemplatesPage",
  ),
  documents: lazyPage(() => import("@/routes/dashboard/admin/documents"), "DocumentsPage"),
  reports: lazyPage(() => import("@/routes/dashboard/admin/reports"), "ReportsPage"),
  records: lazyPage(() => import("@/routes/dashboard/admin/records"), "RecordsPage"),
  contracts: lazyPage(() => import("@/routes/dashboard/admin/contracts"), "ContractsPage"),
  applications: lazyPage(
    () => import("@/routes/dashboard/admin/applications"),
    "ApplicationsPage",
  ),
  supervisors: lazyPage(() => import("@/routes/dashboard/admin/supervisors"), "SupervisorsPage"),
  objects: lazyPage(() => import("@/routes/dashboard/admin/objects"), "ObjectsPage"),
  monitoring: lazyPage(() => import("@/routes/dashboard/admin/monitoring"), "MonitoringPage"),
  inquiries: lazyPage(() => import("@/routes/dashboard/admin/inquiries"), "InquiriesPage"),
  integrations: lazyPage(
    () => import("@/routes/dashboard/admin/integrations"),
    "IntegrationsPage",
  ),
  contractTemplates: lazyPage(
    () => import("@/routes/dashboard/admin/contract-templates"),
    "ContractTemplatesPage",
  ),
  contractTemplateEditor: lazyPage(
    () => import("@/routes/dashboard/admin/contract-template-editor"),
    "ContractTemplateEditorPage",
  ),
  admins: lazyPage(() => import("@/routes/dashboard/admin/admins"), "AdminsPage"),
  auditLog: lazyPage(() => import("@/routes/dashboard/admin/audit-log"), "AuditLogPage"),
  systemSettings: lazyPage(
    () => import("@/routes/dashboard/admin/system-settings"),
    "SystemSettingsPage",
  ),
};

const supervisor = {
  layout: lazyPage(() => import("@/components/supervisor/supervisor-layout"), "SupervisorLayout"),
  dashboard: lazyPage(() => import("@/routes/dashboard/supervisor"), "SupervisorDashboard"),
  regulations: lazyPage(
    () => import("@/routes/dashboard/supervisor/documents"),
    "SupervisorRegulationsPage",
  ),
  programs: lazyPage(
    () => import("@/routes/dashboard/supervisor/documents"),
    "SupervisorProgramsPage",
  ),
  students: lazyPage(
    () => import("@/routes/dashboard/supervisor/students"),
    "SupervisorStudentsPage",
  ),
  reports: lazyPage(() => import("@/routes/dashboard/supervisor/reports"), "SupervisorReportsPage"),
};

const publicPages = {
  amaliyot: lazyPage(() => import("@/routes/amaliyot"), "AmaliyotPage"),
  yoriqnoma: lazyPage(() => import("@/routes/yoriqnoma"), "YoriqnomaPage"),
  faq: lazyPage(() => import("@/routes/faq"), "FaqPage"),
  rescue: lazyPage(() => import("@/routes/rescue"), "RescuePage"),
  student: lazyPage(() => import("@/routes/dashboard/student"), "StudentDashboard"),
};

export const router = createBrowserRouter([
  // Admin — sidebar layout
  {
    element: <Protected allowed={["super_admin", "admin"]} />,
    errorElement,
    HydrateFallback: RouteFallback,
    children: [
      {
        path: "/admin",
        lazy: admin.layout,
        children: [
          {
            errorElement,
            children: [
              { index: true, lazy: admin.home },

              // Structure (Akademik tuzilma)
              {
                element: <Protected permission="structure" />,
                children: [
                  { path: "academic", lazy: admin.academic },
                  { path: "students", lazy: admin.students },
                  { path: "structure/faculties", lazy: admin.faculties },
                  { path: "structure/departments", lazy: admin.departments },
                  { path: "structure/directions", lazy: admin.directions },
                  { path: "structure/groups", lazy: admin.groups },
                  { path: "structure/academic-years", lazy: admin.academicYears },
                  { path: "structure/students", lazy: admin.structureStudents },
                ],
              },

              // Practice (Amaliyot jarayonlari)
              {
                element: <Protected permission="practice" />,
                children: [
                  { path: "practice-types", lazy: admin.practiceTypes },
                  { path: "assignments", lazy: admin.assignments },
                  { path: "attendance", lazy: admin.attendance },
                  { path: "task-templates", lazy: admin.taskTemplates },
                  { path: "documents", lazy: admin.documents },
                  { path: "reports", lazy: admin.reports },
                  { path: "records", lazy: admin.records },
                ],
              },

              // Contracts & Applications (Shartnomalar va arizalar)
              {
                element: <Protected allowedPermissions={["contracts", "practice"]} />,
                children: [
                  { path: "contracts", lazy: admin.contracts },
                  { path: "applications", lazy: admin.applications },
                ],
              },

              // Supervisors (Rahbarlar)
              {
                element: <Protected permission="supervisors" />,
                children: [{ path: "supervisors", lazy: admin.supervisors }],
              },

              // Partners / Organizations / Areas (Hamkorlar)
              {
                element: <Protected permission="partners" />,
                children: [{ path: "objects", lazy: admin.objects }],
              },

              // Monitoring
              {
                element: <Protected permission="monitoring" />,
                children: [
                  { path: "monitoring", lazy: admin.monitoring },
                  { path: "monitoring/:tab", lazy: admin.monitoring },
                ],
              },

              // Inquiries (Murojaatlar)
              {
                element: <Protected permission="inquiries" />,
                children: [{ path: "inquiries", lazy: admin.inquiries }],
              },

              // System settings (Tizim sozlamalari)
              {
                element: <Protected permission="system" />,
                children: [{ path: "integrations", lazy: admin.integrations }],
              },

              {
                element: <Protected allowed={["super_admin"]} />,
                children: [
                  { path: "contract-templates", lazy: admin.contractTemplates },
                  { path: "contract-templates/:id/edit", lazy: admin.contractTemplateEditor },
                  { path: "admins", lazy: admin.admins },
                  { path: "audit-log", lazy: admin.auditLog },
                  { path: "system-settings", lazy: admin.systemSettings },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // Public QR verify — auth yo'q, layout yo'q
  { path: "/verify/:token", Component: VerifyPage, errorElement },

  // Super Admin rescue — MaintenanceGuard'siz, faqat super_admin uchun
  {
    path: "/rescue",
    lazy: publicPages.rescue,
    errorElement,
    HydrateFallback: RouteFallback,
  },

  // Force change password — must_change_password=true bo'lganda
  { path: "/change-password", Component: ChangePasswordPage, errorElement },

  // Supervisor — sidebar layout
  {
    element: <Protected allowed={["supervisor"]} />,
    errorElement,
    HydrateFallback: RouteFallback,
    children: [
      {
        path: "/supervisor",
        lazy: supervisor.layout,
        children: [
          {
            errorElement,
            children: [
              { index: true, lazy: supervisor.dashboard },
              { path: "regulations", lazy: supervisor.regulations },
              { path: "programs", lazy: supervisor.programs },
              { path: "students", lazy: supervisor.students },
              { path: "reports", lazy: supervisor.reports },
              { path: "attendance", lazy: supervisor.dashboard },
              { path: "tasks", lazy: supervisor.dashboard },
            ],
          },
        ],
      },
    ],
  },

  // Public + boshqa rollar (student hozircha RootLayout'da)
  {
    element: <RootLayout />,
    errorElement,
    HydrateFallback: RouteFallback,
    children: [
      {
        errorElement,
        children: [
          { index: true, Component: Home },
          { path: "amaliyot", lazy: publicPages.amaliyot },
          { path: "yoriqnoma", lazy: publicPages.yoriqnoma },
          { path: "faq", lazy: publicPages.faq },
          { path: "login", Component: Login },
          {
            element: <Protected allowed={["student"]} />,
            children: [{ path: "student", lazy: publicPages.student }],
          },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);
