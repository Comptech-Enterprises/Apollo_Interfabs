import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiPo } from "@/lib/api";
import { formatDate, formatMetres } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { Pagination } from "@/components/bits";

export function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: any[]; count: number; page: number; pages: number }>({
    rows: [],
    count: 0,
    page: 1,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);

  if (user?.role !== "OWNER") {
    return <Navigate to="/po/new" replace />;
  }

  const loadPOs = (p = page) => {
    setLoading(true);
    apiPo
      .list(p)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPOs(page);
  }, [page]);

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        actions={
          <Link to="/po/new" className="btn-secondary">
            New PO
          </Link>
        }
      />

      {loading && data.rows.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">Loading purchase orders...</div>
      ) : data.rows.length === 0 ? (
        <EmptyState title="No POs yet" body="Purchase orders requested by the sales team will appear here." />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-100 bg-red-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-red-50/40 transition-colors duration-150">
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{r.companyName}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-800">
                      {r.itemName || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-red-600">
                      {formatMetres(r.quantity)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{r.createdByName ?? "Unknown"}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 max-w-xs truncate">{r.description || "—"}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-slate-400">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="mt-3 space-y-3 sm:hidden">
            {data.rows.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{r.companyName}</p>
                    {r.itemName && (
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{r.itemName}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                    {formatMetres(r.quantity)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-500">
                  by {r.createdByName ?? "Unknown"} · {formatDate(r.createdAt)}
                </p>
                {r.description && <p className="mt-2 text-sm text-slate-400 italic">{r.description}</p>}
              </li>
            ))}
          </ul>

          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
