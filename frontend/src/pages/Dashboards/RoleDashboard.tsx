import { useEffect, useState } from 'react';
import { Calendar, CalendarClock, ClipboardList, Hourglass, Users } from 'lucide-react';
import { dashboardApi } from '@/api/dashboard.api';
import { getApiErrorMessage } from '@/api/http';
import { useAuthStore } from '@/stores/useAuthStore';
import type { DashboardStats } from '@/types/dashboard';

interface RoleDashboardProps {
  title: string;
}

const ADMIN_ROLES = new Set(['super_admin', 'district_state_admin']);

const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const USER_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  pending_approval: 'Pending Approval',
};

export function RoleDashboard({ title }: RoleDashboardProps) {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role ? ADMIN_ROLES.has(role) : false;

  if (!isAdmin) {
    return <p className="text-text-muted">{title} — this page is a placeholder until its module ships.</p>;
  }

  return <AdminStats title={title} />;
}

function AdminStats({ title }: { title: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi
      .getStats()
      .then(setStats)
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load dashboard statistics')));
  }, []);

  if (error) return <p className="text-sm text-red">{error}</p>;
  if (!stats) return <p className="text-sm text-text-muted">Loading…</p>;

  const pendingApproval = stats.users.byStatus.pending_approval ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-muted">An overview of events, registrations, and users across the portal.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={Calendar} label="Total Events" value={stats.events.total} />
        <StatTile icon={CalendarClock} label="Upcoming Events" value={stats.events.upcoming} />
        <StatTile icon={ClipboardList} label="Total Registrations" value={stats.totalRegistrations} />
        <StatTile icon={Users} label="Total Users" value={stats.users.total} />
        <StatTile icon={Hourglass} label="Pending Approval" value={pendingApproval} tone={pendingApproval > 0 ? 'amber' : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BreakdownCard title="Events by Status" rows={statusRows(stats.events.byStatus, EVENT_STATUS_LABELS)} />
        <BreakdownCard title="Users by Status" rows={statusRows(stats.users.byStatus, USER_STATUS_LABELS)} />
      </div>
    </div>
  );
}

function statusRows(counts: Record<string, number>, labels: Record<string, string>) {
  return Object.entries(counts).map(([key, count]) => ({ label: labels[key] ?? key, count }));
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Calendar;
  label: string;
  value: number;
  tone?: 'amber';
}) {
  return (
    <div className="rounded-card border border-border bg-white p-4">
      <div className="flex items-center gap-2 text-text-faint">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${tone === 'amber' ? 'text-amber' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div className="rounded-card border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-text-muted">{row.label}</span>
            <span className="font-medium text-text-primary">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
