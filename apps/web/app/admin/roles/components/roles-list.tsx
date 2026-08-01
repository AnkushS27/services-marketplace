'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { RoleData } from './edit-role-dialog';

interface RolesListProps {
  roles: RoleData[];
  userCountMap?: Record<string, number>;
  onEdit: (role: RoleData) => void;
  onDelete: (role: RoleData) => void;
}

export function RolesList({ roles, onEdit, onDelete }: RolesListProps) {
  if (!roles || roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
        <p className="text-muted-foreground font-medium">No roles defined yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {roles.map((role) => {
        const userCount = (role as any).userCount ?? 0;
        return (
          <Card key={role.id} className="flex flex-col justify-between transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-bold tracking-tight">{role.name}</CardTitle>
                <div className="flex flex-wrap gap-1 items-center justify-end">
                  <Badge
                    variant={
                      role.type === 'ADMIN'
                        ? 'default'
                        : role.type === 'VENDOR'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-[10px]"
                  >
                    {role.type}
                  </Badge>
                  {role.isSystem && (
                    <Badge variant="outline" className="text-[10px] bg-muted/50">
                      System
                    </Badge>
                  )}
                  {role.bypassChecks && (
                    <Badge variant="destructive" className="text-[10px]">
                      Bypass Checks
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                <span>{userCount} {userCount === 1 ? 'user' : 'users'} assigned</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="py-2 flex-1">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Permissions ({role.bypassChecks ? 'ALL' : role.permissions.length}):
              </div>

              {role.bypassChecks ? (
                <p className="text-xs italic text-amber-600 dark:text-amber-400 font-medium">
                  Bypasses all permission checks (Super Admin privilege)
                </p>
              ) : (
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                  {role.permissions.map((slug) => (
                    <Badge key={slug} variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                      {slug}
                    </Badge>
                  ))}
                  {role.permissions.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No explicit permissions</span>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-3 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onEdit(role)}
              >
                Edit Permissions
              </Button>

              {!role.isSystem && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={userCount > 0}
                  title={userCount > 0 ? 'Cannot delete role with assigned users' : 'Delete role'}
                  onClick={() => onDelete(role)}
                >
                  Delete
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
