import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import 'antd/dist/reset.css'

import App from './App.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/login',
    element: <div>Login page</div>
  },
  {
    path: '/register',
    element: <div>Register page</div>
  },
  {
    path: '/dashboard',
    element: <div>Dashboard page</div>
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
