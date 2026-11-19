import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiSkus } from "@/lib/api";
import { formatMetres, formatPrice, isLowStock } from "@/lib/format";
import { AccessDenied, EmptyState, PageHeader } from "@/components/ui";
import { ActiveBadge, LowStockBadge } from "@/components/bits";
import { CardSkeleton } from "@/components/TableSkeleton";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import {
  InfiniteScrollSentinel,
  InfiniteScrollSpinner,
  InfiniteScrollEnd,
  BackToTopButton,
} from "@/components/InfiniteScroll";

export function SkusPage() {
  const { can, defaultRoute } = useAuth();
  const hasAccess = can("modules.skus") || can("inventory.viewDetails") || can("inventory.createSku") || can("inventory.editSku");
  const canSeePrice = can("inventory.viewPrices");
  const canViewDetails = can("inventory.viewDetails");
  const canEditSku = can("inventory.editSku");
  const canCreateSku = can("inventory.createSku");
  const [q, setQ] = useState("");
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const CHUNK_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);

  const loadSkus = (query?: string) => {
    setLoading(true);
    apiSkus
      .list(query)
      .then((data) => {
        setSkus(data || []);
        setVisibleCount(CHUNK_SIZE);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!hasAccess) return;
    loadSkus();
  }, [hasAccess]);

  const paged = useMemo(() => skus.slice(0, visibleCount), [skus, visibleCount]);
  const hasMore = visibleCount < skus.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, skus.length));
  }, [skus.length]);

  const { sentinelRef, showScrollTop, scrollToTop } = useInfiniteScroll({
    hasMore,
    isLoading: loading,
    onLoadMore: handleLoadMore,
    rootMargin: "300px",
  });

  if (!hasAccess) {
    return <AccessDenied fallbackTo={defaultRoute} />;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSkus(q);
  };

  return (
    <>
      <PageHeader
        title="SKUs"
        subtitle={skus.length > 0 ? `${skus.length} total SKUs` : undefined}
        actions={
          canCreateSku ? (
            <Link to="/skus/new" className="btn-primary">
              Add SKU
            </Link>
          ) : null
        }
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
          placeholder="Search SKU code, fabric name, variant or specs..."
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : skus.length === 0 ? (
        <EmptyState
          title={q ? "No SKUs match your search" : "No SKUs yet"}
          body={q ? undefined : "SKUs are auto-created when you record a purchase."}
        />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {paged.map((s) => (
              <li key={s.id} className={`card hover:shadow-md hover:-translate-y-0.5 ${s.active ? "" : "opacity-75"}`}>
                <div className="flex items-start justify-between gap-2">
                  {canViewDetails ? (
                    <Link
                      to={`/skus/${s.id}`}
                      className="min-w-0 break-all font-mono text-base font-bold text-brand-700 hover:underline"
                    >
                      {s.code}
                    </Link>
                  ) : (
                    <span className="min-w-0 break-all font-mono text-base font-bold text-slate-900">
                      {s.code}
                    </span>
                  )}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ActiveBadge active={s.active} />
                    {isLowStock(s.currentStock, s.lowStockThreshold) && <LowStockBadge />}
                  </div>
                </div>
                <p className="mt-1 break-words text-sm text-slate-600">
                  {s.fabricName} - {s.fabricType} - {s.variant}
                  {s.pattern ? ` - ${s.pattern}` : ""}
                </p>
                {s.otherIdentifiers && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{s.otherIdentifiers}</p>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
                  {canSeePrice && s.sellingPricePerMetre !== undefined && (
                    <>
                      <dt className="text-slate-500">Selling price / m</dt>
                      <dd className="text-right">
                        {Number(s.sellingPricePerMetre) > 0 ? (
                          formatPrice(s.sellingPricePerMetre)
                        ) : (
                          <span className="text-slate-400 italic text-xs">Not set</span>
                        )}
                      </dd>
                    </>
                  )}
                  <dt className="text-slate-500">In stock</dt>
                  <dd className="text-right font-semibold">{formatMetres(s.currentStock)}</dd>
                </dl>
                {(canViewDetails || canEditSku) && (
                  <div className="mt-3 flex gap-2">
                    {canViewDetails && (
                      <Link to={`/skus/${s.id}`} className="btn-secondary flex-1 text-center">
                        Details
                      </Link>
                    )}
                    {canEditSku && (
                      <Link to={`/skus/${s.id}/edit`} className="btn-secondary flex-1 text-center">
                        Edit
                      </Link>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <InfiniteScrollSentinel innerRef={sentinelRef} />
          {hasMore && <InfiniteScrollSpinner label="Loading more SKUs..." />}
          {!hasMore && skus.length > 0 && (
            <InfiniteScrollEnd count={skus.length} label="SKUs" onScrollTop={scrollToTop} />
          )}

          <BackToTopButton visible={showScrollTop} onClick={scrollToTop} />
        </>
      )}
    </>
  );
}
