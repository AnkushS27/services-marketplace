'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { RoleData } from './edit-role-dialog';
import { Edit3Icon, Trash2Icon, ShieldCheckIcon } from 'lucide-react';

interface RolesListProps {
  roles: RoleData[];
  userCountMap?: Record<string, number>;
  onEdit: (role: RoleData) => void;
  onDelete: (role: RoleData) => void;
}

export function RolesList({ roles, onEdit, onDelete }: RolesListProps) {
  if (!roles || roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border text-center bg-card">
        <ShieldCheckIcon className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground font-medium text-sm">No roles defined yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {roles.map((role) => {
        const userCount = (role as any).userCount ?? 0;
        return (
          <Card key={role.id} className="flex flex-col justify-between border border-border bg-card shadow-xs rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <CardHeader className="p-6 pb-4 border-b border-border/40 bg-secondary/20 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">{role.name}</CardTitle>
                <div className="flex flex-wrap gap-1.5 items-center justify-end">
                  <Badge
                    variant={
                      role.type === 'ADMIN'
                        ? 'default'
                        : role.type === 'VENDOR'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-[10px] font-bold"
                  >
                    {role.type}
                  </Badge>
                  {role.isSystem && (
                    <Badge variant="outline" className="text-[10px] bg-secondary/50 font-semibold border-border">
                      System
                    </Badge>
                  )}
                  {role.bypassChecks && (
                    <Badge variant="destructive" className="text-[10px] font-bold">
                      Bypass Checks
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                {userCount} {userCount === 1 ? 'user' : 'users'} assigned
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 flex-1 space-y-2">
              <div className="text-xs font-bold text-muted-foreground">
                Permissions ({role.bypassChecks ? 'ALL' : role.permissions.length}):
              </div>

              {role.bypassChecks ? (
                <p className="text-xs italic text-amber-700 font-semibold">
                  ⚡ Bypasses all permission checks (Super Admin privilege)
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {role.permissions.map((slug) => (
                    <Badge key={slug} variant="secondary" className="font-mono text-[10px] px-2 py-0.5 border border-border/40">
                      {slug}
                    </Badge>
                  ))}
                  {role.permissions.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No explicit permissions</span>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="p-6 pt-4 border-t border-border/60 bg-secondary/30 rounded-b-2xl flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 border-border"
                onClick={() => onEdit(role)}
              >
                <Edit3Icon className="w-3.5 h-3.5 text-primary" />
                <span>Edit Permissions</span>
              </Button>

              {!role.isSystem && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5"
                  disabled={userCount > 0}
                  title={userCount > 0 ? 'Cannot delete role with assigned users' : 'Delete role'}
                  onClick={() => onDelete(role)}
                >
                  <Trash2Icon className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
