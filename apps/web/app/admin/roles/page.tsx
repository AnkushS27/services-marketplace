'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RolesList } from './components/roles-list';
import { CreateRoleDialog } from './components/create-role-dialog';
import { EditRoleDialog, RoleData } from './components/edit-role-dialog';
import { CreateSubAdminDialog } from './components/create-sub-admin-dialog';
import { AssignRoleDialog } from './components/assign-role-dialog';

export default function AdminRolesPage() {
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth();

  const [roles, setRoles] = useState<RoleData[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog States
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [isCreateSubAdminOpen, setIsCreateSubAdminOpen] = useState(false);
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiFetch<RoleData[]>('/roles'),
        apiFetch<{ grouped: Record<string, any[]> }>('/permissions'),
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
      if (permsRes.success && permsRes.data) {
        setGroupedPermissions(permsRes.data.grouped || {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load roles and permissions data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && user) {
      loadData();
    }
  }, [isAuthLoading, user, loadData]);

  const handleDeleteRole = async (role: RoleData) => {
    if (role.isSystem) return;
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    try {
      await apiFetch(`/roles/${role.id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  const canCreateRole = hasPermission('role.create');
  const canAssignRole = hasPermission('role.assign');
  const canCreateAdmin = hasPermission('admin.create');

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Roles & Permissions Engine</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage data-driven permissions, define custom system roles, and manage sub-admin privileges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canCreateRole && (
            <Button onClick={() => setIsCreateRoleOpen(true)}>
              + Create Role
            </Button>
          )}

          {canCreateAdmin && (
            <Button variant="outline" onClick={() => setIsCreateSubAdminOpen(true)}>
              + Sub-Admin Account
            </Button>
          )}

          {canAssignRole && (
            <Button variant="secondary" onClick={() => setIsAssignRoleOpen(true)}>
              Reassign User Role
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <RolesList
        roles={roles}
        onEdit={(role) => setEditingRole(role)}
        onDelete={handleDeleteRole}
      />

      {/* Dialog Modals */}
      <CreateRoleDialog
        isOpen={isCreateRoleOpen}
        onClose={() => setIsCreateRoleOpen(false)}
        onSuccess={loadData}
        groupedPermissions={groupedPermissions}
      />

      <EditRoleDialog
        role={editingRole}
        isOpen={!!editingRole}
        onClose={() => setEditingRole(null)}
        onSuccess={loadData}
        groupedPermissions={groupedPermissions}
      />

      <CreateSubAdminDialog
        isOpen={isCreateSubAdminOpen}
        onClose={() => setIsCreateSubAdminOpen(false)}
        onSuccess={loadData}
        roles={roles}
      />

      <AssignRoleDialog
        isOpen={isAssignRoleOpen}
        onClose={() => setIsAssignRoleOpen(false)}
        onSuccess={loadData}
        roles={roles}
      />
    </div>
  );
}
