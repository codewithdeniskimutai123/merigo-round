import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function ProtectedRoute() {
  const location = useLocation()
  const accessToken = localStorage.getItem('access')

  if (!accessToken) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  return <Outlet />
}