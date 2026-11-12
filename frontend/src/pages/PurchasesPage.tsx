import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiStock, apiSkus } from "@/lib/api";
import { formatDate, formatMetres, formatPrice } from "@/lib/format";
import { AccessDenied, EmptyState, PageHeader } from "@/components/ui";
import { Pagination, VoidedBadge, QualityBadge } from "@/components/bits";
import { TableSkeleton } from "@/components/TableSkeleton";
import { VoidButton } from "@/components/VoidButton";

export function PurchasesPage() {
  const { can, defaultRoute } = useAuth();
  const hasAccess = can("modules.purchases") && can("purchases.view");
  const canCreatePurchase = can("purchases.create");
  const canViewCostPrice = can("purchases.viewCostPrice");
  const canReview = can("purchases.reviewQuality");
  const canVoid = can("purchases.void");
  const canViewSkuDetails = can("inventory.viewDetails");

  const [skus, setSkus] = useState<any[]>([]);
  const [filters, setFilters] = useState({ sku: "", supplier: "", quality: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: any[]; count: number; page: number; pages: number }>({
    rows: [],
    count: 0,
    page: 1,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasAccess) return;
    apiSkus.list().then(setSkus).catch(console.error);
  }, [hasAccess]);

  const loadPurchases = (p = page, f = filters) => {
    if (!hasAccess) return;
    setLoading(true);
    apiStock
      .getPurchases({
        sku: f.sku || undefined,
        supplier: f.supplier || undefined,
        quality: f.quality || undefined,
        from: f.from || undefined,
        to: f.to || undefined,
        page: p,
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPurchases(page, filters);
  }, [page, hasAccess]);

  if (!hasAccess) {
    return <AccessDenied fallbackTo={defaultRoute} />;
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPurchases(1, filters);
  };

  const handleReset = () => {
    const empty = { sku: "", supplier: "", quality: "", from: "", to: "" };
    setFilters(empty);
    setPage(1);
    loadPurchases(1, empty);
  };

  const handleQualityChange = async (id: string, newStatus: "APPROVED" | "REJECTED" | "PENDING") => {
    try {
      await apiStock.updateQualityStatus(id, newStatus);
      const label = newStatus === "APPROVED" ? "Approved" : newStatus === "REJECTED" ? "Rejected" : "Pending";
      toast.success(`Quality status updated to ${label}`);
      setData((prev) => ({
        ...prev,
        rows: prev.rows.map((r) => (r.id === id ? { ...r, qualityStatus: newStatus } : r)),
      }));
    } catch (err: any) {
      toast.error(err.message || "Failed to update quality status");
    }
  };

  const filtered = Boolean(filters.sku || filters.supplier || filters.quality || filters.from || filters.to);

  return (
    <>
      <PageHeader
        title="Purchase log"
        actions={
          canCreatePurchase ? (
            <Link to="/stock-in/new" className="btn-primary">
              Record stock in
            </Link>
          ) : null
        }
      />
      <form onSubmit={handleFilterSubmit} role="search" className="card mb-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label htmlFor="sku" className="mb-1 block text-sm font-medium text-slate-700">SKU / Fabric</label>
          <select
            id="sku"
            name="sku"
            value={filters.sku}
            onChange={(e) => setFilters((f) => ({ ...f, sku: e.target.value }))}
            className="input"
          >
            <option value="">All SKUs</option>
            {skus.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.fabricName} ({s.variant})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="supplier" className="mb-1 block text-sm font-medium text-slate-700">Supplier</label>
          <input
            id="supplier"
            name="supplier"
            value={filters.supplier}
            onChange={(e) => setFilters((f) => ({ ...f, supplier: e.target.value }))}
            maxLength={100}
            placeholder="Filter by supplier"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="quality" className="mb-1 block text-sm font-medium text-slate-700">Quality status</label>
          <select
            id="quality"
            name="quality"
            value={filters.quality}
            onChange={(e) => setFilters((f) => ({ ...f, quality: e.target.value }))}
            className="input"
          >
            <option value="">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending Review</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label htmlFor="from" className="mb-1 block text-sm font-medium text-slate-700">From</label>
          <input
            id="from"
            name="from"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-sm font-medium text-slate-700">To</label>
          <input
            id="to"
            name="to"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="input"
          />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary cursor-pointer flex-1">Filter</button>
          {filtered && (
            <button type="button" onClick={handleReset} className="btn-secondary cursor-pointer">
              Clear
            </button>
          )}
        </div>
      </form>

      {loading && data.rows.length === 0 ? (
        <TableSkeleton cols={5 + (canViewCostPrice ? 1 : 0) + (canVoid ? 1 : 0)} />
      ) : data.rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No purchases match your filters" : "No purchases recorded yet"}
          body={filtered ? "Try different filters." : "Recorded stock arrivals will appear here."}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-red-100/90 bg-white/95 shadow-xs shadow-red-500/5 md:block">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-red-100 bg-red-50/50">
                <tr>
                  <th className="th">Date</th>
                  <th className="th">SKU</th>
                  <th className="th">Supplier</th>
                  <th className="th text-right">Metres</th>
                  {canViewCostPrice && <th className="th text-right">Cost / m</th>}
                  <th className="th">Quality status</th>
                  {canVoid && <th className="th"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r) => {
                  const status = r.qualityStatus || "APPROVED";
                  return (
                    <tr
                      key={r.id}
                      className={r.voidedAt ? "text-slate-400 line-through decoration-slate-300" : ""}
                    >
                      <td className="td">{formatDate(r.purchaseDate)}</td>
                      <td className="td font-mono font-semibold">
                        {canViewSkuDetails ? (
                          <Link to={`/skus/${r.skuId}`} className="hover:underline">
                            {r.sku?.code ?? "—"}
                          </Link>
                        ) : (
                          <span>{r.sku?.code ?? "—"}</span>
                        )}
                      </td>
                      <td className="td">{r.supplierName}</td>
                      <td className="td text-right font-mono font-medium">{formatMetres(r.quantityMetres)}</td>
                      {canViewCostPrice && (
                        <td className="td text-right">
                          {r.costPricePerMetre !== undefined ? formatPrice(r.costPricePerMetre) : "—"}
                        </td>
                      )}
                      <td className="td">
                        {r.voidedAt ? (
                          <QualityBadge status={r.qualityStatus} />
                        ) : canReview ? (
                          <select
                            value={status}
                            onChange={(e) => handleQualityChange(r.id, e.target.value as any)}
                            className={`select-badge rounded-lg border pl-2.5 py-1 text-xs font-semibold cursor-pointer focus:outline-none transition-colors ${
                              status === "APPROVED"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80"
                                : status === "REJECTED"
                                ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100/80"
                                : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100/80"
                            }`}
                            aria-label={`Quality status for ${r.sku?.code ?? "item"}`}
                          >
                            <option value="APPROVED">Approved</option>
                            <option value="PENDING">Pending Review</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        ) : (
                          <QualityBadge status={r.qualityStatus} />
                        )}
                      </td>
                      {canVoid && (
                        <td className="td text-right">
                          {r.voidedAt ? (
                            <VoidedBadge />
                          ) : (
                            <VoidButton
                              id={r.id}
                              kind="stockin"
                              label={`${r.sku?.code ?? "Purchase"}, ${formatMetres(r.quantityMetres)}`}
                              onSuccess={() => loadPurchases()}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {data.rows.map((r) => {
              const status = r.qualityStatus || "APPROVED";
              return (
                <li
                  key={r.id}
                  className={`card hover:shadow-md hover:-translate-y-0.5 ${r.voidedAt ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {canViewSkuDetails ? (
                      <Link to={`/skus/${r.skuId}`} className="break-all font-mono font-bold text-red-700">
                        {r.sku?.code ?? "—"}
                      </Link>
                    ) : (
                      <span className="break-all font-mono font-bold text-slate-900">
                        {r.sku?.code ?? "—"}
                      </span>
                    )}
                    <span className="shrink-0 text-sm text-slate-600">{formatDate(r.purchaseDate)}</span>
                  </div>
                  <p className="mt-1 break-words text-sm font-medium">{r.supplierName}</p>
                  <p className="mt-1 text-sm font-mono text-slate-700">
                    {formatMetres(r.quantityMetres)}
                    {canViewCostPrice && r.costPricePerMetre !== undefined
                      ? ` - ${formatPrice(r.costPricePerMetre)}/m`
                      : ""}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <span className="text-slate-500 font-medium">Quality status:</span>
                    {canReview && !r.voidedAt ? (
                      <select
                        value={status}
                        onChange={(e) => handleQualityChange(r.id, e.target.value as any)}
                        className={`select-badge rounded-lg border pl-2.5 py-1 text-xs font-semibold cursor-pointer focus:outline-none ${
                          status === "APPROVED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : status === "REJECTED"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <option value="APPROVED">Approved</option>
                        <option value="PENDING">Pending Review</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    ) : (
                      <QualityBadge status={r.qualityStatus} />
                    )}
                  </div>

                  <div className="mt-3">
                    {r.voidedAt ? (
                      <VoidedBadge />
                    ) : canVoid ? (
                      <VoidButton
                        id={r.id}
                        kind="stockin"
                        label={`${r.sku?.code ?? "Purchase"}, ${formatMetres(r.quantityMetres)}`}
                        onSuccess={() => loadPurchases()}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
