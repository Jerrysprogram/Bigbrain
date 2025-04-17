import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom'
import 'antd/dist/reset.css'

import App from './App.jsx'
import Login from './pages/login.jsx'
import Register from './pages/register.jsx'
import Dashboard from './pages/dashboard.jsx'
import Games from './pages/games.jsx'

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
    path: '/games/:gameId',
    element: <Games />,
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
