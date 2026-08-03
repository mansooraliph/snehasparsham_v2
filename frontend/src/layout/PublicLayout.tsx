import { Link, Outlet } from 'react-router-dom';

/** Unauthenticated shell for public browsing (login-module.md — guests can browse without an account). */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-bg-page">
      <header className="border-b border-border bg-white px-6 py-4">
        <Link to="/events" className="text-lg font-semibold text-text-primary">
          Disaster Management Portal
        </Link>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
