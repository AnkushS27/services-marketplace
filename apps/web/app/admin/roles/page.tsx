'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { RolesList } from './components/roles-list';
import { CreateRoleDialog } from './components/create-role-dialog';
import { EditRoleDialog, RoleData } from './components/edit-role-dialog';
import { CreateSubAdminDialog } from './components/create-sub-admin-dialog';
import { AssignRoleDialog } from './components/assign-role-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { ShieldCheckIcon, PlusIcon, UserPlusIcon, UserCheckIcon } from 'lucide-react';

export default function AdminRolesPage() {
  const { user, hasPermission, isLoading: isAuthLoading } = useAuth();

  const [roles, setRoles] = useState<RoleData[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog States
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [isCreateSubAdminOpen, setIsCreateSubAdminOpen] = useState(false);
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);

  // Confirm Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiFetch<RoleData[]>('/roles'),
        apiFetch<{ grouped: Record<string, any[]> }>('/permissions'),
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      } else {
        toast.add({
          title: 'Error loading roles',
          description: rolesRes.error?.message || 'Failed to fetch roles',
          type: 'error',
        });
      }
      if (permsRes.success && permsRes.data) {
        setGroupedPermissions(permsRes.data.grouped || {});
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err.message || 'Failed to load roles and permissions data',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && user) {
      loadData();
    }
  }, [isAuthLoading, user, loadData]);

  const promptDeleteRole = (role: RoleData) => {
    if (role.isSystem) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete System Role',
      description: `Are you sure you want to delete role "${role.name}"? Users assigned to this role must be reassigned.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await apiFetch(`/roles/${role.id}`, { method: 'DELETE' });
          if (res.success) {
            toast.add({
              title: 'Role Deleted',
              description: `Role "${role.name}" was successfully deleted.`,
              type: 'success',
            });
            loadData();
          } else {
            toast.add({
              title: 'Delete Failed',
              description: res.error?.message || 'Failed to delete role',
              type: 'error',
            });
          }
        } catch (err: any) {
          toast.add({
            title: 'Error',
            description: err.message || 'Failed to delete role',
            type: 'error',
          });
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border bg-card/60" />
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheckIcon className="w-6 h-6 text-primary" />
            <span>Roles & Permissions Engine</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage data-driven permissions, define custom system roles, and manage sub-admin privileges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canCreateRole && (
            <Button onClick={() => setIsCreateRoleOpen(true)} className="gap-1.5 font-semibold bg-primary text-primary-foreground">
              <PlusIcon className="w-4 h-4" />
              <span>Create Role</span>
            </Button>
          )}

          {canCreateAdmin && (
            <Button variant="outline" onClick={() => setIsCreateSubAdminOpen(true)} className="gap-1.5 font-semibold border-border">
              <UserPlusIcon className="w-4 h-4 text-primary" />
              <span>Sub-Admin Account</span>
            </Button>
          )}

          {canAssignRole && (
            <Button variant="secondary" onClick={() => setIsAssignRoleOpen(true)} className="gap-1.5 font-semibold">
              <UserCheckIcon className="w-4 h-4" />
              <span>Reassign User Role</span>
            </Button>
          )}
        </div>
      </div>

      <RolesList
        roles={roles}
        onEdit={(role) => setEditingRole(role)}
        onDelete={promptDeleteRole}
      />

      {/* Dialog Modals */}
      <CreateRoleDialog
        isOpen={isCreateRoleOpen}
        onClose={() => setIsCreateRoleOpen(false)}
        onSuccess={() => {
          toast.add({ title: 'Role Created', description: 'New custom role definition created.', type: 'success' });
          loadData();
        }}
        groupedPermissions={groupedPermissions}
      />

      <EditRoleDialog
        role={editingRole}
        isOpen={!!editingRole}
        onClose={() => setEditingRole(null)}
        onSuccess={() => {
          toast.add({ title: 'Role Updated', description: 'Role permissions updated successfully.', type: 'success' });
          loadData();
        }}
        groupedPermissions={groupedPermissions}
      />

      <CreateSubAdminDialog
        isOpen={isCreateSubAdminOpen}
        onClose={() => setIsCreateSubAdminOpen(false)}
        onSuccess={() => {
          toast.add({ title: 'Sub-Admin Created', description: 'New sub-admin user account created.', type: 'success' });
          loadData();
        }}
        roles={roles}
      />

      <AssignRoleDialog
        isOpen={isAssignRoleOpen}
        onClose={() => setIsAssignRoleOpen(false)}
        onSuccess={() => {
          toast.add({ title: 'Role Reassigned', description: 'User role updated successfully.', type: 'success' });
          loadData();
        }}
        roles={roles}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="destructive"
        isLoading={actionLoading}
      />
    </div>
  );
}
