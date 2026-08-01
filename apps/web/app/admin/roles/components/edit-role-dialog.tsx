'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PermissionItem {
  id: string;
  slug: string;
  description: string;
}

interface GroupedPermissions {
  [domain: string]: PermissionItem[];
}

export interface RoleData {
  id: string;
  name: string;
  type: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
  bypassChecks: boolean;
  isSystem: boolean;
  permissions: string[];
}

interface EditRoleDialogProps {
  role: RoleData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupedPermissions: GroupedPermissions;
}

export function EditRoleDialog({
  role,
  isOpen,
  onClose,
  onSuccess,
  groupedPermissions,
}: EditRoleDialogProps) {
  const [name, setName] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setSelectedSlugs(role.permissions || []);
      setError(null);
    }
  }, [role]);

  if (!isOpen || !role) return null;

  const togglePermission = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const toggleDomain = (domain: string) => {
    const domainSlugs = (groupedPermissions[domain] || []).map((p) => p.slug);
    const allSelected = domainSlugs.every((s) => selectedSlugs.includes(s));

    if (allSelected) {
      setSelectedSlugs((prev) => prev.filter((s) => !domainSlugs.includes(s)));
    } else {
      setSelectedSlugs((prev) => Array.from(new Set([...prev, ...domainSlugs])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetch(`/roles/${role.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(role.isSystem ? {} : { name: name.trim() }),
          permissionSlugs: selectedSlugs,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Edit Role Permissions: <span className="text-primary">{role.name}</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              {role.isSystem ? 'System role (name/type locked)' : 'Custom role definition'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={role.isSystem}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Type & Status</Label>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary">{role.type}</Badge>
                {role.isSystem && <Badge variant="outline">System Role</Badge>}
                {role.bypassChecks && (
                  <Badge variant="destructive" className="bg-amber-600">
                    Bypass Checks
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Assigned Permissions ({selectedSlugs.length} active)
              </Label>
              <span className="text-xs text-muted-foreground">Changes apply immediately on save</span>
            </div>

            <div className="space-y-6 border rounded-lg p-4 bg-muted/20">
              {Object.entries(groupedPermissions).map(([domain, perms]) => {
                const domainSlugs = perms.map((p) => p.slug);
                const isAllSelected = domainSlugs.every((s) => selectedSlugs.includes(s));

                return (
                  <div key={domain} className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm capitalize">{domain}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {perms.length} perms
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleDomain(domain)}
                      >
                        {isAllSelected ? 'Deselect Domain' : 'Select Domain'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {perms.map((perm) => {
                        const isChecked = selectedSlugs.includes(perm.slug);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 p-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-primary/10 border-primary/40 text-foreground'
                                : 'bg-background hover:bg-accent border-input'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.slug)}
                              className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
                            />
                            <div>
                              <div className="font-mono font-medium">{perm.slug}</div>
                              <div className="text-muted-foreground text-[11px] mt-0.5">
                                {perm.description}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Changes...' : 'Save Permission Bundle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
