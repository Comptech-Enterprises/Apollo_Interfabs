import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiStock, apiSkus } from "@/lib/api";
import { formatDate, formatMetres, formatPrice } from "@/lib/format";
import { AccessDenied, EmptyState, PageHeader } from "@/components/ui";
import { Pagination, VoidedBadge } from "@/components/bits";
import { VoidButton } from "@/components/VoidButton";
import { TableSkeleton } from "@/components/TableSkeleton";

export function SalesLogPage() {
  const { can, defaultRoute } = useAuth();
  const hasAccess = can("modules.sales") && can("sales.view");
  const canCreateSale = can("sales.create");
  const canVoidSale = can("sales.void");
  const canViewSkuDetails = can("inventory.viewDetails");
  const [skus, setSkus] = useState<any[]>([]);
  const [filters, setFilters] = useState({ sku: "", buyer: "", from: "", to: "" });
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

  const loadSales = (p = page, f = filters) => {
    if (!hasAccess) return;
    setLoading(true);
    apiStock
      .getSales({
        sku: f.sku || undefined,
        buyer: f.buyer || undefined,
        from: f.from || undefined,
        to: f.to || undefined,
        page: p,
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSales(page, filters);
  }, [page, hasAccess]);

  if (!hasAccess) {
    return <AccessDenied fallbackTo={defaultRoute} />;
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSales(1, filters);
  };

  const handleReset = () => {
    const empty = { sku: "", buyer: "", from: "", to: "" };
    setFilters(empty);
    setPage(1);
    loadSales(1, empty);
  };

  const filtered = Boolean(filters.sku || filters.buyer || filters.from || filters.to);

  return (
    <>
      <PageHeader
        title="Sales log"
        actions={
          canCreateSale ? (
            <Link to="/sales/new" className="btn-primary">
              Record sale
            </Link>
          ) : null
        }
      />
      <form onSubmit={handleFilterSubmit} role="search" className="card mb-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <label htmlFor="buyer" className="mb-1 block text-sm font-medium text-slate-700">Buyer</label>
          <input
            id="buyer"
            name="buyer"
            value={filters.buyer}
            onChange={(e) => setFilters((f) => ({ ...f, buyer: e.target.value }))}
            maxLength={100}
            placeholder="Filter by buyer"
            className="input"
          />
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
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className="btn-primary flex-1 cursor-pointer">Filter</button>
          {filtered && (
            <button type="button" onClick={handleReset} className="btn-secondary cursor-pointer">
              Clear
            </button>
          )}
        </div>
      </form>

      {loading && data.rows.length === 0 ? (
        <TableSkeleton cols={canVoidSale ? 7 : 6} />
      ) : data.rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No sales match your filters" : "No sales recorded yet"}
          body={filtered ? "Try different filters." : "Sales will appear here once they are recorded."}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-red-100/90 bg-white/95 shadow-xs shadow-red-500/5 md:block">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-red-100 bg-red-50/50">
                <tr>
                  <th className="th">Date</th>
                  <th className="th">SKU</th>
                  <th className="th text-right">Metres</th>
                  <th className="th text-right">Sale Price</th>
                  <th className="th text-right">Sold Price</th>
                  <th className="th pl-6">Buyer</th>
                  {canVoidSale && <th className="th text-right"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r) => {
                  const bg = r.voidedAt
                    ? ""
                    : r.soldPricePerMetre < r.pricePerMetre
                    ? "bg-red-50/80 hover:bg-red-100/60"
                    : r.soldPricePerMetre > r.pricePerMetre
                    ? "bg-emerald-50/70 hover:bg-emerald-100/60"
                    : "hover:bg-red-50/40";
                  return (
                    <tr
                      key={r.id}
                      className={`${r.voidedAt ? "text-slate-400 line-through decoration-slate-300" : ""} ${bg}`}
                    >
                      <td className="td whitespace-nowrap text-slate-600">{formatDate(r.saleDate)}</td>
                      <td className="td font-mono font-semibold text-red-700">
                        {canViewSkuDetails ? (
                          <Link to={`/skus/${r.skuId}`} className="hover:underline">
                            {r.sku?.code ?? "—"}
                          </Link>
                        ) : (
                          <span>{r.sku?.code ?? "—"}</span>
                        )}
                      </td>
                      <td className="td text-right font-mono whitespace-nowrap">{formatMetres(r.quantityMetres)}</td>
                      <td className="td text-right font-mono whitespace-nowrap">{formatPrice(r.pricePerMetre)}</td>
                      <td className="td text-right font-mono font-semibold whitespace-nowrap">{formatPrice(r.soldPricePerMetre)}</td>
                      <td className="td pl-6">{r.buyerName ?? "-"}</td>
                      {canVoidSale && (
                        <td className="td text-right">
                          {r.voidedAt ? (
                            <VoidedBadge />
                          ) : (
                            <VoidButton
                              id={r.id}
                              kind="sale"
                              label={`${r.sku?.code ?? "Sale"}, ${formatMetres(r.quantityMetres)}`}
                              onSuccess={() => loadSales()}
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
              const bg = r.voidedAt
                ? ""
                : r.soldPricePerMetre < r.pricePerMetre
                ? "bg-red-50 border-red-200"
                : r.soldPricePerMetre > r.pricePerMetre
                ? "bg-green-50 border-green-200"
                : "";
              return (
                <li
                  key={r.id}
                  className={`card hover:shadow-md hover:-translate-y-0.5 ${r.voidedAt ? "opacity-60" : ""} ${bg}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {canViewSkuDetails ? (
                      <Link to={`/skus/${r.skuId}`} className="break-all font-mono font-bold text-brand-700">
                        {r.sku?.code ?? "—"}
                      </Link>
                    ) : (
                      <span className="break-all font-mono font-bold text-slate-900">
                        {r.sku?.code ?? "—"}
                      </span>
                    )}
                    <span className="shrink-0 text-sm text-slate-600">{formatDate(r.saleDate)}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    {formatMetres(r.quantityMetres)} — Sale: {formatPrice(r.pricePerMetre)}/m, Sold: {formatPrice(r.soldPricePerMetre)}/m
                  </p>
                  <p className="break-words text-sm text-slate-600">Buyer: {r.buyerName ?? "-"}</p>
                  <div className="mt-3">
                    {r.voidedAt ? (
                      <VoidedBadge />
                    ) : canVoidSale ? (
                      <VoidButton
                        id={r.id}
                        kind="sale"
                        label={`${r.sku?.code ?? "Sale"}, ${formatMetres(r.quantityMetres)}`}
                        onSuccess={() => loadSales()}
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
