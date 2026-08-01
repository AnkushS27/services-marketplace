'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    setError(null);
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
      setError(err.message || 'Failed to load vendor profile');
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
    setError(null);
    setSuccessMsg(null);

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
        setSuccessMsg('Business profile updated successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename || !originalName) return;

    setIsUploadingDoc(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch<VendorDocument>('/vendors/me/documents', {
        method: 'POST',
        body: JSON.stringify({
          filename,
          originalName,
        }),
      });

      if (res.success && res.data) {
        setSuccessMsg('Vendor document attached successfully!');
        setFilename('');
        setOriginalName('');
        loadProfile();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-96 animate-pulse rounded-xl border bg-muted/20" />
          <div className="h-96 animate-pulse rounded-xl border bg-muted/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Business Profile & Verification Documents</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete your vendor application details and attach business identity verification documents.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Information Form */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>
              Update your registered business information and operating timezone.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateProfile}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Cleaning Services"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Representative Name</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone Number</Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Operating Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 101 Tech Park, Indiranagar, Bengaluru"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Operating Timezone (IANA)</Label>
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
              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Verification Documents Section */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Attach Document Metadata</CardTitle>
              <CardDescription>
                Submit business registration, ID proof, or tax certificates for admin review.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUploadDocument}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="originalName">Document Title / Type</Label>
                  <Input
                    id="originalName"
                    value={originalName}
                    onChange={(e) => setOriginalName(e.target.value)}
                    placeholder="e.g. GST Certificate.pdf"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filename">System Filename / Reference</Label>
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
                <Button type="submit" variant="outline" disabled={isUploadingDoc} className="w-full">
                  {isUploadingDoc ? 'Attaching...' : '+ Attach Verification Document'}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Attached Documents ({profile?.documents.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!profile?.documents || profile.documents.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No verification documents submitted yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium text-xs">{doc.originalName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{doc.filename}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
