'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import {
  PlusIcon,
  Edit3Icon,
  Trash2Icon,
  GlobeIcon,
  AlertTriangleIcon,
  ClockIcon,
  IndianRupeeIcon,
  LayersIcon,
  CheckCircle2Icon,
  Loader2Icon,
  SparklesIcon,
  TagIcon,
  FileTextIcon,
  CalendarIcon,
} from 'lucide-react';

export default function VendorServicesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [services, setServices] = useState<ServiceData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        getVendorServices(),
        getCategories(),
      ]);

      if (servicesRes.success && servicesRes.data) {
        setServices(servicesRes.data);
      } else {
        toast.add({
          title: 'Error loading services',
          description: servicesRes.error?.message || 'Failed to fetch services',
          type: 'error',
        });
      }

      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Error loading catalogue data',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      loadData();
    }
  }, [isAuthLoading]);

  // Handle Service Modal Open
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

  // Handle Save Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

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
          toast.add({
            title: 'Service Updated',
            description: `"${serviceForm.title}" details updated successfully.`,
            type: 'success',
          });
          setIsServiceModalOpen(false);
          loadData();
        } else {
          toast.add({
            title: 'Update Failed',
            description: res.error?.message || 'Failed to update service',
            type: 'error',
          });
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
          toast.add({
            title: 'Service Created',
            description: `"${serviceForm.title}" created in DRAFT mode. Add offerings to publish!`,
            type: 'success',
          });
          setIsServiceModalOpen(false);
          loadData();
        } else {
          toast.add({
            title: 'Creation Failed',
            description: res.error?.message || 'Failed to create service',
            type: 'error',
          });
        }
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'An error occurred saving service',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Service with ConfirmDialog
  const promptDeleteService = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Service',
      description: `Are you sure you want to permanently delete service "${title}" and all its offerings? This action cannot be undone.`,
      variant: 'destructive',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await deleteService(id);
          if (res.success) {
            toast.add({
              title: 'Service Deleted',
              description: `Service "${title}" was permanently removed.`,
              type: 'success',
            });
            loadData();
          } else {
            toast.add({
              title: 'Delete Failed',
              description: res.error?.message || 'Failed to delete service',
              type: 'error',
            });
          }
        } catch (err: any) {
          toast.add({
            title: 'Error',
            description: err?.message || 'Error deleting service',
            type: 'error',
          });
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handle Publish Service
  const handlePublishService = async (srv: ServiceData) => {
    setActionLoading(true);
    try {
      const res = await publishService(srv.id);
      if (res.success) {
        toast.add({
          title: 'Service Published!',
          description: `"${srv.title}" is now PUBLISHED and visible in the public catalogue.`,
          type: 'success',
        });
        loadData();
      } else {
        toast.add({
          title: 'Publish Failed',
          description: res.error?.message || 'Failed to publish service',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Error publishing service',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Offering Modal Open
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

  // Handle Save Offering
  const handleSaveOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
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
          toast.add({
            title: 'Offering Updated',
            description: `"${offeringForm.name}" updated successfully.`,
            type: 'success',
          });
          setIsOfferingModalOpen(false);
          loadData();
        } else {
          toast.add({
            title: 'Update Failed',
            description: res.error?.message || 'Failed to update offering',
            type: 'error',
          });
        }
      } else if (offeringServiceId) {
        const res = await addOffering(offeringServiceId, {
          name: offeringForm.name,
          durationMinutes: Number(offeringForm.durationMinutes),
          priceMinorUnits,
        });

        if (res.success) {
          toast.add({
            title: 'Offering Added',
            description: `"${offeringForm.name}" added to service.`,
            type: 'success',
          });
          setIsOfferingModalOpen(false);
          loadData();
        } else {
          toast.add({
            title: 'Failed to Add Offering',
            description: res.error?.message || 'Failed to create offering',
            type: 'error',
          });
        }
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Error saving offering',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Offering with ConfirmDialog
  const promptDeleteOffering = (offeringId: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Offering',
      description: `Are you sure you want to delete offering "${name}"?`,
      variant: 'destructive',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await deleteOffering(offeringId);
          if (res.success) {
            toast.add({
              title: 'Offering Deleted',
              description: `Offering "${name}" was removed.`,
              type: 'success',
            });
            loadData();
          } else {
            toast.add({
              title: 'Delete Failed',
              description: res.error?.message || 'Failed to delete offering',
              type: 'error',
            });
          }
        } catch (err: any) {
          toast.add({
            title: 'Error',
            description: err?.message || 'Error deleting offering',
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
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-64 w-full animate-pulse rounded-2xl bg-card border border-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <SparklesIcon className="w-6 h-6 text-primary" />
            <span>Service Catalogue</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, price, and manage your service offerings and publish status.
          </p>
        </div>

        <Button
          onClick={() => handleOpenServiceModal()}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create New Service</span>
        </Button>
      </div>

      {services.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-border bg-card/60">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
            <LayersIcon className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold">No Services Created Yet</CardTitle>
          <CardDescription className="mt-2 text-sm max-w-md mx-auto">
            You haven&apos;t added any service listings yet. Create your first service to start offering packages to clients.
          </CardDescription>
          <Button className="mt-6 gap-2" onClick={() => handleOpenServiceModal()}>
            <PlusIcon className="w-4 h-4" />
            <span>Create First Service</span>
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {services.map((srv) => {
            const activeOfferings = (srv.offerings || []).filter((o) => o.isActive);

            return (
              <Card
                key={srv.id}
                className="border border-border bg-card shadow-xs rounded-2xl overflow-hidden hover:shadow-md transition-all"
              >
                {/* Card Header */}
                <CardHeader className="bg-secondary/40 p-6 border-b border-border/80">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                          {srv.title}
                        </h2>
                        <Badge
                          variant={
                            srv.status === 'PUBLISHED'
                              ? 'default'
                              : srv.status === 'SUSPENDED'
                              ? 'destructive'
                              : 'outline'
                          }
                          className="font-bold text-xs gap-1"
                        >
                          {srv.status === 'PUBLISHED' && <GlobeIcon className="w-3 h-3" />}
                          {srv.status === 'SUSPENDED' && <AlertTriangleIcon className="w-3 h-3" />}
                          {srv.status === 'DRAFT' && <ClockIcon className="w-3 h-3" />}
                          <span>{srv.status}</span>
                        </Badge>
                        {srv.category && (
                          <Badge variant="secondary" className="text-xs gap-1 font-semibold">
                            <TagIcon className="w-3 h-3" />
                            <span>{srv.category.name}</span>
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {srv.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <ClockIcon className="w-3.5 h-3.5 text-primary" />
                        <span>Free cancellation up to <strong>{srv.freeCancellationHours} hours</strong> before slot.</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {srv.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs"
                          onClick={() => handlePublishService(srv)}
                        >
                          <GlobeIcon className="w-3.5 h-3.5" />
                          <span>Publish Service</span>
                        </Button>
                      )}
                      <Link href={`/vendor/services/${srv.id}/availability`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                          <span>Availability</span>
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => handleOpenServiceModal(srv)}
                      >
                        <Edit3Icon className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => promptDeleteService(srv.id, srv.title)}
                      >
                        <Trash2Icon className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Suspension Banner */}
                {srv.status === 'SUSPENDED' && (
                  <div className="px-6 py-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                    <span>Suspended by Admin: {srv.suspendedReason || 'No reason specified'}</span>
                  </div>
                )}

                {/* Card Content - Offerings List */}
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm tracking-wide text-foreground flex items-center gap-2">
                      <LayersIcon className="w-4 h-4 text-primary" />
                      <span>Offerings / Packages ({srv.offerings?.length || 0})</span>
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                      onClick={() => handleOpenOfferingModal(srv.id)}
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Add Offering</span>
                    </Button>
                  </div>

                  {srv.offerings && srv.offerings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {srv.offerings.map((off) => (
                        <div
                          key={off.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                            off.isActive
                              ? 'bg-secondary/30 border-border hover:border-primary/50'
                              : 'bg-muted/30 border-border/50 opacity-60'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sm text-foreground">{off.name}</span>
                              <Badge
                                variant={off.isActive ? 'default' : 'secondary'}
                                className="text-[10px] px-2 py-0.5"
                              >
                                {off.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <ClockIcon className="w-3.5 h-3.5" />
                                {off.durationMinutes} mins
                              </span>
                              <span className="font-bold text-sm text-foreground flex items-center gap-0.5">
                                <IndianRupeeIcon className="w-3.5 h-3.5 text-primary" />
                                {(off.priceMinorUnits / 100).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1 pt-3 border-t border-border/60 mt-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs font-semibold gap-1"
                              onClick={() => handleOpenOfferingModal(srv.id, off)}
                            >
                              <Edit3Icon className="w-3 h-3" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => promptDeleteOffering(off.id, off.name)}
                            >
                              <Trash2Icon className="w-3 h-3" />
                              <span>Delete</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl border border-dashed border-border bg-card/40 text-center space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        No offerings created yet for this service.
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        You must add at least 1 active offering before this service can be published.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Service Create/Edit Modal Dialog */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card text-card-foreground border-border">
          <form onSubmit={handleSaveService}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                <FileTextIcon className="w-5 h-5 text-primary" />
                <span>{editingService ? 'Edit Service Details' : 'Create Service Listing'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter service details. Newly created services start in DRAFT status until published.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="srvTitle" className="text-xs font-semibold">Service Title</Label>
                <Input
                  id="srvTitle"
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  placeholder="e.g. Premium Home Deep Cleaning"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="srvCat" className="text-xs font-semibold">Category</Label>
                <select
                  id="srvCat"
                  className="w-full h-10 px-3 py-2 rounded-md border border-input text-sm bg-background text-foreground"
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

              <div className="space-y-1.5">
                <Label htmlFor="srvDesc" className="text-xs font-semibold">Description</Label>
                <textarea
                  id="srvDesc"
                  className="w-full min-h-[90px] p-3 rounded-md border border-input text-sm bg-background text-foreground"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Describe your service offering in detail..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="srvCancelHours" className="text-xs font-semibold">Free Cancellation Window (Hours)</Label>
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

              <div className="space-y-1.5">
                <Label htmlFor="srvImages" className="text-xs font-semibold">Images Metadata Filenames (One per line)</Label>
                <textarea
                  id="srvImages"
                  className="w-full min-h-[60px] p-2.5 rounded-md border border-input text-xs bg-background text-foreground font-mono"
                  value={serviceForm.imagesText}
                  onChange={(e) => setServiceForm({ ...serviceForm, imagesText: e.target.value })}
                  placeholder="cleaning_banner.jpg&#10;cleaner_1.png"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsServiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading} className="gap-1.5">
                {actionLoading && <Loader2Icon className="w-4 h-4 animate-spin" />}
                <span>Save Service</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offering Create/Edit Modal Dialog */}
      <Dialog open={isOfferingModalOpen} onOpenChange={setIsOfferingModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <form onSubmit={handleSaveOffering}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                <LayersIcon className="w-5 h-5 text-primary" />
                <span>{editingOffering ? 'Edit Package Offering' : 'Add Offering Package'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set duration, name, and price for this offering package.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="offName" className="text-xs font-semibold">Offering Name</Label>
                <Input
                  id="offName"
                  value={offeringForm.name}
                  onChange={(e) => setOfferingForm({ ...offeringForm, name: e.target.value })}
                  placeholder="e.g. 2 BHK Deep Clean, 60 min Massage"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="offDuration" className="text-xs font-semibold">Duration (Mins)</Label>
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

                <div className="space-y-1.5">
                  <Label htmlFor="offPrice" className="text-xs font-semibold">Price (₹ INR)</Label>
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
                    className="h-4 w-4 rounded border-input"
                    checked={offeringForm.isActive}
                    onChange={(e) =>
                      setOfferingForm({ ...offeringForm, isActive: e.target.checked })
                    }
                  />
                  <Label htmlFor="offActive" className="text-xs font-normal">
                    Active & Available for Customer Booking
                  </Label>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOfferingModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading} className="gap-1.5">
                {actionLoading && <Loader2Icon className="w-4 h-4 animate-spin" />}
                <span>Save Offering</span>
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
        variant={confirmDialog.variant}
        isLoading={actionLoading}
      />
    </div>
  );
}
