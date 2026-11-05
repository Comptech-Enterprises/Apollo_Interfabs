import React from "react";
import { Link } from "react-router-dom";

export function LowStockBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
      Low stock
    </span>
  );
}

export function OutBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
      Out of stock
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      Active
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
      Inactive
    </span>
  );
}

export function VoidedBadge() {
  return (
    <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
      Voided
    </span>
  );
}

export function QualityBadge({ status }: { status?: "APPROVED" | "REJECTED" | "PENDING" | string | null }) {
  const s = status || "APPROVED";
  if (s === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        Approved
      </span>
    );
  }
  if (s === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
      Pending
    </span>
  );
}

export function Pagination({
  page,
  pages,
  onPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (newPage: number) => void;
}) {
  if (pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
      ) : (
        <span />
      )}
      <span className="text-slate-600">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      ) : (
        <span />
      )}
    </nav>
  );
}
