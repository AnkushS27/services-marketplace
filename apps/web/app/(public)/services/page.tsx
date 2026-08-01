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
import { toast } from '@/components/ui/toast';
import {
  SearchIcon,
  FilterIcon,
  SparklesIcon,
  Building2Icon,
  TagIcon,
  IndianRupeeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  ClockIcon,
  LayersIcon,
  Loader2Icon,
  XIcon,
} from 'lucide-react';

export default function PublicServicesBrowsePage() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; pageSize: number; totalPages: number } | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        toast.add({
          title: 'Catalogue Error',
          description: res.error?.message || 'Failed to load service catalogue',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Error loading services',
        type: 'error',
      });
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
      <div className="bg-card p-8 rounded-3xl border border-border shadow-xs space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>Verified Marketplace</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Explore Service Catalogue
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
          Discover and book verified, top-tier services provided by approved professionals in your area.
        </p>
      </div>

      {/* Search & Category Filter Bar */}
      <Card className="p-4 bg-card shadow-xs border border-border rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search services by title, description or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 text-sm bg-background border-input"
            />
          </div>

          <div className="w-full md:w-72">
            <select
              className="w-full h-11 px-3 py-2 rounded-md border border-input text-sm bg-background text-foreground font-medium"
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

          <Button type="submit" className="h-11 px-6 font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <SearchIcon className="w-4 h-4" />
            <span>Search</span>
          </Button>
        </form>
      </Card>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-72 animate-pulse bg-card/60 border border-border rounded-2xl" />
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
                  className="flex flex-col justify-between border border-border bg-card rounded-2xl hover:shadow-md hover:border-primary/50 transition-all group overflow-hidden"
                >
                  <CardHeader className="space-y-2.5 p-6 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      {srv.category ? (
                        <Badge variant="secondary" className="text-xs font-semibold gap-1">
                          <TagIcon className="w-3 h-3 text-primary" />
                          <span>{srv.category.name}</span>
                        </Badge>
                      ) : (
                        <span />
                      )}
                      {lowestPrice !== null && (
                        <div className="flex items-center text-xs text-muted-foreground gap-0.5">
                          <span>From</span>
                          <strong className="text-foreground text-sm font-bold flex items-center ml-1">
                            <IndianRupeeIcon className="w-3.5 h-3.5 text-primary" />
                            {lowestPrice.toLocaleString('en-IN')}
                          </strong>
                        </div>
                      )}
                    </div>

                    <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {srv.title}
                    </CardTitle>

                    {srv.vendorProfile && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Building2Icon className="w-3.5 h-3.5 text-primary/80" />
                        <span>By <strong>{srv.vendorProfile.businessName}</strong></span>
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 px-6 py-2">
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {srv.description}
                    </p>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <LayersIcon className="w-3.5 h-3.5" />
                      {srv.offerings?.length || 0} package(s)
                    </span>

                    <Link href={`/services/${srv.id}`}>
                      <Button size="sm" className="gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                        <span>View Details</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Server-side Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6 bg-card p-4 rounded-2xl">
              <span className="text-sm text-muted-foreground">
                Showing page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} total services)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="gap-1 font-semibold"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= meta.totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="gap-1 font-semibold"
                >
                  <span>Next</span>
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-4 border-dashed border-2 border-border bg-card">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <SearchIcon className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold">No Services Found</CardTitle>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No active services match your search or filter selection. Try clearing filters or searching for another keyword.
          </p>
          {(search || selectedCategory) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                loadServices(1, '', '');
              }}
              className="gap-1.5"
            >
              <XIcon className="w-4 h-4" />
              <span>Clear Search & Filters</span>
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
