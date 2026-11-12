import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiAccessControl, apiAuth, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from "@/lib/api";
import {
  getDefaultLandingRoute,
  resolvePermissions,
  type PermissionKey,
  type PermissionMap,
  type RoleName,
} from "@/lib/permissions";

export type UserRole = RoleName;

export interface User {
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
  warehouses?: string[];
  uid?: string;
  permissions?: Record<string, boolean>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  permissions: PermissionMap;
  can: (key: PermissionKey) => boolean;
  canAny: (...keys: PermissionKey[]) => boolean;
  defaultRoute: string;
  refreshPermissions: () => Promise<void>;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const lastSyncRef = useRef<number>(0);

  const permissions = useMemo(
    () => (user ? resolvePermissions(user.role, user.permissions) : resolvePermissions("SALES")),
    [user]
  );

  const can = useCallback(
    (key: PermissionKey): boolean => {
      if (!user) return false;
      if (user.role === "SUPER_ADMIN") return true;
      return Boolean(permissions[key]);
    },
    [user, permissions]
  );

  const canAny = useCallback(
    (...keys: PermissionKey[]): boolean => keys.some((k) => can(k)),
    [can]
  );

  const defaultRoute = useMemo(() => (user ? getDefaultLandingRoute(permissions) : "/dashboard"), [user, permissions]);

  const refreshPermissions = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return;
    try {
      const res = await apiAccessControl.getMyPermissions();
      setUser((prev) => {
        if (!prev) return prev;
        const next: User = {
          ...prev,
          role: (res.role as UserRole) || prev.role,
          permissions: res.permissions,
        };
        setStoredUser(next);
        return next;
      });
      lastSyncRef.current = Date.now();
    } catch {
      // Ignore transient network errors when refreshing permissions
    }
  }, []);

  useEffect(() => {
    const t = getStoredToken();
    const u = getStoredUser();
    if (t && u) {
      setToken(t);
      setUser(u);
      void refreshPermissions();
    }
  }, [refreshPermissions]);

  useEffect(() => {
    if (!token) return;
    const onFocus = () => {
      if (Date.now() - lastSyncRef.current > 5000) {
        void refreshPermissions();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [token, refreshPermissions]);

  const login = async (credentials: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await apiAuth.login(credentials);
      const nextUser = res.user as User;
      setStoredToken(res.token);
      setStoredUser(nextUser);
      setToken(res.token);
      setUser(nextUser);
      lastSyncRef.current = Date.now();
      if (res.user.mustChangePassword) {
        navigate("/account?first=1");
      } else {
        const resolved = resolvePermissions(nextUser.role, nextUser.permissions);
        navigate(getDefaultLandingRoute(resolved));
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setStoredUser(null);
    setToken(null);
    setUser(null);
    navigate("/");
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const next = { ...user, ...updates };
    setUser(next);
    setStoredUser(next);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        permissions,
        can,
        canAny,
        defaultRoute,
        refreshPermissions,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
