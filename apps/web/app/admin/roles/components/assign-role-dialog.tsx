'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2Icon, SearchIcon, UserCheckIcon, UsersIcon } from 'lucide-react';

export interface RoleOption {
  id: string;
  name: string;
  type: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
  bypassChecks?: boolean;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
    type: string;
  };
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
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users list when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      setError(null);
      try {
        const res = await apiFetch<UserOption[]>('/admin/users');
        if (res.success && res.data) {
          setUsers(res.data);
          if (res.data.length > 0 && !selectedUserId) {
            setSelectedUserId(res.data[0].id);
            setSelectedRoleId(res.data[0].role.id);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load system users');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  // Handle user selection change: pre-select their current role or leave as is
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      setSelectedRoleId(targetUser.role.id);
    }
  };

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchFilter.trim()) return users;
    const term = searchFilter.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.name.toLowerCase().includes(term),
    );
  }, [users, searchFilter]);

  // Group filtered users by role name for clean separation in optgroups
  const groupedUsers = useMemo(() => {
    const groups: Record<string, UserOption[]> = {};

    // Sort order: ADMIN roles first, VENDOR roles second, CUSTOMER roles third
    const roleTypeOrder: Record<string, number> = { ADMIN: 1, VENDOR: 2, CUSTOMER: 3 };

    const sorted = [...filteredUsers].sort((a, b) => {
      const orderA = roleTypeOrder[a.role.type] || 4;
      const orderB = roleTypeOrder[b.role.type] || 4;
      if (orderA !== orderB) return orderA - orderB;
      return a.role.name.localeCompare(b.role.name);
    });

    sorted.forEach((user) => {
      const groupKey = `${user.role.name} (${user.role.type})`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(user);
    });

    return groups;
  }, [filteredUsers]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId],
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a target user');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const finalRoleId = selectedRoleId || (roles[0]?.id ?? '');
      await apiFetch(`/admin/users/${selectedUserId}/role`, {
        method: 'POST',
        body: JSON.stringify({
          roleId: finalRoleId,
        }),
      });
      onSuccess();
      onClose();
      setSelectedUserId('');
      setSearchFilter('');
    } catch (err: any) {
      setError(err.message || 'Failed to reassign user role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in-0">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <UserCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Reassign User Role</h2>
              <p className="text-xs text-muted-foreground">Select a registered user to assign a new role</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Search & Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="select-user" className="font-semibold text-sm">
                Select Target User
              </Label>
              {users.length > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  {users.length} total users
                </span>
              )}
            </div>

            {isLoadingUsers ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground border border-border rounded-xl bg-secondary/30">
                <Loader2Icon className="w-4 h-4 animate-spin text-primary" />
                <span>Loading system accounts roster...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Search input for fast user filter */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search user by name, email or role..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-9 h-9 text-xs bg-secondary/50 border-border"
                  />
                </div>

                {/* Grouped Select List */}
                <select
                  id="select-user"
                  className="w-full h-11 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  value={selectedUserId}
                  onChange={(e) => handleUserChange(e.target.value)}
                  required
                >
                  {Object.keys(groupedUsers).length === 0 ? (
                    <option value="" disabled>
                      No matching users found
                    </option>
                  ) : (
                    Object.entries(groupedUsers).map(([groupLabel, userList]) => (
                      <optgroup key={groupLabel} label={`── ${groupLabel} ──`}>
                        {userList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email}) — Current Role: {u.role.name}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Selected User Details Summary */}
          {selectedUser && (
            <div className="p-3.5 rounded-xl border border-border bg-secondary/40 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{selectedUser.name}</span>
                <Badge variant="outline" className="text-[10px] bg-secondary text-primary font-bold border-primary/20">
                  Current: {selectedUser.role.name}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono truncate">{selectedUser.email}</p>
            </div>
          )}

          {/* Target Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="assign-role-id" className="font-semibold text-sm">
              New Assigned Role
            </Label>
            <select
              id="assign-role-id"
              className="w-full h-11 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              value={selectedRoleId || (roles[0]?.id ?? '')}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type}) {r.bypassChecks ? '— [SUPER ADMIN]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedUserId || isLoadingUsers}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </span>
              ) : (
                'Confirm Role Reassignment'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
