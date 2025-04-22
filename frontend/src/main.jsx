// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom'
import 'antd/dist/reset.css'

import App from './App.jsx'
import Login from './pages/login/login.jsx'
import Register from './pages/register/register.jsx'
import Dashboard from './pages/dashboard/dashboard.jsx'
import Games from './pages/gamepages/games.jsx'
import GameEdit from './pages/gamepages/GameEdit.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/game/:gameId',
    element: <GameEdit />,
  },
  {
    path: '/games/:gameId',
    element: <Games />,
  }
]);

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <RouterProvider router={router} />
  // </StrictMode>,
)
