'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getPublicServices,
  ServiceData,
} from '@/lib/api/services';
import { getCategories, CategoryData } from '@/lib/api/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PublicServicesBrowsePage() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; pageSize: number; totalPages: number } | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search Params
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadCategories = async () => {
    try {
      const res = await getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch {
      // Ignore category load error
    }
  };

  const loadServices = async (page = 1, searchQuery = search, categoryId = selectedCategory) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPublicServices({
        page,
        pageSize: 9,
        search: searchQuery || undefined,
        categoryId: categoryId || undefined,
      });

      if (res.success && res.data) {
        setServices(res.data);
        setMeta(res.meta || null);
      } else {
        setError(res.error?.message || 'Failed to load service catalogue');
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading services');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadServices(1);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadServices(1, search, selectedCategory);
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
    loadServices(1, search, catId);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadServices(newPage, search, selectedCategory);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Header Banner */}
      <div className="space-y-3 text-center md:text-left border-b pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Explore Services
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">
          Browse verified, high-quality services provided by approved professionals.
        </p>
      </div>

      {/* Search & Category Filter Bar */}
      <Card className="p-4 bg-card shadow-sm border">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search services by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="w-full md:w-64">
            <select
              className="w-full h-10 px-3 py-2 rounded-md border text-sm bg-background"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <optgroup key={cat.id} label={cat.name}>
                  <option value={cat.id}>{cat.name} (All)</option>
                  {(cat.children || []).map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      └ {sub.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <Button type="submit">Search</Button>
        </form>
      </Card>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : Array.isArray(services) && services.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((srv) => {
              const lowestPrice =
                srv.offerings && srv.offerings.length > 0
                  ? Math.min(...srv.offerings.map((o) => o.priceMinorUnits)) / 100
                  : null;

              return (
                <Card
                  key={srv.id}
                  className="flex flex-col justify-between border hover:shadow-md transition-shadow group"
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      {srv.category && (
                        <Badge variant="secondary" className="text-xs">
                          {srv.category.name}
                        </Badge>
                      )}
                      {lowestPrice !== null && (
                        <span className="text-xs text-muted-foreground">
                          Starts at{' '}
                          <strong className="text-foreground text-sm font-bold">
                            ₹{lowestPrice.toLocaleString('en-IN')}
                          </strong>
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
                      {srv.title}
                    </CardTitle>
                    {srv.vendorProfile && (
                      <p className="text-xs text-muted-foreground">
                        Provided by{' '}
                        <strong className="text-foreground font-medium">
                          {srv.vendorProfile.businessName}
                        </strong>
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {srv.description}
                    </p>
                  </CardContent>

                  <CardFooter className="pt-3 border-t bg-muted/10 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {srv.offerings?.length || 0} offering(s)
                    </span>
                    <Link href={`/services/${srv.id}`}>
                      <Button size="sm">View Details</Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Server-side Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">
                Showing page {meta.page} of {meta.totalPages} (Total{' '}
                {meta.total} services)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= meta.totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-3">
          <CardTitle className="text-lg">No Services Available</CardTitle>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No published services match your criteria. Try adjusting your search query or selecting another category.
          </p>
          {(search || selectedCategory) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                loadServices(1, '', '');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
