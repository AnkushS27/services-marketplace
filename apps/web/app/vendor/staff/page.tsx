'use client';

import React, { useState, useEffect } from 'react';
import {
  getVendorStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  StaffData,
} from '@/lib/api/staff';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import {
  UsersIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  UserCheckIcon,
  UserXIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  Loader2Icon,
  CheckCircle2Icon,
} from 'lucide-react';

export default function VendorStaffPage() {
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffData | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffActive, setStaffActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm Modal State
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStaff = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getVendorStaff();
      if (res.success && res.data) {
        setStaffList(res.data);
      } else {
        setError(res.error?.message || 'Failed to fetch staff roster');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setStaffName('');
    setStaffActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffData) => {
    setEditingStaff(staff);
    setStaffName(staff.name);
    setStaffActive(staff.isActive);
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) {
      toast.add({
        title: 'Validation Error',
        description: 'Staff name cannot be empty',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        const res = await updateStaff(editingStaff.id, staffName, staffActive);
        if (res.success) {
          toast.add({
            title: 'Staff Updated',
            description: `Updated details for ${staffName}`,
            type: 'success',
          });
          setIsModalOpen(false);
          fetchStaff();
        } else {
          toast.add({
            title: 'Update Failed',
            description: res.error?.message || 'Could not update staff member',
            type: 'error',
          });
        }
      } else {
        const res = await createStaff(staffName, staffActive);
        if (res.success) {
          toast.add({
            title: 'Staff Member Added',
            description: `Successfully added ${staffName} to staff roster`,
            type: 'success',
          });
          setIsModalOpen(false);
          fetchStaff();
        } else {
          toast.add({
            title: 'Addition Failed',
            description: res.error?.message || 'Could not add staff member',
            type: 'error',
          });
        }
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Operation failed',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActiveStatus = async (staff: StaffData) => {
    try {
      const res = await updateStaff(staff.id, undefined, !staff.isActive);
      if (res.success) {
        toast.add({
          title: 'Status Updated',
          description: `${staff.name} is now ${!staff.isActive ? 'Active' : 'Inactive'}`,
          type: 'success',
        });
        fetchStaff();
      } else {
        toast.add({
          title: 'Status Update Failed',
          description: res.error?.message || 'Could not update status',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to toggle status',
        type: 'error',
      });
    }
  };

  const handleDeleteStaff = async () => {
    if (!deletingStaffId) return;

    setIsDeleting(true);
    try {
      const res = await deleteStaff(deletingStaffId);
      if (res.success) {
        toast.add({
          title: 'Staff Member Removed',
          description: 'Staff member removed from roster',
          type: 'success',
        });
        setDeletingStaffId(null);
        fetchStaff();
      } else {
        toast.add({
          title: 'Deletion Failed',
          description: res.error?.message || 'Could not delete staff member',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to remove staff member',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <UsersIcon className="w-6 h-6" />
            </div>
            <span>Staff Roster Management</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your service staff. Active staff determine maximum concurrent service capacity across all offerings.
          </p>
        </div>

        <Button
          onClick={handleOpenAddModal}
          className="gap-2 font-bold bg-primary hover:bg-primary/90 shadow-xs"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Staff Member</span>
        </Button>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-6 space-y-4 animate-pulse bg-card border-border">
              <div className="h-6 w-32 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 border-destructive/30 bg-destructive/5 text-center space-y-4">
          <AlertCircleIcon className="w-8 h-8 text-destructive mx-auto" />
          <CardTitle className="text-lg font-bold text-destructive">Failed to Load Staff</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{error}</CardDescription>
          <Button variant="outline" onClick={fetchStaff} className="gap-2 mx-auto">
            <RefreshCwIcon className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </Card>
      ) : staffList.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-dashed border-2 border-border bg-card">
          <UsersIcon className="w-12 h-12 text-muted-foreground/60 mx-auto" />
          <CardTitle className="text-lg font-bold text-foreground">No Staff Members Added</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Add staff members to assign them to customer bookings and enforce accurate cross-offering capacity.
          </CardDescription>
          <Button onClick={handleOpenAddModal} className="gap-2 font-bold mx-auto">
            <PlusIcon className="w-4 h-4" />
            <span>Add First Staff Member</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((staff) => (
            <Card
              key={staff.id}
              className="p-5 border border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-foreground truncate">{staff.name}</h3>
                  <Badge
                    variant={staff.isActive ? 'default' : 'outline'}
                    className={`font-bold gap-1 text-[11px] ${
                      staff.isActive
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'text-muted-foreground border-border'
                    }`}
                  >
                    {staff.isActive ? (
                      <>
                        <UserCheckIcon className="w-3 h-3" />
                        ACTIVE
                      </>
                    ) : (
                      <>
                        <UserXIcon className="w-3 h-3" />
                        INACTIVE
                      </>
                    )}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Added on {new Date(staff.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActiveStatus(staff)}
                  className="text-xs font-semibold"
                >
                  {staff.isActive ? 'Deactivate' : 'Activate'}
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditModal(staff)}
                    className="h-8 w-8 p-0"
                    title="Edit Name"
                  >
                    <PencilIcon className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingStaffId(staff.id)}
                    className="h-8 w-8 p-0 hover:text-destructive"
                    title="Delete Staff"
                  >
                    <Trash2Icon className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Staff Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide staff member details below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStaff} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Staff Name</Label>
              <Input
                placeholder="e.g. Alex Rivera"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold cursor-pointer">Active Status</Label>
                <p className="text-[11px] text-muted-foreground">
                  Active staff members can be assigned to bookings and count towards capacity.
                </p>
              </div>
              <input
                type="checkbox"
                checked={staffActive}
                onChange={(e) => setStaffActive(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="font-bold gap-1.5"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingStaff ? 'Save Changes' : 'Add Staff'}</span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingStaffId} onOpenChange={() => setDeletingStaffId(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5" />
              <span>Remove Staff Member</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove this staff member from your roster? Existing bookings will preserve historical record.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingStaffId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="font-bold gap-1.5"
              onClick={handleDeleteStaff}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Confirm Delete</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
