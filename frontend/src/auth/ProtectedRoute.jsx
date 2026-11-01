import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { LoadingState } from '../components/StateMessages'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingState />
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}