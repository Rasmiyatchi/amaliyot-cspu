import { createBrowserRouter } from "react-router-dom";

import { AdminLayout } from "@/components/admin/admin-layout";
import { SupervisorLayout } from "@/components/supervisor/supervisor-layout";
import { AcademicPage } from "@/routes/dashboard/admin/academic";
import { AdminsPage } from "@/routes/dashboard/admin/admins";
import { AssignmentsPage } from "@/routes/dashboard/admin/assignments";
import { AttendancePage } from "@/routes/dashboard/admin/attendance";
import { AuditLogPage } from "@/routes/dashboard/admin/audit-log";
import { ContractsPage } from "@/routes/dashboard/admin/contracts";
import { DocumentsPage } from "@/routes/dashboard/admin/documents";
import { AdminHome } from "@/routes/dashboard/admin/index";
import { ObjectsPage } from "@/routes/dashboard/admin/objects";
import { PracticeTypesPage } from "@/routes/dashboard/admin/practice-types";
import { ApplicationsPage } from "@/routes/dashboard/admin/applications";
import { ContractTemplatesPage } from "@/routes/dashboard/admin/contract-templates";
import { ContractTemplateEditorPage } from "@/routes/dashboard/admin/contract-template-editor";
import { InquiriesPage } from "@/routes/dashboard/admin/inquiries";
import { RecordsPage } from "@/routes/dashboard/admin/records";
import { ReportsPage } from "@/routes/dashboard/admin/reports";
import { StudentsPage } from "@/routes/dashboard/admin/students";
import { SupervisorsPage } from "@/routes/dashboard/admin/supervisors";
import { SystemSettingsPage } from "@/routes/dashboard/admin/system-settings";
import { TaskTemplatesPage } from "@/routes/dashboard/admin/task-templates";
import { StudentDashboard } from "@/routes/dashboard/student";
import { SupervisorDashboard } from "@/routes/dashboard/supervisor";
import {
  SupervisorProgramsPage,
  SupervisorRegulationsPage,
} from "@/routes/dashboard/supervisor/documents";
import { SupervisorStudentsPage } from "@/routes/dashboard/supervisor/students";
import { ChangePasswordPage } from "@/routes/change-password";
import { Home } from "@/routes/home";
import { Login } from "@/routes/login";
import { NotFound } from "@/routes/not-found";
import { Protected } from "@/routes/protected";
import { RescuePage } from "@/routes/rescue";
import { RootLayout } from "@/routes/root-layout";
import { VerifyPage } from "@/routes/verify";

export const router = createBrowserRouter([
  // Admin — sidebar layout
  {
    element: <Protected allowed={["super_admin", "admin"]} />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, Component: AdminHome },
          { path: "academic", Component: AcademicPage },
          { path: "practice-types", Component: PracticeTypesPage },
          { path: "objects", Component: ObjectsPage },
          { path: "supervisors", Component: SupervisorsPage },
          { path: "students", Component: StudentsPage },
          { path: "assignments", Component: AssignmentsPage },
          { path: "contracts", Component: ContractsPage },
          { path: "applications", Component: ApplicationsPage },
          { path: "attendance", Component: AttendancePage },
          { path: "task-templates", Component: TaskTemplatesPage },
          { path: "documents", Component: DocumentsPage },
          { path: "reports", Component: ReportsPage },
          { path: "records", Component: RecordsPage },
          { path: "inquiries", Component: InquiriesPage },

          // Faqat Super Admin. Sidebar bu linklarni yashiradi, lekin URL'ni qo'lda
          // yozib kirish mumkin edi — backend 403 qaytarardi va sahifa tushunarsiz
          // xato ko'rsatardi. Endi route darajasida to'xtatiladi.
          {
            element: <Protected allowed={["super_admin"]} />,
            children: [
              { path: "contract-templates", Component: ContractTemplatesPage },
              { path: "contract-templates/:id/edit", Component: ContractTemplateEditorPage },
              { path: "admins", Component: AdminsPage },
              { path: "audit-log", Component: AuditLogPage },
              { path: "system-settings", Component: SystemSettingsPage },
            ],
          },
        ],
      },
    ],
  },

  // Public QR verify — auth yo'q, layout yo'q
  { path: "/verify/:token", Component: VerifyPage },

  // Super Admin rescue — MaintenanceGuard'siz, faqat super_admin uchun
  { path: "/rescue", Component: RescuePage },

  // Force change password — must_change_password=true bo'lganda
  { path: "/change-password", Component: ChangePasswordPage },

  // Supervisor — sidebar layout
  {
    element: <Protected allowed={["supervisor"]} />,
    children: [
      {
        path: "/supervisor",
        element: <SupervisorLayout />,
        children: [
          { index: true, Component: SupervisorDashboard },
          { path: "regulations", Component: SupervisorRegulationsPage },
          { path: "programs", Component: SupervisorProgramsPage },
          { path: "students", Component: SupervisorStudentsPage },
          // Eski single-page'da bor edi — alohida sahifalar keyingi iteratsiyada
          { path: "attendance", Component: SupervisorDashboard },
          { path: "tasks", Component: SupervisorDashboard },
        ],
      },
    ],
  },

  // Public + boshqa rollar (student hozircha RootLayout'da)
  {
    element: <RootLayout />,
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      {
        element: <Protected allowed={["student"]} />,
        children: [{ path: "student", Component: StudentDashboard }],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
