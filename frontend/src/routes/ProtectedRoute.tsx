import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

/** Gates nested routes behind an authenticated session. */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
