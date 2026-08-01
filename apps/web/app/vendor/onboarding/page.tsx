'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import {
  BuildingIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeIcon,
  FileTextIcon,
  PlusIcon,
  Loader2Icon,
  SaveIcon,
  UploadIcon,
  FileCheckIcon,
} from 'lucide-react';

interface VendorDocument {
  id: string;
  filename: string;
  originalName: string;
  createdAt: string;
}

interface VendorProfile {
  id: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  address: string;
  timezone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  documents: VendorDocument[];
}

export default function VendorOnboardingPage() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile Form state
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Document Upload Form state
  const [filename, setFilename] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<VendorProfile>('/vendors/me');
      if (res.success && res.data) {
        setProfile(res.data);
        setBusinessName(res.data.businessName || '');
        setContactName(res.data.contactName || '');
        setContactPhone(res.data.contactPhone || '');
        setAddress(res.data.address || '');
        setTimezone(res.data.timezone || 'Asia/Kolkata');
      }
    } catch (err: any) {
      toast.add({
        title: 'Error Loading Profile',
        description: err.message || 'Failed to load vendor profile',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && user) {
      loadProfile();
    }
  }, [isAuthLoading, user, loadProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await apiFetch<VendorProfile>('/vendors/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          businessName,
          contactName,
          contactPhone,
          address,
          timezone,
        }),
      });

      if (res.success && res.data) {
        setProfile(res.data);
        toast.add({
          title: 'Profile Updated',
          description: 'Business details and operating information saved successfully.',
          type: 'success',
        });
      } else {
        toast.add({
          title: 'Update Failed',
          description: res.error?.message || 'Failed to update profile',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err.message || 'Failed to update profile',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename || !originalName) return;

    setIsUploadingDoc(true);

    try {
      const res = await apiFetch<VendorDocument>('/vendors/me/documents', {
        method: 'POST',
        body: JSON.stringify({
          filename,
          originalName,
        }),
      });

      if (res.success && res.data) {
        toast.add({
          title: 'Document Attached',
          description: `"${originalName}" attached for admin verification.`,
          type: 'success',
        });
        setFilename('');
        setOriginalName('');
        loadProfile();
      } else {
        toast.add({
          title: 'Upload Failed',
          description: res.error?.message || 'Failed to upload document',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err.message || 'Failed to upload document',
        type: 'error',
      });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 animate-pulse rounded-2xl bg-card border border-border" />
          <div className="h-96 animate-pulse rounded-2xl bg-card border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="bg-card p-6 rounded-2xl border border-border shadow-xs">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <BuildingIcon className="w-6 h-6 text-primary" />
          <span>Business Profile & Verification Documents</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete your vendor application details and attach business identity verification documents for admin review.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Information Form Card */}
        <Card className="border border-border bg-card shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="p-6 pb-4 border-b border-border/60 bg-secondary/20">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" />
                <span>Profile Details</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Update your registered business information and operating timezone.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="businessName" className="text-xs font-semibold flex items-center gap-1.5">
                    <BuildingIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Business Name</span>
                  </Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex Cleaning Services"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contactName" className="text-xs font-semibold flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Contact Representative Name</span>
                  </Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone" className="text-xs font-semibold flex items-center gap-1.5">
                    <PhoneIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Contact Phone Number</span>
                  </Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Business Operating Address</span>
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 101 Tech Park, Indiranagar, Bengaluru"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="text-xs font-semibold flex items-center gap-1.5">
                    <GlobeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Operating Timezone (IANA)</span>
                  </Label>
                  <Input
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. Asia/Kolkata"
                    required
                  />
                </div>
              </CardContent>

              <CardFooter>
                <Button type="submit" disabled={isSaving} className="w-full gap-2 font-semibold">
                  {isSaving ? (
                    <>
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </div>
        </Card>

        {/* Verification Documents Section */}
        <div className="space-y-6 flex flex-col justify-between">
          <Card className="border border-border bg-card shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="p-6 pb-4 border-b border-border/60 bg-secondary/20">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileTextIcon className="w-5 h-5 text-primary" />
                <span>Attach Verification Document</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Submit business registration, ID proof, or tax certificates for admin review.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleUploadDocument}>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="originalName" className="text-xs font-semibold">Document Title / Type</Label>
                  <Input
                    id="originalName"
                    value={originalName}
                    onChange={(e) => setOriginalName(e.target.value)}
                    placeholder="e.g. GST Certificate.pdf"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="filename" className="text-xs font-semibold">System Filename / Reference</Label>
                  <Input
                    id="filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="e.g. doc_gst_2026_verif.pdf"
                    required
                  />
                </div>
              </CardContent>

              <CardFooter>
                <Button type="submit" variant="outline" disabled={isUploadingDoc} className="w-full gap-2 font-semibold border-border">
                  {isUploadingDoc ? (
                    <>
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                      <span>Attaching...</span>
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4 text-primary" />
                      <span>+ Attach Verification Document</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border border-border bg-card shadow-xs rounded-2xl overflow-hidden flex-1 flex flex-col justify-between">
            <CardHeader className="p-6 pb-4 border-b border-border/60 bg-secondary/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheckIcon className="w-4 h-4 text-primary" />
                <span>Attached Documents ({profile?.documents.length || 0})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              {!profile?.documents || profile.documents.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-medium">
                  No verification documents submitted yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-bold">Document Name</TableHead>
                        <TableHead className="text-xs font-bold">Filename</TableHead>
                        <TableHead className="text-xs font-bold text-right">Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-semibold text-xs text-foreground">{doc.originalName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{doc.filename}</TableCell>
                          <TableCell className="text-xs text-muted-foreground text-right">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
