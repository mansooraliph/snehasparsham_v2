import { useState } from 'react';
import type { FormEvent } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { usersApi } from '@/api/users.api';
import { getApiErrorMessage } from '@/api/http';
import { useRoleLabelsStore } from '@/stores/useRoleLabelsStore';
import type { Role } from '@/types/auth';
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/types/permission';
import type { Permission } from '@/types/permission';
import type { UserRecord, UserStatus } from '@/types/user';

const ROLE_OPTIONS: Role[] = [
  'super_admin',
  'district_state_admin',
  'government_official',
  'field_responder',
  'volunteer',
  'ngo_partner',
  'public_citizen',
];

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending_approval', label: 'Pending Approval' },
];

interface UserFormDrawerProps {
  open: boolean;
  /** Present in edit mode, absent in create mode. */
  user?: UserRecord;
  onClose: () => void;
  onSaved: (user: UserRecord) => void;
}

export function UserFormDrawer({ open, user, onClose, onSaved }: UserFormDrawerProps) {
  const roleLabels = useRoleLabelsStore((s) => s.labels);
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? 'volunteer');
  const [region, setRegion] = useState(user?.region ?? '');
  const [status, setStatus] = useState<UserStatus>(user?.status ?? 'active');
  const [permissions, setPermissions] = useState<Permission[]>(user?.permissions ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePermission(p: Permission) {
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const saved = isEdit
        ? await usersApi.update(user!.id, {
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            username: username.trim() || undefined,
            newPassword: password || undefined,
            role,
            region: region.trim() || undefined,
            status,
            permissions,
          })
        : await usersApi.create({
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            username: username.trim() || undefined,
            password,
            role,
            region: region.trim() || undefined,
            status,
            permissions,
          });
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err, isEdit ? 'Could not update user' : 'Could not create user'));
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit User' : 'Create User'}>
      {open && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" htmlFor="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <Field label="Email" htmlFor="email" hint="At least one of email, phone, or username is required">
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>

          <Field label="Phone" htmlFor="phone" hint="10-digit phone number">
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </Field>

          <Field label="Username" htmlFor="username" hint="Optional — an alternate login ID; can be a plain username or an email address">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jdoe"
            />
          </Field>

          <Field
            label={isEdit ? 'New Password' : 'Password'}
            htmlFor="password"
            hint={isEdit ? 'Leave blank to keep the current password' : 'Min 8 characters'}
          >
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
            />
          </Field>

          <Field label="Role" htmlFor="role">
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Region" htmlFor="region" hint="Optional — for region-scoped roles">
            <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} />
          </Field>

          <Field label="Status" htmlFor="status">
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="w-full rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Permissions" hint="Grants a capability regardless of role">
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
          </Field>

          {error && <p className="text-sm text-red">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
