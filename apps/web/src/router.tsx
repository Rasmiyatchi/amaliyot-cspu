import { createBrowserRouter } from "react-router-dom";

import { AdminLayout } from "@/components/admin/admin-layout";
import { AcademicPage } from "@/routes/dashboard/admin/academic";
import { AssignmentsPage } from "@/routes/dashboard/admin/assignments";
import { ContractsPage } from "@/routes/dashboard/admin/contracts";
import { AdminHome } from "@/routes/dashboard/admin/index";
import { ObjectsPage } from "@/routes/dashboard/admin/objects";
import { PracticeTypesPage } from "@/routes/dashboard/admin/practice-types";
import { StudentsPage } from "@/routes/dashboard/admin/students";
import { SupervisorsPage } from "@/routes/dashboard/admin/supervisors";
import { StudentDashboard } from "@/routes/dashboard/student";
import { SupervisorDashboard } from "@/routes/dashboard/supervisor";
import { Home } from "@/routes/home";
import { Login } from "@/routes/login";
import { NotFound } from "@/routes/not-found";
import { Protected } from "@/routes/protected";
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
        ],
      },
    ],
  },

  // Public QR verify — auth yo'q, layout yo'q
  { path: "/verify/:token", Component: VerifyPage },

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
