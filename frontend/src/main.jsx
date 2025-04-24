// import { StrictMode } from 'react'
import { createRoot } from "react-dom/client";
import {
  RouterProvider,
  createBrowserRouter,
  Navigate,
} from "react-router-dom";
import "antd/dist/reset.css";

import Login from "./pages/login/login.jsx";
import Register from "./pages/register/register.jsx";
import Dashboard from "./pages/dashboard/dashboard.jsx";
import Games from "./pages/gamepages/games.jsx";
import GameEdit from "./pages/gamepages/GameEdit.jsx";
import QuestionEdit from "./pages/gamepages/QuestionEdit.jsx";
import SessionAdmin from "./pages/gamepages/SessionAdmin.jsx";
import Join from "./pages/play/Join.jsx";
import Play from "./pages/play/Play.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/play/join",
    element: <Join />,
  },
  {
    path: "/play/join/:sessionId",
    element: <Join />,
  },
  {
    path: "/play/:playerId",
    element: <Play />,
  },
  {
    path: "/game/:gameId",
    element: <GameEdit />,
  },
  {
    path: "/game/:gameId/question/:questionId",
    element: <QuestionEdit />,
  },
  {
    path: "/games/:gameId",
    element: <Games />,
  },
  {
    path: "/session/:sessionId",
    element: <SessionAdmin />,
  },
]);

createRoot(document.getElementById("root")).render(
  // <StrictMode>
  <RouterProvider router={router} />,
  // </StrictMode>,
);
