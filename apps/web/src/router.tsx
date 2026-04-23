import { createBrowserRouter } from "react-router-dom";

import { Home } from "@/routes/home";
import { NotFound } from "@/routes/not-found";
import { RootLayout } from "@/routes/root-layout";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, Component: Home },
      { path: "*", Component: NotFound },
    ],
  },
]);
