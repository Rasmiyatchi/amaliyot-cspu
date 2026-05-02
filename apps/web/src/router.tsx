import { createBrowserRouter } from "react-router-dom";

import { AdminLayout } from "@/components/admin/admin-layout";
import { AcademicPage } from "@/routes/dashboard/admin/academic";
import { AdminsPage } from "@/routes/dashboard/admin/admins";
import { AssignmentsPage } from "@/routes/dashboard/admin/assignments";
import { AttendancePage } from "@/routes/dashboard/admin/attendance";
import { ContractsPage } from "@/routes/dashboard/admin/contracts";
import { AdminHome } from "@/routes/dashboard/admin/index";
import { ObjectsPage } from "@/routes/dashboard/admin/objects";
import { PracticeTypesPage } from "@/routes/dashboard/admin/practice-types";
import { StudentsPage } from "@/routes/dashboard/admin/students";
import { SupervisorsPage } from "@/routes/dashboard/admin/supervisors";
import { SystemSettingsPage } from "@/routes/dashboard/admin/system-settings";
import { TaskTemplatesPage } from "@/routes/dashboard/admin/task-templates";
import { StudentDashboard } from "@/routes/dashboard/student";
import { SupervisorDashboard } from "@/routes/dashboard/supervisor";
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
          { path: "attendance", Component: AttendancePage },
          { path: "task-templates", Component: TaskTemplatesPage },
          { path: "admins", Component: AdminsPage },
          { path: "system-settings", Component: SystemSettingsPage },
        ],
      },
    ],
  },

  // Public QR verify — auth yo'q, layout yo'q
  { path: "/verify/:token", Component: VerifyPage },

  // Super Admin rescue — MaintenanceGuard'siz, faqat super_admin uchun
  { path: "/rescue", Component: RescuePage },

  // Public + boshqa rollar
  {
    element: <RootLayout />,
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      {
        element: <Protected allowed={["supervisor"]} />,
        children: [{ path: "supervisor", Component: SupervisorDashboard }],
      },
      {
        element: <Protected allowed={["student"]} />,
        children: [{ path: "student", Component: StudentDashboard }],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
