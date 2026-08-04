import { useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usersApi } from '@/api/users.api';
import { getApiErrorMessage } from '@/api/http';
import { useRoleLabelsStore } from '@/stores/useRoleLabelsStore';
import { PERMISSION_LABELS } from '@/types/permission';
import { UserFormDrawer } from './UserFormDrawer';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { ResetPasswordResultModal } from './ResetPasswordResultModal';
import type { UserRecord, UserStatus } from '@/types/user';

const STATUS_TONE: Record<UserStatus, 'green' | 'red' | 'amber'> = {
  active: 'green',
  suspended: 'red',
  pending_approval: 'amber',
};

export function UsersPage() {
  const roleLabels = useRoleLabelsStore((s) => s.labels);
  const [users, setUsers] = useState<UserRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerUser, setDrawerUser] = useState<UserRecord | 'new' | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [resetResult, setResetResult] = useState<{ user: UserRecord; password: string } | null>(null);

  function loadUsers() {
    usersApi
      .list()
      .then(setUsers)
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load users')));
  }

  useEffect(loadUsers, []);

  function handleSaved() {
    setDrawerUser(null);
    loadUsers();
  }

  async function handleConfirmReset(customPassword?: string) {
    if (!resetTarget) return;
    try {
      const { password } = await usersApi.resetPassword(resetTarget.id, customPassword);
      setResetResult({ user: resetTarget, password });
      setResetTarget(null);
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Could not reset password'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Manage portal users, their roles, and permission grants.</p>
        <Button onClick={() => setDrawerUser('new')}>
          <Plus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-table-head text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-3">S.No</th>
              <th className="px-4 py-3" />
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Permissions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user, index) => (
              <tr key={user.id} className="border-t border-border">
                <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-start gap-3">
                    <button
                      type="button"
                      onClick={() => setDrawerUser(user)}
                      aria-label="Edit user"
                      className="text-text-faint hover:text-blue"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetTarget(user)}
                      aria-label="Reset password"
                      className="text-text-faint hover:text-blue"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
                <td className="px-4 py-3 text-text-muted">{user.email ?? user.phone ?? user.username ?? '—'}</td>
                <td className="px-4 py-3 text-text-muted">{roleLabels[user.role]}</td>
                <td className="px-4 py-3 text-text-muted">{user.region ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[user.status]}>{user.status.replace('_', ' ')}</Badge>
                </td>
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
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            No users yet. Click "Create User" to add your first one.
          </p>
        )}
        {users === null && !error && <p className="px-4 py-8 text-center text-sm text-text-muted">Loading…</p>}
      </div>

      {drawerUser !== null && (
        <UserFormDrawer
          key={drawerUser === 'new' ? 'new' : drawerUser.id}
          open
          user={drawerUser === 'new' ? undefined : drawerUser}
          onClose={() => setDrawerUser(null)}
          onSaved={handleSaved}
        />
      )}

      <ResetPasswordDialog
        open={resetTarget !== null}
        user={resetTarget}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetTarget(null)}
      />

      {resetResult && (
        <ResetPasswordResultModal
          user={resetResult.user}
          password={resetResult.password}
          onClose={() => setResetResult(null)}
        />
      )}
    </div>
  );
}
