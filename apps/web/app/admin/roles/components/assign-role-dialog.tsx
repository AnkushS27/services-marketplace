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

interface AssignRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: RoleOption[];
}

export function AssignRoleDialog({
  isOpen,
  onClose,
  onSuccess,
  roles,
}: AssignRoleDialogProps) {
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetch(`/admin/users/${userId.trim()}/role`, {
        method: 'POST',
        body: JSON.stringify({
          roleId: roleId || (roles[0]?.id ?? ''),
        }),
      });
      onSuccess();
      onClose();
      setUserId('');
    } catch (err: any) {
      setError(err.message || 'Failed to reassign role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Reassign User Role</h2>
            <p className="text-xs text-muted-foreground">Change an existing user&apos;s role assignment</p>
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
            <Label htmlFor="assign-user-id">Target User ID</Label>
            <Input
              id="assign-user-id"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assign-role-id">New Role</Label>
            <select
              id="assign-role-id"
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={roleId || (roles[0]?.id ?? '')}
              onChange={(e) => setRoleId(e.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !userId.trim()}>
              {isSubmitting ? 'Updating...' : 'Assign Role'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
