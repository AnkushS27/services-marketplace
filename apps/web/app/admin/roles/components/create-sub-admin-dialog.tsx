'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface RoleOption {
  id: string;
  name: string;
  type: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
}

interface CreateSubAdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: RoleOption[];
}

export function CreateSubAdminDialog({
  isOpen,
  onClose,
  onSuccess,
  roles,
}: CreateSubAdminDialogProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter only ADMIN roles
  const adminRoles = roles.filter((r) => r.type === 'ADMIN');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetch('/admin/sub-admins', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          password,
          roleId: roleId || (adminRoles[0]?.id ?? ''),
          phone: phone.trim() || undefined,
        }),
      });
      onSuccess();
      onClose();
      setEmail('');
      setName('');
      setPassword('');
      setPhone('');
    } catch (err: any) {
      setError(err.message || 'Failed to create sub-admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Create Sub-Admin Account</h2>
            <p className="text-xs text-muted-foreground">Provision an admin user with a specific role</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="sub-name">Full Name</Label>
            <Input
              id="sub-name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-email">Email Address</Label>
            <Input
              id="sub-email"
              type="email"
              placeholder="moderator@marketplace.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-password">Password (min 8 chars)</Label>
            <Input
              id="sub-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-phone">Phone Number (optional)</Label>
            <Input
              id="sub-phone"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-role">Assign Role</Label>
            <select
              id="sub-role"
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={roleId || (adminRoles[0]?.id ?? '')}
              onChange={(e) => setRoleId(e.target.value)}
              required
            >
              {adminRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !email || !name || !password}>
              {isSubmitting ? 'Creating...' : 'Create Sub-Admin'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
