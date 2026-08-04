import { useEffect, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { usersApi } from '@/api/users.api';
import { getApiErrorMessage } from '@/api/http';
import { useRoleLabelsStore } from '@/stores/useRoleLabelsStore';
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/types/permission';
import type { Permission } from '@/types/permission';
import type { UserRecord } from '@/types/user';

interface PermissionsDrawerProps {
  open: boolean;
  user: UserRecord | null;
  onClose: () => void;
  onSaved: (user: UserRecord) => void;
}

/** Focused editor for one user's extra permission grants — the role itself is
 *  fixed (see role.enum.ts); this only touches the `permissions` override array. */
export function PermissionsDrawer({ open, user, onClose, onSaved }: PermissionsDrawerProps) {
  const roleLabels = useRoleLabelsStore((s) => s.labels);
  const [permissions, setPermissions] = useState<Permission[]>(user?.permissions ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPermissions(user?.permissions ?? []);
    setError(null);
  }, [user]);

  function togglePermission(p: Permission) {
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await usersApi.update(user.id, { permissions });
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save permissions'));
      setIsSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Edit Permissions" widthClass="max-w-md">
      {open && user && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-text-primary">{user.name}</p>
            <p className="text-sm text-text-muted">{roleLabels[user.role]}</p>
          </div>

          <div className="space-y-1.5">
            {ALL_PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={permissions.includes(p)}
                  onChange={() => togglePermission(p)}
                  className="rounded text-blue focus:ring-blue"
                />
                {PERMISSION_LABELS[p]}
              </label>
            ))}
          </div>
          <p className="text-xs text-text-faint">
            Grants a capability on top of what {roleLabels[user.role]} already has by default.
          </p>

          {error && <p className="text-sm text-red">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} loading={isSaving}>
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
