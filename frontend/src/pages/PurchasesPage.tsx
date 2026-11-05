import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiStock, apiSkus } from "@/lib/api";
import { formatDate, formatMetres, formatPrice } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { Pagination, VoidedBadge } from "@/components/bits";
import { VoidButton } from "@/components/VoidButton";

export function PurchasesPage() {
  const [skus, setSkus] = useState<any[]>([]);
  const [filters, setFilters] = useState({ sku: "", supplier: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: any[]; count: number; page: number; pages: number }>({
    rows: [],
    count: 0,
    page: 1,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiSkus.list().then(setSkus).catch(console.error);
  }, []);

  const loadPurchases = (p = page, f = filters) => {
    setLoading(true);
    apiStock
      .getPurchases({
        sku: f.sku || undefined,
        supplier: f.supplier || undefined,
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
  }, [page]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPurchases(1, filters);
  };

  const handleReset = () => {
    const empty = { sku: "", supplier: "", from: "", to: "" };
    setFilters(empty);
    setPage(1);
    loadPurchases(1, empty);
  };

  const filtered = Boolean(filters.sku || filters.supplier || filters.from || filters.to);

  return (
    <>
      <PageHeader
        title="Purchase log"
        actions={
          <Link to="/stock-in/new" className="btn-primary">
            Record stock in
          </Link>
        }
      />
      <form onSubmit={handleFilterSubmit} role="search" className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="sku" className="mb-1 block text-sm font-medium">SKU / Fabric</label>
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
                {s.code} - {s.fabricName} ({s.colour})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="supplier" className="mb-1 block text-sm font-medium">Supplier</label>
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
          <label htmlFor="from" className="mb-1 block text-sm font-medium">From</label>
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
          <label htmlFor="to" className="mb-1 block text-sm font-medium">To</label>
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
          <button type="submit" className="btn-primary cursor-pointer">Filter</button>
          {filtered && (
            <button type="button" onClick={handleReset} className="btn-secondary cursor-pointer">
              Clear
            </button>
          )}
        </div>
      </form>

      {loading && data.rows.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">Loading purchases...</div>
      ) : data.rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No purchases match your filters" : "No purchases recorded yet"}
          body={filtered ? "Try different filters." : "Recorded stock arrivals will appear here."}
        />
      ) : (
        <>
          <div className="card hidden overflow-x-auto p-0 md:block sm:p-0">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Date</th>
                  <th className="th">SKU</th>
                  <th className="th">Supplier</th>
                  <th className="th text-right">Metres</th>
                  <th className="th text-right">Cost / m</th>
                  <th className="th"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r) => (
                  <tr
                    key={r.id}
                    className={r.voidedAt ? "text-slate-400 line-through decoration-slate-300" : ""}
                  >
                    <td className="td">{formatDate(r.purchaseDate)}</td>
                    <td className="td font-mono font-semibold">
                      <Link to={`/skus/${r.skuId}`} className="hover:underline">
                        {r.sku?.code ?? "—"}
                      </Link>
                    </td>
                    <td className="td">{r.supplierName}</td>
                    <td className="td text-right">{formatMetres(r.quantityMetres)}</td>
                    <td className="td text-right">{formatPrice(r.costPricePerMetre)}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {data.rows.map((r) => (
              <li
                key={r.id}
                className={`card hover:shadow-md hover:-translate-y-0.5 ${r.voidedAt ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/skus/${r.skuId}`} className="break-all font-mono font-bold text-brand-700">
                    {r.sku?.code ?? "—"}
                  </Link>
                  <span className="shrink-0 text-sm text-slate-600">{formatDate(r.purchaseDate)}</span>
                </div>
                <p className="mt-1 break-words text-sm">{r.supplierName}</p>
                <p className="mt-1 text-sm">
                  {formatMetres(r.quantityMetres)} - {formatPrice(r.costPricePerMetre)}/m
                </p>
                <div className="mt-3">
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
                </div>
              </li>
            ))}
          </ul>

          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
