import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/Login/LoginPage';
import { ForgotPasswordPage } from '@/pages/Login/ForgotPasswordPage';
import { RoleDashboard } from '@/pages/Dashboards/RoleDashboard';
import { EventsPage } from '@/pages/Events/EventsPage';
import { EventFieldsPage } from '@/pages/Events/EventFieldsPage';
import { EventResponsesPage } from '@/pages/Events/EventResponsesPage';
import { UsersPage } from '@/pages/Users/UsersPage';
import { PublicEventsListPage } from '@/pages/PublicEvents/PublicEventsListPage';
import { PublicEventDetailPage } from '@/pages/PublicEvents/PublicEventDetailPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { AppLayout } from '@/layout/AppLayout';
import { PublicLayout } from '@/layout/PublicLayout';
import { useAuthStore } from '@/stores/useAuthStore';
import { ROLE_DASHBOARD_PATH } from '@/types/auth';

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const homePath = isAuthenticated ? (user ? ROLE_DASHBOARD_PATH[user.role] : null) : '/login';

  useEffect(() => {
    if (isAuthenticated) fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* login-module.md — guests browse without an account; Public/Citizen also
          lands here after login (see ROLE_DASHBOARD_PATH.public_citizen). */}
      <Route path="/portal" element={<Navigate to="/events" replace />} />
      <Route element={<PublicLayout />}>
        <Route path="/events" element={<PublicEventsListPage />} />
        <Route path="/events/:id" element={<PublicEventDetailPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard" element={<RoleDashboard title="Admin Dashboard" />} />
          <Route path="/regional/dashboard" element={<RoleDashboard title="Regional Dashboard" />} />
          <Route path="/official/dashboard" element={<RoleDashboard title="Official Dashboard" />} />
          <Route path="/field/dashboard" element={<RoleDashboard title="Field Dashboard" />} />
          <Route path="/volunteer/dashboard" element={<RoleDashboard title="Volunteer Dashboard" />} />
          <Route path="/partner/dashboard" element={<RoleDashboard title="Partner Dashboard" />} />

          <Route path="/admin/events" element={<EventsPage />} />
          <Route path="/admin/events/:id/fields" element={<EventFieldsPage />} />
          <Route path="/admin/events/:id/responses" element={<EventResponsesPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
        </Route>
      </Route>

      <Route path="/" element={homePath ? <Navigate to={homePath} replace /> : null} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
