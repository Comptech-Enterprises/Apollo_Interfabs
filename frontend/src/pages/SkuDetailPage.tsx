import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiSkus } from "@/lib/api";
import { formatDate, formatDateTime, formatMetres, formatPrice, isLowStock } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ActiveBadge, LowStockBadge, VoidedBadge } from "@/components/bits";
import { SkuActiveToggle } from "@/components/SkuActiveToggle";
import { VoidButton } from "@/components/VoidButton";

export function SkuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [sku, setSku] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    apiSkus
      .get(id)
      .then(setSku)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <div className="card text-center py-12 text-slate-500">Loading SKU details...</div>;
  }

  if (!sku) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-lg font-bold text-slate-800">SKU not found</h2>
        <Link to="/skus" className="btn-secondary mt-4 inline-block">
          Back to SKUs
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={sku.code}
        subtitle={`${sku.fabricName} - ${sku.fabricType} - ${sku.colour}${sku.pattern ? ` - ${sku.pattern}` : ""}`}
        actions={
          <>
            <Link to={`/stock-in/new?sku=${sku.id}`} className="btn-primary">
              Record stock in
            </Link>
            <Link to={`/skus/${sku.id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <SkuActiveToggle id={sku.id} active={sku.active} onToggle={() => loadData()} />
          </>
        }
      />

      <div className="card mb-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <ActiveBadge active={sku.active} />
          {isLowStock(sku.currentStock, sku.lowStockThreshold) && <LowStockBadge />}
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <dt className="text-slate-500">In stock</dt>
            <dd className="text-lg font-bold text-slate-900">{formatMetres(sku.currentStock)}</dd>
          </div>
          {user?.role === "OWNER" && sku.sellingPricePerMetre !== undefined && (
            <div>
              <dt className="text-slate-500">Selling price / m</dt>
              <dd className="text-lg font-bold text-slate-900">{formatPrice(sku.sellingPricePerMetre)}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500">Low stock at</dt>
            <dd className="text-lg font-bold text-slate-900">
              {Number(sku.lowStockThreshold) > 0 ? formatMetres(sku.lowStockThreshold) : "Off"}
            </dd>
          </div>
          {sku.otherIdentifiers && (
            <div className="min-w-0">
              <dt className="text-slate-500">Other identifiers</dt>
              <dd className="break-words text-slate-800">{sku.otherIdentifiers}</dd>
            </div>
          )}
        </dl>
      </div>

      <h2 className="mb-2 text-lg font-bold text-slate-900">Purchase history</h2>
      {!sku.stockIns || sku.stockIns.length === 0 ? (
        <p className="card mb-6 text-sm text-slate-600">No stock has been recorded for this SKU yet.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {sku.stockIns.map((p: any) => (
            <li
              key={p.id}
              className={`card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
                p.voidedAt ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-slate-900">
                  {formatDate(p.purchaseDate)} - {formatMetres(p.quantityMetres)} {p.voidedAt && <VoidedBadge />}
                </p>
                <p className="break-words text-slate-600">
                  Supplier: {p.supplierName} - Cost: {formatPrice(p.costPricePerMetre)}/m
                </p>
                {p.voidedAt && (
                  <p className="text-xs text-slate-500">
                    Voided {formatDateTime(p.voidedAt)}: {p.voidReason}
                  </p>
                )}
              </div>
              {!p.voidedAt && (
                <VoidButton
                  id={p.id}
                  kind="stockin"
                  label={`${formatDate(p.purchaseDate)}, ${formatMetres(p.quantityMetres)} from ${p.supplierName}`}
                  onSuccess={loadData}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 text-lg font-bold text-slate-900">Recent sales</h2>
      {!sku.sales || sku.sales.length === 0 ? (
        <p className="card mb-6 text-sm text-slate-600">No sales for this SKU yet.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {sku.sales.map((x: any) => (
            <li
              key={x.id}
              className={`card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
                x.voidedAt ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-slate-900">
                  {formatDate(x.saleDate)} - {formatMetres(x.quantityMetres)} at {formatPrice(x.pricePerMetre)}/m{" "}
                  {x.voidedAt && <VoidedBadge />}
                </p>
                <p className="break-words text-slate-600">Buyer: {x.buyerName ?? "-"}</p>
                {x.voidedAt && (
                  <p className="text-xs text-slate-500">
                    Voided {formatDateTime(x.voidedAt)}: {x.voidReason}
                  </p>
                )}
              </div>
              {!x.voidedAt && (
                <VoidButton
                  id={x.id}
                  kind="sale"
                  label={`${formatDate(x.saleDate)}, ${formatMetres(x.quantityMetres)}`}
                  onSuccess={loadData}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {user?.role === "OWNER" && sku.prices && sku.prices.length > 0 && (
        <>
          <h2 className="mb-2 text-lg font-bold text-slate-900">Selling price history</h2>
          <ul className="card divide-y divide-slate-100 text-sm">
            {sku.prices.map((p: any) => (
              <li key={p.id} className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <span className="text-slate-600">{formatDateTime(p.changedAt)}</span>
                <span className="text-slate-900">
                  {p.oldPrice ? `${formatPrice(p.oldPrice)} -> ` : "Set to "}
                  <strong>{formatPrice(p.newPrice)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
