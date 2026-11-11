import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiSkus } from "@/lib/api";
import { formatMetres, formatPrice, isLowStock } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { ActiveBadge, LowStockBadge } from "@/components/bits";

export function SkusPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSkus = (query?: string) => {
    setLoading(true);
    apiSkus
      .list(query)
      .then(setSkus)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSkus();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSkus(q);
  };

  return (
    <>
      <PageHeader
        title="SKUs"
        actions={null}
      />
      <form onSubmit={handleSearch} role="search" className="mb-4 flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search SKUs
        </label>
        <input
          id="q"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search SKU code, fabric name, colour or specs..."
          maxLength={100}
          autoComplete="off"
          className="input"
        />
        <button className="btn-secondary cursor-pointer">Search</button>
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              loadSkus("");
            }}
            className="btn-secondary cursor-pointer"
          >
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <div className="card text-center py-12 text-slate-500">Loading SKUs...</div>
      ) : skus.length === 0 ? (
        <EmptyState
          title={q ? "No SKUs match your search" : "No SKUs yet"}
          body={q ? undefined : "SKUs are auto-created when you record a purchase."}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {skus.map((s) => (
            <li key={s.id} className={`card hover:shadow-md hover:-translate-y-0.5 ${s.active ? "" : "opacity-75"}`}>
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/skus/${s.id}`}
                  className="min-w-0 break-all font-mono text-base font-bold text-brand-700 hover:underline"
                >
                  {s.code}
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ActiveBadge active={s.active} />
                  {isLowStock(s.currentStock, s.lowStockThreshold) && <LowStockBadge />}
                </div>
              </div>
              <p className="mt-1 break-words text-sm text-slate-600">
                {s.fabricName} - {s.fabricType} - {s.colour}
                {s.pattern ? ` - ${s.pattern}` : ""}
              </p>
              {s.otherIdentifiers && (
                <p className="text-xs text-slate-500 font-mono mt-0.5">{s.otherIdentifiers}</p>
              )}
              <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
                {user?.role === "OWNER" && s.sellingPricePerMetre !== undefined && (
                  <>
                    <dt className="text-slate-500">Price / m</dt>
                    <dd className="text-right">{formatPrice(s.sellingPricePerMetre)}</dd>
                  </>
                )}
                <dt className="text-slate-500">In stock</dt>
                <dd className="text-right font-semibold">{formatMetres(s.currentStock)}</dd>
              </dl>
              <div className="mt-3 flex gap-2">
                <Link to={`/skus/${s.id}`} className="btn-secondary flex-1 text-center">
                  Details
                </Link>
                <Link to={`/skus/${s.id}/edit`} className="btn-secondary flex-1 text-center">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
