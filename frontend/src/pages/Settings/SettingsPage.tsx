import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/Badge';
import { usersApi } from '@/api/users.api';
import { getApiErrorMessage } from '@/api/http';
import { ROLE_LABELS } from '@/types/auth';
import type { Role } from '@/types/auth';
import { PERMISSION_LABELS } from '@/types/permission';
import { PermissionsDrawer } from './PermissionsDrawer';
import type { UserRecord } from '@/types/user';

type SettingsTab = 'roles' | 'permissions';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'roles', label: 'Roles' },
  { key: 'permissions', label: 'Permission Grants' },
];

/** disaster-management-portal-full.md §2 — fixed role table; roles themselves
 *  aren't user-configurable, only the extra permission grants on top of them are. */
const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: 'Full system control: manages users, roles, permissions, and system configuration.',
  district_state_admin: 'Manages disasters, resources, and teams within an assigned region.',
  government_official: 'Reviews reports, approves resource allocation, monitors overall situation.',
  field_responder: 'Updates on-ground status, requests resources, reports incidents.',
  volunteer: 'Registers for relief work, receives task assignments, reports availability.',
  ngo_partner: 'Coordinates aid, donations, and logistics support.',
  public_citizen: 'Browses public content and submits event registrations without an account.',
};

const ROLE_ORDER: Role[] = [
  'super_admin',
  'district_state_admin',
  'government_official',
  'field_responder',
  'volunteer',
  'ngo_partner',
  'public_citizen',
];

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('roles');
  const [users, setUsers] = useState<UserRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserRecord | null>(null);

  function loadUsers() {
    usersApi
      .list()
      .then(setUsers)
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load users')));
  }

  useEffect(loadUsers, []);

  function handleSaved(updated: UserRecord) {
    setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? prev);
    setPermissionsUser(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'relative -mb-px py-3 text-sm font-medium transition-colors',
              tab === t.key ? 'text-blue' : 'text-text-muted hover:text-text-primary',
            )}
          >
            {t.label}
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-blue" />}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {tab === 'roles' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Roles</h2>
            <p className="text-sm text-text-muted">
              The portal's roles are fixed by design — each grants a default set of capabilities. Use the
              Permission Grants tab to give a specific user extra access beyond their role.
            </p>
          </div>

          <div className="overflow-x-auto rounded-card border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-table-head text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_ORDER.map((role) => (
                  <tr key={role} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary">{ROLE_LABELS[role]}</td>
                    <td className="px-4 py-3 text-text-muted">{ROLE_DESCRIPTIONS[role]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'permissions' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Permission Grants</h2>
            <p className="text-sm text-text-muted">Give an individual user a capability their role doesn't include by default.</p>
          </div>

          <div className="overflow-x-auto rounded-card border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-table-head text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3" />
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Extra Permissions</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setPermissionsUser(user)}
                        aria-label="Edit permissions"
                        className="text-text-faint hover:text-blue"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
                    <td className="px-4 py-3 text-text-muted">{ROLE_LABELS[user.role]}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.length
                          ? user.permissions.map((p) => (
                              <Badge key={p} tone="blue">
                                {PERMISSION_LABELS[p]}
                              </Badge>
                            ))
                          : <span className="text-text-faint">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users?.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-text-muted">No users yet.</p>
            )}
            {users === null && !error && <p className="px-4 py-8 text-center text-sm text-text-muted">Loading…</p>}
          </div>
        </div>
      )}

      <PermissionsDrawer
        open={!!permissionsUser}
        user={permissionsUser}
        onClose={() => setPermissionsUser(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
