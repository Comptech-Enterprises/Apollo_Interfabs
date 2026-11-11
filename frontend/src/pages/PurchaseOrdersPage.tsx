import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiPo } from "@/lib/api";
import { formatDate, formatMetres } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { Pagination } from "@/components/bits";
import { TableSkeleton } from "@/components/TableSkeleton";

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "APPROVED"
      ? "bg-green-100 text-green-700"
      : status === "REJECTED"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{status}</span>;
}

export function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [data, setData] = useState<{ rows: any[]; count: number; page: number; pages: number }>({
    rows: [],
    count: 0,
    page: 1,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const loadPOs = (p = page, status = statusFilter) => {
    setLoading(true);
    apiPo
      .list(p, status || undefined)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPOs(page, statusFilter);
  }, [page, statusFilter]);

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    setReviewing(id);
    try {
      const res = await apiPo.review(id, { status });
      toast.success(res.message);
      loadPOs();
    } catch (err: any) {
      toast.error(err.message || "Failed to review PO");
    } finally {
      setReviewing(null);
    }
  };

  const isOwner = user?.role === "OWNER";
  const isSales = user?.role === "SALES";

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        actions={
          isSales ? (
            <Link to="/po/new" className="btn-primary">
              New PO
            </Link>
          ) : null
        }
      />

      {isOwner && (
        <div className="mb-4 flex gap-2">
          {["", "PENDING", "APPROVED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-full px-3 py-1 text-sm font-medium cursor-pointer ${
                statusFilter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      )}

      {loading && data.rows.length === 0 ? (
        <TableSkeleton cols={isOwner ? 7 : 6} />
      ) : data.rows.length === 0 ? (
        <EmptyState
          title="No purchase orders"
          body={isSales ? "Raise a PO when a customer needs something not in stock." : "Purchase orders will appear here."}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-100 bg-red-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  {isOwner && (
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-red-50/40 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-slate-600">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {r.itemName}
                      {r.description && <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{r.description}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-red-600">{formatMetres(r.quantity)}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-700">{r.customerName}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{r.createdByName}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                    {isOwner && (
                      <td className="px-4 py-3.5 text-right">
                        {r.status === "PENDING" && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleReview(r.id, "APPROVED")}
                              disabled={reviewing === r.id}
                              className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(r.id, "REJECTED")}
                              disabled={reviewing === r.id}
                              className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {data.rows.map((r) => (
              <li key={r.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{r.itemName}</p>
                    <p className="text-xs text-slate-500">Customer: {r.customerName}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm">
                  {formatMetres(r.quantity)} · by {r.createdByName} · {formatDate(r.createdAt)}
                </p>
                {r.description && <p className="mt-1 text-xs text-slate-400 italic">{r.description}</p>}
                {isOwner && r.status === "PENDING" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleReview(r.id, "APPROVED")}
                      disabled={reviewing === r.id}
                      className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(r.id, "REJECTED")}
                      disabled={reviewing === r.id}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
