'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getVendorServices,
  createService,
  updateService,
  deleteService,
  publishService,
  addOffering,
  updateOffering,
  deleteOffering,
  ServiceData,
  OfferingData,
} from '@/lib/api/services';
import { getCategories, CategoryData } from '@/lib/api/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function VendorServicesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [services, setServices] = useState<ServiceData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  const [serviceForm, setServiceForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    freeCancellationHours: 24,
    imagesText: '',
  });

  // Offering Modal State
  const [isOfferingModalOpen, setIsOfferingModalOpen] = useState(false);
  const [offeringServiceId, setOfferingServiceId] = useState<string | null>(null);
  const [editingOffering, setEditingOffering] = useState<OfferingData | null>(null);
  const [offeringForm, setOfferingForm] = useState({
    name: '',
    durationMinutes: 30,
    priceRupees: 500,
    isActive: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        getVendorServices(),
        getCategories(),
      ]);

      if (servicesRes.success && servicesRes.data) {
        setServices(servicesRes.data);
      } else {
        setError(servicesRes.error?.message || 'Failed to load services');
      }

      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading services');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      loadData();
    }
  }, [isAuthLoading]);

  // Handle Service Create / Edit
  const handleOpenServiceModal = (srv?: ServiceData) => {
    if (srv) {
      setEditingService(srv);
      setServiceForm({
        title: srv.title,
        description: srv.description,
        categoryId: srv.categoryId,
        freeCancellationHours: srv.freeCancellationHours,
        imagesText: (srv.images || []).join('\n'),
      });
    } else {
      setEditingService(null);
      setServiceForm({
        title: '',
        description: '',
        categoryId: categories[0]?.id || '',
        freeCancellationHours: 24,
        imagesText: '',
      });
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const imagesArray = serviceForm.imagesText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      if (editingService) {
        const res = await updateService(editingService.id, {
          title: serviceForm.title,
          description: serviceForm.description,
          categoryId: serviceForm.categoryId,
          freeCancellationHours: Number(serviceForm.freeCancellationHours),
          images: imagesArray,
        });

        if (res.success) {
          setSuccessMsg('Service updated successfully');
          setIsServiceModalOpen(false);
          loadData();
        } else {
          setError(res.error?.message || 'Failed to update service');
        }
      } else {
        const res = await createService({
          title: serviceForm.title,
          description: serviceForm.description,
          categoryId: serviceForm.categoryId,
          freeCancellationHours: Number(serviceForm.freeCancellationHours),
          images: imagesArray,
        });

        if (res.success) {
          setSuccessMsg('Service created successfully in DRAFT mode');
          setIsServiceModalOpen(false);
          loadData();
        } else {
          setError(res.error?.message || 'Failed to create service');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred saving service');
    }
  };

  const handleDeleteService = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete service "${title}"?`)) return;
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await deleteService(id);
      if (res.success) {
        setSuccessMsg(`Service "${title}" deleted`);
        loadData();
      } else {
        setError(res.error?.message || 'Failed to delete service');
      }
    } catch (err: any) {
      setError(err?.message || 'Error deleting service');
    }
  };

  const handlePublishService = async (srv: ServiceData) => {
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await publishService(srv.id);
      if (res.success) {
        setSuccessMsg(`Service "${srv.title}" is now PUBLISHED!`);
        loadData();
      } else {
        setError(res.error?.message || 'Failed to publish service');
      }
    } catch (err: any) {
      setError(err?.message || 'Error publishing service');
    }
  };

  // Handle Offering Create / Edit
  const handleOpenOfferingModal = (serviceId: string, off?: OfferingData) => {
    setOfferingServiceId(serviceId);
    if (off) {
      setEditingOffering(off);
      setOfferingForm({
        name: off.name,
        durationMinutes: off.durationMinutes,
        priceRupees: off.priceMinorUnits / 100,
        isActive: off.isActive,
      });
    } else {
      setEditingOffering(null);
      setOfferingForm({
        name: '',
        durationMinutes: 30,
        priceRupees: 500,
        isActive: true,
      });
    }
    setIsOfferingModalOpen(true);
  };

  const handleSaveOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offeringServiceId && !editingOffering) return;
    setError(null);
    setSuccessMsg(null);

    const priceMinorUnits = Math.round(Number(offeringForm.priceRupees) * 100);

    try {
      if (editingOffering) {
        const res = await updateOffering(editingOffering.id, {
          name: offeringForm.name,
          durationMinutes: Number(offeringForm.durationMinutes),
          priceMinorUnits,
          isActive: offeringForm.isActive,
        });

        if (res.success) {
          setSuccessMsg('Offering updated successfully');
          setIsOfferingModalOpen(false);
          loadData();
        } else {
          setError(res.error?.message || 'Failed to update offering');
        }
      } else if (offeringServiceId) {
        const res = await addOffering(offeringServiceId, {
          name: offeringForm.name,
          durationMinutes: Number(offeringForm.durationMinutes),
          priceMinorUnits,
        });

        if (res.success) {
          setSuccessMsg('Offering added successfully');
          setIsOfferingModalOpen(false);
          loadData();
        } else {
          setError(res.error?.message || 'Failed to add offering');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error saving offering');
    }
  };

  const handleDeleteOffering = async (offeringId: string, name: string) => {
    if (!confirm(`Delete offering "${name}"?`)) return;
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await deleteOffering(offeringId);
      if (res.success) {
        setSuccessMsg(`Offering "${name}" deleted`);
        loadData();
      } else {
        setError(res.error?.message || 'Failed to delete offering');
      }
    } catch (err: any) {
      setError(err?.message || 'Error deleting offering');
    }
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Service Catalogue</h1>
          <p className="text-sm text-muted-foreground">
            Manage your service offerings, pricing, and publish status.
          </p>
        </div>
        <Button onClick={() => handleOpenServiceModal()}>+ Create New Service</Button>
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

      {services.length === 0 ? (
        <Card className="p-8 text-center">
          <CardTitle className="text-lg">No Services Yet</CardTitle>
          <CardDescription className="mt-2">
            Create your first service listing to start offering services to customers.
          </CardDescription>
          <Button className="mt-4" onClick={() => handleOpenServiceModal()}>
            Create Service
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {services.map((srv) => {
            const activeOfferings = (srv.offerings || []).filter((o) => o.isActive);

            return (
              <Card key={srv.id} className="border shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between pb-3 bg-muted/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl font-bold">{srv.title}</CardTitle>
                      <Badge
                        variant={
                          srv.status === 'PUBLISHED'
                            ? 'default'
                            : srv.status === 'SUSPENDED'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {srv.status}
                      </Badge>
                      {srv.category && (
                        <Badge variant="secondary" className="text-xs">
                          {srv.category.name}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm line-clamp-2">
                      {srv.description}
                    </CardDescription>
                    <p className="text-xs text-muted-foreground pt-1">
                      Free cancellation up to {srv.freeCancellationHours} hours before slot time.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {srv.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handlePublishService(srv)}
                      >
                        Publish Service
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenServiceModal(srv)}
                    >
                      Edit Service
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteService(srv.id, srv.title)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>

                {srv.status === 'SUSPENDED' && (
                  <div className="px-6 py-2 bg-rose-500/10 border-y border-rose-500/20 text-rose-800 text-xs">
                    ⚠️ <strong>Suspended by Admin:</strong> {srv.suspendedReason || 'No reason specified'}
                  </div>
                )}

                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm tracking-wide text-foreground">
                      Offerings / Options ({srv.offerings?.length || 0})
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-primary"
                      onClick={() => handleOpenOfferingModal(srv.id)}
                    >
                      + Add Offering
                    </Button>
                  </div>

                  {srv.offerings && srv.offerings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {srv.offerings.map((off) => (
                        <div
                          key={off.id}
                          className={`p-3 rounded-lg border flex flex-col justify-between ${
                            off.isActive ? 'bg-background' : 'bg-muted/40 opacity-70'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">{off.name}</span>
                              <Badge variant={off.isActive ? 'outline' : 'secondary'} className="text-[10px]">
                                {off.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>⏱️ {off.durationMinutes} mins</span>
                              <span className="font-semibold text-foreground">
                                ₹{(off.priceMinorUnits / 100).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1 pt-3 border-t mt-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleOpenOfferingModal(srv.id, off)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleDeleteOffering(off.id, off.name)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                      No offerings created yet. Add at least 1 active offering before publishing this service.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Service Create/Edit Modal */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveService}>
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Edit Service Details' : 'Create New Service'}
              </DialogTitle>
              <DialogDescription>
                Fill in service information. New services start as DRAFT until published.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="srvTitle">Service Title</Label>
                <Input
                  id="srvTitle"
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  placeholder="e.g. Premium Home Deep Cleaning"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="srvCat">Category</Label>
                <select
                  id="srvCat"
                  className="w-full h-10 px-3 py-2 rounded-md border text-sm bg-background"
                  value={serviceForm.categoryId}
                  onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
                  required
                >
                  <option value="" disabled>-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? `└ ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="srvDesc">Description</Label>
                <textarea
                  id="srvDesc"
                  className="w-full min-h-[100px] p-3 rounded-md border text-sm bg-background"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Describe your service in detail..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="srvCancelHours">Free Cancellation Window (Hours)</Label>
                <Input
                  id="srvCancelHours"
                  type="number"
                  min={0}
                  value={serviceForm.freeCancellationHours}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, freeCancellationHours: Number(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="srvImages">Images / Attachments Filenames (One per line)</Label>
                <textarea
                  id="srvImages"
                  className="w-full min-h-[60px] p-2 rounded-md border text-xs bg-background font-mono"
                  value={serviceForm.imagesText}
                  onChange={(e) => setServiceForm({ ...serviceForm, imagesText: e.target.value })}
                  placeholder="cleaning_banner.jpg&#10;cleaner_1.png"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsServiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Service</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offering Create/Edit Modal */}
      <Dialog open={isOfferingModalOpen} onOpenChange={setIsOfferingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveOffering}>
            <DialogHeader>
              <DialogTitle>
                {editingOffering ? 'Edit Offering' : 'Add New Offering'}
              </DialogTitle>
              <DialogDescription>
                An offering represents a specific package, duration, and price.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="offName">Offering Name</Label>
                <Input
                  id="offName"
                  value={offeringForm.name}
                  onChange={(e) => setOfferingForm({ ...offeringForm, name: e.target.value })}
                  placeholder="e.g. 2 BHK Deep Clean, 60 min Swedish Massage"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offDuration">Duration (Minutes)</Label>
                  <Input
                    id="offDuration"
                    type="number"
                    min={1}
                    value={offeringForm.durationMinutes}
                    onChange={(e) =>
                      setOfferingForm({ ...offeringForm, durationMinutes: Number(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offPrice">Price (₹ INR)</Label>
                  <Input
                    id="offPrice"
                    type="number"
                    min={0}
                    step={1}
                    value={offeringForm.priceRupees}
                    onChange={(e) =>
                      setOfferingForm({ ...offeringForm, priceRupees: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              {editingOffering && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="offActive"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={offeringForm.isActive}
                    onChange={(e) =>
                      setOfferingForm({ ...offeringForm, isActive: e.target.checked })
                    }
                  />
                  <Label htmlFor="offActive" className="text-sm font-normal">
                    Offering is Active and available for booking
                  </Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOfferingModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Offering</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
