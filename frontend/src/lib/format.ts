export function formatMetres(v: unknown): string {
  const n = Number(v);
  return `${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
}

export function formatPrice(v: unknown): string {
  const n = Number(v);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Date-only values are stored as UTC midnight, so format them in UTC to avoid day shifts. */
export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function toDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function isLowStock(stock: unknown, threshold: unknown): boolean {
  const t = Number(threshold);
  return t > 0 && Number(stock) <= t;
}

export function stockColor(qty: number): {
  card: string;
  badge: string;
  code: string;
  sub: string;
} {
  if (qty < 25) {
    return {
      card: "bg-red-50/80 border-red-200",
      badge: "bg-red-100 text-red-700",
      code: "text-red-700",
      sub: "text-red-900",
    };
  }
  if (qty < 100) {
    return {
      card: "bg-orange-50/80 border-orange-200",
      badge: "bg-orange-100 text-orange-800",
      code: "text-blue-900",
      sub: "text-orange-950",
    };
  }
  if (qty <= 400) {
    return {
      card: "bg-blue-50/80 border-blue-200",
      badge: "bg-blue-100 text-blue-700",
      code: "text-blue-700",
      sub: "text-blue-950",
    };
  }
  return {
    card: "bg-purple-50/80 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    code: "text-purple-700",
    sub: "text-purple-950",
  };
}
