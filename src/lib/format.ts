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
