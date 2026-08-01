const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let inMemoryAccessToken: string | null = null;

export const getAccessToken = (): string | null => inMemoryAccessToken;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: any;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

interface CustomFetchOptions extends RequestInit {
  _retry?: boolean;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: CustomFetchOptions = {},
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (inMemoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Always send and receive HTTP cookies
  };

  try {
    let response = await fetch(url, fetchOptions);

    // Handle 401 & transparent token refresh
    if (
      response.status === 401 &&
      !options._retry &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/login')
    ) {
      options._retry = true;

      // Attempt transparent token refresh
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData: ApiResponse<{ accessToken: string }> = await refreshRes.json();
        if (refreshData.success && refreshData.data?.accessToken) {
          setAccessToken(refreshData.data.accessToken);
          headers.set('Authorization', `Bearer ${refreshData.data.accessToken}`);
          // Retry original request
          response = await fetch(url, {
            ...fetchOptions,
            headers,
          });
        } else {
          setAccessToken(null);
        }
      } else {
        setAccessToken(null);
      }
    }

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || data.success === false) {
      const errorMessage = data.error?.message || `HTTP Error ${response.status}`;
      const errorObj = new Error(errorMessage) as any;
      errorObj.status = response.status;
      errorObj.error = data.error;
      throw errorObj;
    }

    return data;
  } catch (err: any) {
    throw err;
  }
}
