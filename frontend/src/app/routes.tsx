import { createBrowserRouter } from "react-router";
import RootLayout from "./components/layout/RootLayout";
import Home from "./pages/Home";
import Recommendations from "./pages/Recommendations";
import Detail from "./pages/Detail";
import Compare from "./pages/Compare";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Saved from "./pages/Saved";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: "recommendations", Component: Recommendations },
      { path: "detail/:id", Component: Detail },
      { path: "saved", Component: Saved },
      { path: "compare", Component: Compare },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
    ],
  },
]);
