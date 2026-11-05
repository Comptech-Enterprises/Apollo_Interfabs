import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiStock, apiSkus } from "@/lib/api";
import { formatDate, formatMetres, formatPrice } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { Pagination, VoidedBadge } from "@/components/bits";
import { VoidButton } from "@/components/VoidButton";

export function SalesLogPage() {
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
    apiSkus.list().then(setSkus).catch(console.error);
  }, []);

  const loadSales = (p = page, f = filters) => {
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
  }, [page]);

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
      <PageHeader title="Sales log" />
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
          <label htmlFor="buyer" className="mb-1 block text-sm font-medium">Buyer</label>
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
        <div className="card text-center py-12 text-slate-500">Loading sales...</div>
      ) : data.rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No sales match your filters" : "No sales recorded yet"}
          body={filtered ? "Try different filters." : "Sales will appear here once they are recorded."}
        />
      ) : (
        <>
          <div className="card hidden overflow-x-auto p-0 md:block sm:p-0">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">Date</th>
                  <th className="th">SKU</th>
                  <th className="th text-right">Metres</th>
                  <th className="th text-right">Sale Price</th>
                  <th className="th text-right">Sold Price</th>
                  <th className="th">Buyer</th>
                  <th className="th"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r) => {
                  const bg = r.voidedAt
                    ? ""
                    : r.soldPricePerMetre < r.pricePerMetre
                    ? "bg-red-50"
                    : r.soldPricePerMetre > r.pricePerMetre
                    ? "bg-green-50"
                    : "";
                  return (
                    <tr
                      key={r.id}
                      className={`${r.voidedAt ? "text-slate-400 line-through decoration-slate-300" : ""} ${bg}`}
                    >
                      <td className="td">{formatDate(r.saleDate)}</td>
                      <td className="td font-mono font-semibold">
                        <Link to={`/skus/${r.skuId}`} className="hover:underline">
                          {r.sku?.code ?? "—"}
                        </Link>
                      </td>
                      <td className="td text-right">{formatMetres(r.quantityMetres)}</td>
                      <td className="td text-right">{formatPrice(r.pricePerMetre)}</td>
                      <td className="td text-right font-semibold">{formatPrice(r.soldPricePerMetre)}</td>
                      <td className="td">{r.buyerName ?? "-"}</td>
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
                    <Link to={`/skus/${r.skuId}`} className="break-all font-mono font-bold text-brand-700">
                      {r.sku?.code ?? "—"}
                    </Link>
                    <span className="shrink-0 text-sm text-slate-600">{formatDate(r.saleDate)}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    {formatMetres(r.quantityMetres)} — Sale: {formatPrice(r.pricePerMetre)}/m, Sold: {formatPrice(r.soldPricePerMetre)}/m
                  </p>
                  <p className="break-words text-sm text-slate-600">Buyer: {r.buyerName ?? "-"}</p>
                  <div className="mt-3">
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
