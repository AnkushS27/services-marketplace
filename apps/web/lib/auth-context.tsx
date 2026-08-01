'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, setAccessToken, getAccessToken } from './api-client';

export interface UserRole {
  id: string;
  name: string;
  type: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
}

export interface VendorProfile {
  id: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  address: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  vendorProfile?: VendorProfile | null;
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signupCustomer: (data: any) => Promise<void>;
  signupVendor: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (slug: string) => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await apiFetch<User & { permissions: string[] }>('/me');
      if (res.success && res.data) {
        const { permissions: userPerms, ...userData } = res.data;
        setUser(userData as User);
        setPermissions(userPerms || []);
      }
    } catch {
      setUser(null);
      setPermissions([]);
      setAccessToken(null);
      setAccessTokenState(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const refreshRes = await apiFetch<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
      });
      if (refreshRes.success && refreshRes.data?.accessToken) {
        const token = refreshRes.data.accessToken;
        setAccessToken(token);
        setAccessTokenState(token);
        await fetchMe();
      } else {
        setUser(null);
        setPermissions([]);
      }
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ user: any; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      setAccessTokenState(res.data.accessToken);
      await fetchMe();
    }
  };

  const signupCustomer = async (data: any) => {
    const res = await apiFetch<{ user: any; accessToken: string }>('/auth/signup/customer', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      setAccessTokenState(res.data.accessToken);
      await fetchMe();
    }
  };

  const signupVendor = async (data: any) => {
    const res = await apiFetch<{ user: any; accessToken: string }>('/auth/signup/vendor', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      setAccessTokenState(res.data.accessToken);
      await fetchMe();
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort logout
    } finally {
      setAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
      setPermissions([]);
    }
  };

  const hasPermission = useCallback(
    (slug: string): boolean => {
      return permissions.includes(slug);
    },
    [permissions],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        accessToken: accessTokenState,
        isLoading,
        login,
        signupCustomer,
        signupVendor,
        logout,
        hasPermission,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
