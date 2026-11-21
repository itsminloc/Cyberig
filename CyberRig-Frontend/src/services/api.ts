/**
 * CyberRig Core HTTP Client & Authentication API Service
 * Manages Bearer token injection, automatic token refresh rotation, and persistent storage.
 * Aligned with Task FE-08 specification.
 */

export type UserRole = 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'cyberrig_access_token',
  REFRESH_TOKEN: 'cyberrig_refresh_token',
  USER: 'cyberrig_user',
} as const;

// Safe Memory Cache for non-browser (Node.js test/SSR) environments
const memoryStorage: Record<string, string> = {};

export function getStoredAccessToken(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }
  return memoryStorage[STORAGE_KEYS.ACCESS_TOKEN] || null;
}

export function getStoredRefreshToken(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
  return memoryStorage[STORAGE_KEYS.REFRESH_TOKEN] || null;
}

export function getStoredUser(): UserProfile | null {
  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = localStorage.getItem(STORAGE_KEYS.USER);
    } else {
      raw = memoryStorage[STORAGE_KEYS.USER] || null;
    }
    if (raw) {
      return JSON.parse(raw) as UserProfile;
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

export function setStoredSession(session: {
  accessToken: string;
  refreshToken?: string;
  user?: UserProfile;
}): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.accessToken);
    if (session.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refreshToken);
    }
    if (session.user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session.user));
    }
  } else {
    memoryStorage[STORAGE_KEYS.ACCESS_TOKEN] = session.accessToken;
    if (session.refreshToken) {
      memoryStorage[STORAGE_KEYS.REFRESH_TOKEN] = session.refreshToken;
    }
    if (session.user) {
      memoryStorage[STORAGE_KEYS.USER] = JSON.stringify(session.user);
    }
  }
}

export function clearStoredSession(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
  delete memoryStorage[STORAGE_KEYS.ACCESS_TOKEN];
  delete memoryStorage[STORAGE_KEYS.REFRESH_TOKEN];
  delete memoryStorage[STORAGE_KEYS.USER];
}

/**
 * Universal Request Function with automatic Bearer token injection and 401 token refresh
 */
export async function request<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean; _retry?: boolean } = {}
): Promise<T> {
  const { skipAuth = false, _retry = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (fetchOptions.body && typeof fetchOptions.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject Bearer Token if available
  if (!skipAuth && !headers['Authorization']) {
    const token = getStoredAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      ...fetchOptions,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(0, err?.message || 'Không thể kết nối tới máy chủ.', 'NETWORK_ERROR');
  }

  // Automatic token refresh on 401 Unauthorized
  if (res.status === 401 && !_retry && !skipAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshBody = await refreshRes.json();
          if (refreshBody?.success && refreshBody?.data?.accessToken) {
            setStoredSession({
              accessToken: refreshBody.data.accessToken,
              user: refreshBody.data.user,
            });

            // Retry original request with refreshed access token
            return await request<T>(endpoint, {
              ...options,
              _retry: true,
            });
          }
        }
      } catch {
        // Refresh failed, proceed to handle 401 below
      }
    }
    // Refresh failed or no refresh token available
    clearStoredSession();
  }

  const rawText = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = rawText;
  }

  if (!res.ok) {
    const code = json?.error?.code || `HTTP_${res.status}`;
    const message = json?.error?.message || json?.message || `Lỗi máy chủ (${res.status}).`;
    throw new ApiError(res.status, message, code, json);
  }

  return (json?.data !== undefined ? json.data : json) as T;
}

/**
 * Authentication API Endpoints
 */
export const authApi = {
  /**
   * Đăng nhập tài khoản
   */
  async login(dto: LoginDto): Promise<AuthTokens> {
    const res = await request<AuthTokens>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuth: true,
    });
    setStoredSession(res);
    return res;
  },

  /**
   * Đăng ký tài khoản khách hàng mới
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    const res = await request<AuthTokens>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuth: true,
    });
    setStoredSession(res);
    return res;
  },

  /**
   * Lấy thông tin tài khoản đang đăng nhập
   */
  async getCurrentUser(): Promise<UserProfile> {
    const res = await request<UserProfile>('/api/auth/me', {
      method: 'GET',
    });
    const currentRefresh = getStoredRefreshToken();
    const currentAccess = getStoredAccessToken();
    if (currentAccess) {
      setStoredSession({
        accessToken: currentAccess,
        refreshToken: currentRefresh || undefined,
        user: res,
      });
    }
    return res;
  },

  /**
   * Cấp mới Access Token bằng Refresh Token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; user: UserProfile }> {
    const res = await request<{ accessToken: string; user: UserProfile }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
    });
    setStoredSession({
      accessToken: res.accessToken,
      user: res.user,
    });
    return res;
  },

  /**
   * Đăng xuất phiên làm việc
   */
  async logout(): Promise<void> {
    try {
      await request<{ success: boolean }>('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore network errors during logout
    } finally {
      clearStoredSession();
    }
  },
};

export const apiClient = {
  get: <T>(url: string, opts?: RequestInit) => request<T>(url, { ...opts, method: 'GET' }),
  post: <T>(url: string, body?: any, opts?: RequestInit) =>
    request<T>(url, { ...opts, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: any, opts?: RequestInit) =>
    request<T>(url, { ...opts, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: any, opts?: RequestInit) =>
    request<T>(url, { ...opts, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string, opts?: RequestInit) => request<T>(url, { ...opts, method: 'DELETE' }),
};

export default authApi;
