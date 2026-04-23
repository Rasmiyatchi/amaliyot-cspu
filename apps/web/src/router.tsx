import { createBrowserRouter } from "react-router-dom";

import { AdminDashboard } from "@/routes/dashboard/admin";
import { StudentDashboard } from "@/routes/dashboard/student";
import { SupervisorDashboard } from "@/routes/dashboard/supervisor";
import { Home } from "@/routes/home";
import { Login } from "@/routes/login";
import { NotFound } from "@/routes/not-found";
import { Protected } from "@/routes/protected";
import { RootLayout } from "@/routes/root-layout";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      {
        element: <Protected allowed={["super_admin", "admin"]} />,
        children: [{ path: "admin", Component: AdminDashboard }],
      },
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
