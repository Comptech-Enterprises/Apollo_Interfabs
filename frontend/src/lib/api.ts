const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";

export function getStoredToken(): string | null {
  return localStorage.getItem("apollo_token");
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem("apollo_token", token);
  else localStorage.removeItem("apollo_token");
}

export function getStoredUser(): any | null {
  const s = localStorage.getItem("apollo_user");
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function setStoredUser(user: any | null) {
  if (user) localStorage.setItem("apollo_user", JSON.stringify(user));
  else localStorage.removeItem("apollo_user");
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const authToken = token || getStoredToken();

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    ...rest,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && authToken) {
    setStoredToken(null);
    setStoredUser(null);
    alert("You are logged out. Please log in again.");
    window.location.href = "/";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const error: any = new Error(data.message || "An error occurred");
    error.status = res.status;
    error.fields = data.fields;
    error.data = data;
    throw error;
  }

  return data as T;
}

// Authentication
export const apiAuth = {
  login: (credentials: { username: string; password: string }) =>
    apiFetch<{ ok: boolean; token: string; user: { name: string; role: string; mustChangePassword: boolean } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(credentials) }
    ),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiFetch<{ ok: boolean; message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// SKUs
export const apiSkus = {
  list: (q?: string) => {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    return apiFetch<any[]>(`/skus${query}`);
  },
  get: (id: string) => apiFetch<any>(`/skus/${id}`),
  facets: () => apiFetch<{ types: string[]; colours: string[]; patterns: string[] }>("/skus/facets"),
  create: (data: any) => apiFetch<{ ok: boolean; message: string; sku: any }>("/skus", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiFetch<{ ok: boolean; message: string }>(`/skus/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  toggleActive: (id: string, active: boolean) =>
    apiFetch<{ ok: boolean; message: string }>(`/skus/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    }),
};

// Stock & Sales
export const apiStock = {
  recordStockIn: (data: any) =>
    apiFetch<{ ok: boolean; message: string }>("/stock/stock-in", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  recordSale: (data: any) =>
    apiFetch<{ ok: boolean; message: string }>("/stock/sale", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  voidSale: (id: string, reason: string) =>
    apiFetch<{ ok: boolean; message: string }>("/stock/void-sale", {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    }),
  voidStockIn: (id: string, reason: string) =>
    apiFetch<{ ok: boolean; message: string }>("/stock/void-stockin", {
      method: "POST",
      body: JSON.stringify({ id, reason }),
    }),
  updateQualityStatus: (id: string, qualityStatus: "APPROVED" | "REJECTED" | "PENDING", notes?: string) =>
    apiFetch<{ ok: boolean; message: string; qualityStatus: string }>(`/stock/stockin/${id}/quality`, {
      method: "PATCH",
      body: JSON.stringify({ qualityStatus, notes }),
    }),
  getSales: (params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") q.set(k, String(v));
    }
    const qs = q.toString();
    return apiFetch<{ rows: any[]; count: number; page: number; pages: number }>(`/stock/sales${qs ? `?${qs}` : ""}`);
  },
  getPurchases: (params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") q.set(k, String(v));
    }
    const qs = q.toString();
    return apiFetch<{ rows: any[]; count: number; page: number; pages: number }>(`/stock/purchases${qs ? `?${qs}` : ""}`);
  },
};

// Purchase Orders
export const apiPo = {
  list: (page = 1, status?: string) => {
    const q = new URLSearchParams({ page: String(page) });
    if (status) q.set("status", status);
    return apiFetch<{ rows: any[]; count: number; page: number; pages: number }>(`/po?${q}`);
  },
  create: (data: any) => apiFetch<{ ok: boolean; message: string }>("/po", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  review: (id: string, data: { status: "APPROVED" | "REJECTED"; note?: string }) =>
    apiFetch<{ ok: boolean; message: string }>(`/po/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Notifications
export const apiNotifications = {
  list: () => apiFetch<any[]>("/notifications"),
  unreadCount: () => apiFetch<{ count: number }>("/notifications/unread-count"),
  markRead: () => apiFetch<{ ok: boolean }>("/notifications/mark-read", { method: "POST" }),
};

// Users
export const apiUsers = {
  list: () => apiFetch<any[]>("/users"),
  create: (data: any) => apiFetch<{ ok: boolean; message: string }>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  resetPassword: (id: string, password: string) =>
    apiFetch<{ ok: boolean; message: string }>(`/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  toggleActive: (id: string, active: boolean) =>
    apiFetch<{ ok: boolean; message: string }>(`/users/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    }),
};
