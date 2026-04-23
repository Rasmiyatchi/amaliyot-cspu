import { createBrowserRouter } from "react-router-dom";

import { AdminLayout } from "@/components/admin/admin-layout";
import { AcademicPage } from "@/routes/dashboard/admin/academic";
import { AdminHome } from "@/routes/dashboard/admin/index";
import { StudentsPage } from "@/routes/dashboard/admin/students";
import { StudentDashboard } from "@/routes/dashboard/student";
import { SupervisorDashboard } from "@/routes/dashboard/supervisor";
import { Home } from "@/routes/home";
import { Login } from "@/routes/login";
import { NotFound } from "@/routes/not-found";
import { Protected } from "@/routes/protected";
import { RootLayout } from "@/routes/root-layout";

export const router = createBrowserRouter([
  // Admin — sidebar layout (alohida, RootLayout header'siz)
  {
    element: <Protected allowed={["super_admin", "admin"]} />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, Component: AdminHome },
          { path: "academic", Component: AcademicPage },
          { path: "students", Component: StudentsPage },
        ],
      },
    ],
  },

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
