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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminCategoriesPage() {
  const { hasPermission, isLoading: isAuthLoading } = useAuth();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '',
  });

  const canCreate = hasPermission(PERMISSIONS.CATEGORY_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.CATEGORY_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.CATEGORY_DELETE);

  const loadCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      } else {
        setError(res.error?.message || 'Failed to fetch categories');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred fetching categories');
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
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, {
          name: formData.name,
          parentId: formData.parentId || undefined,
        });
        if (res.success) {
          setSuccessMsg('Category updated successfully');
          setIsDialogOpen(false);
          loadCategories();
        } else {
          setError(res.error?.message || 'Failed to update category');
        }
      } else {
        const res = await createCategory({
          name: formData.name,
          slug: formData.slug || undefined,
          parentId: formData.parentId || undefined,
        });
        if (res.success) {
          setSuccessMsg('Category created successfully');
          setIsDialogOpen(false);
          loadCategories();
        } else {
          setError(res.error?.message || 'Failed to create category');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred saving category');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await deleteCategory(id);
      if (res.success) {
        setSuccessMsg(`Category "${name}" deleted`);
        loadCategories();
      } else {
        setError(res.error?.message || 'Failed to delete category');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred deleting category');
    }
  };

  // Top level categories
  const parentCategories = categories.filter((c) => !c.parentId);

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Category Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage 2-level service category taxonomy (Parent → Sub-category).
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => handleOpenDialog()}>+ Add Parent Category</Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert variant="default" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {parentCategories.length === 0 ? (
        <Card className="p-8 text-center">
          <CardTitle className="text-lg">No Categories Found</CardTitle>
          <CardDescription className="mt-2">
            Create your first service category to start organizing services.
          </CardDescription>
          {canCreate && (
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              Create Category
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {parentCategories.map((parent) => (
            <Card key={parent.id} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold">{parent.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      slug: {parent.slug}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    ID: {parent.id}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {canCreate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(undefined, parent.id)}
                    >
                      + Sub-category
                    </Button>
                  )}
                  {canUpdate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(parent)}
                    >
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(parent.id, parent.name)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {parent.children && parent.children.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parent.children.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-sm">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">slug: {sub.slug}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() => handleOpenDialog(sub)}
                            >
                              Edit
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleDelete(sub.id, sub.name)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No sub-categories added under this category yet.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingCategory
                  ? 'Edit Category'
                  : formData.parentId
                  ? 'Add Sub-category'
                  : 'Add Parent Category'}
              </DialogTitle>
              <DialogDescription>
                Categories allow vendors and customers to browse services cleanly.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="catName">Category Name</Label>
                <Input
                  id="catName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Home Cleaning, Massage Therapy"
                  required
                />
              </div>

              {!editingCategory && (
                <div className="space-y-2">
                  <Label htmlFor="catSlug">Slug (Optional)</Label>
                  <Input
                    id="catSlug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. home-cleaning (auto-generated if left blank)"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="parentCat">Parent Category (Optional)</Label>
                <select
                  id="parentCat"
                  className="w-full h-10 px-3 py-2 rounded-md border text-sm bg-background"
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
                <p className="text-xs text-muted-foreground">
                  Categories cannot exceed 2 levels of nesting.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Category</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
