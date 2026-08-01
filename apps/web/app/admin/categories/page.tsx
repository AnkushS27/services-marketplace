'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PERMISSIONS } from '@/lib/constants';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  CategoryData,
} from '@/lib/api/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import {
  FolderIcon,
  FolderPlusIcon,
  PlusIcon,
  Edit3Icon,
  Trash2Icon,
  LayersIcon,
  Loader2Icon,
  TagIcon,
  ShieldCheckIcon,
} from 'lucide-react';

export default function AdminCategoriesPage() {
  const { hasPermission, isLoading: isAuthLoading } = useAuth();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '',
  });

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

  const canCreate = hasPermission(PERMISSIONS.CATEGORY_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.CATEGORY_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.CATEGORY_DELETE);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const res = await getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      } else {
        toast.add({
          title: 'Error loading categories',
          description: res.error?.message || 'Failed to fetch categories',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'An error occurred fetching categories',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      loadCategories();
    }
  }, [isAuthLoading]);

  const handleOpenDialog = (cat?: CategoryData, parentIdForSub?: string) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name,
        slug: cat.slug || '',
        parentId: cat.parentId || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        parentId: parentIdForSub || '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, {
          name: formData.name,
          parentId: formData.parentId || undefined,
        });
        if (res.success) {
          toast.add({
            title: 'Category Updated',
            description: `"${formData.name}" updated successfully.`,
            type: 'success',
          });
          setIsDialogOpen(false);
          loadCategories();
        } else {
          toast.add({
            title: 'Update Failed',
            description: res.error?.message || 'Failed to update category',
            type: 'error',
          });
        }
      } else {
        const res = await createCategory({
          name: formData.name,
          slug: formData.slug || undefined,
          parentId: formData.parentId || undefined,
        });
        if (res.success) {
          toast.add({
            title: 'Category Created',
            description: `"${formData.name}" created successfully.`,
            type: 'success',
          });
          setIsDialogOpen(false);
          loadCategories();
        } else {
          toast.add({
            title: 'Creation Failed',
            description: res.error?.message || 'Failed to create category',
            type: 'error',
          });
        }
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'An error occurred saving category',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const promptDeleteCategory = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Category',
      description: `Are you sure you want to delete category "${name}"? If it has sub-categories or linked services, deletion will be blocked.`,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await deleteCategory(id);
          if (res.success) {
            toast.add({
              title: 'Category Deleted',
              description: `Category "${name}" was permanently deleted.`,
              type: 'success',
            });
            loadCategories();
          } else {
            toast.add({
              title: 'Delete Failed',
              description: res.error?.message || 'Failed to delete category',
              type: 'error',
            });
          }
        } catch (err: any) {
          toast.add({
            title: 'Error',
            description: err?.message || 'Error deleting category',
            type: 'error',
          });
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-48 w-full animate-pulse rounded-2xl bg-card border border-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheckIcon className="w-6 h-6 text-primary" />
            <span>Category Taxonomy Management</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize service categories into a clean 2-level hierarchy (Parent → Sub-category).
          </p>
        </div>

        {canCreate && (
          <Button
            onClick={() => handleOpenDialog()}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <FolderPlusIcon className="w-4 h-4" />
            <span>+ Add Parent Category</span>
          </Button>
        )}
      </div>

      {parentCategories.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-border bg-card/60">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
            <FolderIcon className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold">No Categories Found</CardTitle>
          <CardDescription className="mt-2 text-sm max-w-md mx-auto">
            Create your first parent service category to start organizing services for vendors and customers.
          </CardDescription>
          {canCreate && (
            <Button className="mt-6 gap-2" onClick={() => handleOpenDialog()}>
              <PlusIcon className="w-4 h-4" />
              <span>Create First Category</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {parentCategories.map((parent) => (
            <Card key={parent.id} className="border border-border bg-card shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 bg-secondary/40 border-b border-border/80 p-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <FolderIcon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground">{parent.name}</CardTitle>
                    <Badge variant="outline" className="text-xs font-mono">
                      slug: {parent.slug}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground pt-1">
                    ID: {parent.id}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {canCreate && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 font-semibold text-xs"
                      onClick={() => handleOpenDialog(undefined, parent.id)}
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Sub-category</span>
                    </Button>
                  )}
                  {canUpdate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs font-semibold"
                      onClick={() => handleOpenDialog(parent)}
                    >
                      <Edit3Icon className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => promptDeleteCategory(parent.id, parent.name)}
                    >
                      <Trash2Icon className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {parent.children && parent.children.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parent.children.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20 hover:border-primary/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <TagIcon className="w-4 h-4 text-primary" />
                            <span className="font-bold text-sm text-foreground">{sub.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">slug: {sub.slug}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs font-semibold gap-1"
                              onClick={() => handleOpenDialog(sub)}
                            >
                              <Edit3Icon className="w-3 h-3" />
                              <span>Edit</span>
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => promptDeleteCategory(sub.id, sub.name)}
                            >
                              <Trash2Icon className="w-3 h-3" />
                              <span>Delete</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No sub-categories added under this parent category yet.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Create/Edit Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                <FolderIcon className="w-5 h-5 text-primary" />
                <span>
                  {editingCategory
                    ? 'Edit Category'
                    : formData.parentId
                    ? 'Add Sub-category'
                    : 'Add Parent Category'}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Define category name and nesting structure.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-xs font-semibold">Category Name</Label>
                <Input
                  id="catName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Home Cleaning, Massage Therapy"
                  required
                />
              </div>

              {!editingCategory && (
                <div className="space-y-1.5">
                  <Label htmlFor="catSlug" className="text-xs font-semibold">Slug (Optional)</Label>
                  <Input
                    id="catSlug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. home-cleaning (auto-generated if left blank)"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="parentCat" className="text-xs font-semibold">Parent Category (Optional)</Label>
                <select
                  id="parentCat"
                  className="w-full h-10 px-3 py-2 rounded-md border border-input text-sm bg-background text-foreground"
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                >
                  <option value="">-- None (Top Level Parent Category) --</option>
                  {parentCategories
                    .filter((p) => p.id !== editingCategory?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Hierarchy is limited to max 2 levels (Parent → Child).
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading} className="gap-1.5">
                {actionLoading && <Loader2Icon className="w-4 h-4 animate-spin" />}
                <span>Save Category</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog Component */}
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
