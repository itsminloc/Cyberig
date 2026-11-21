/**
 * CyberRig Global Authentication Context & Provider
 * Manages user identity, session tokens, login/logout transitions, and role authorization.
 * Aligned with Task FE-08 specification.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  UserProfile,
  UserRole,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
  authApi,
} from '../services/api';

export type { UserRole, UserProfile };

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string; user: UserProfile }) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

export interface AuthProviderProps {
  children?: React.ReactNode;
  initialUser?: UserProfile | null;
  initialToken?: string | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialUser,
  initialToken,
}) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (initialUser !== undefined) return initialUser;
    return getStoredUser();
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (initialToken !== undefined) return initialToken;
    return getStoredAccessToken();
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync state & persistent storage on login
  const login = useCallback(
    (tokens: { accessToken: string; refreshToken: string; user: UserProfile }) => {
      setStoredSession(tokens);
      setAccessToken(tokens.accessToken);
      setUser(tokens.user);
    },
    []
  );

  // Clear state & storage on logout
  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    clearStoredSession();
    // Non-blocking server logout notification
    authApi.logout().catch(() => {});
  }, []);

  // Refresh profile from /api/auth/me
  const refreshUser = useCallback(async () => {
    try {
      const updatedProfile = await authApi.getCurrentUser();
      setUser(updatedProfile);
    } catch (err) {
      // If token expired and cannot refresh, clear session
      setUser(null);
      setAccessToken(null);
      clearStoredSession();
      throw err;
    }
  }, []);

  // Hydrate session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      const storedToken = getStoredAccessToken();
      const storedRefresh = getStoredRefreshToken();

      if (storedToken || storedRefresh) {
        try {
          const profile = await authApi.getCurrentUser();
          if (isMounted) {
            setUser(profile);
            setAccessToken(getStoredAccessToken());
          }
        } catch {
          if (isMounted) {
            setUser(null);
            setAccessToken(null);
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAuthenticated = useMemo(() => {
    return Boolean(user && accessToken);
  }, [user, accessToken]);

  const contextValue: AuthState = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, accessToken, isAuthenticated, isLoading, login, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to consume the AuthContext
 */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}

/**
 * Role checking utility
 */
export function hasRole(user: UserProfile | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export default AuthContext;
