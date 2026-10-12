import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatMetres, formatPrice, isLowStock } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ActiveBadge, LowStockBadge, VoidedBadge } from "@/components/bits";
import { SkuActiveToggle } from "@/components/SkuActiveToggle";
import { VoidButton } from "@/components/VoidButton";

export const metadata: Metadata = { title: "SKU details", description: "SKU details with purchase, sales and price history." };
export const dynamic = "force-dynamic";

export default async function SkuDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;
  const s = await prisma.sku.findUnique({
    where: { id },
    include: {
      stockIns: { orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }] },
      sales: { orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }], take: 50 },
      prices: { orderBy: { changedAt: "desc" }, take: 20 },
    },
  });
  if (!s) notFound();

  return (
    <>
      <PageHeader
        title={s.code}
        subtitle={`${s.fabricName} - ${s.fabricType} - ${s.colour}${s.pattern ? ` - ${s.pattern}` : ""}`}
        actions={
          <>
            <Link href={`/stock-in/new?sku=${s.id}`} className="btn-primary">Record stock in</Link>
            <Link href={`/skus/${s.id}/edit`} className="btn-secondary">Edit</Link>
            <SkuActiveToggle id={s.id} active={s.active} />
          </>
        }
      />

      <div className="card mb-6">
        <div className="mb-3 flex flex-wrap gap-2"><ActiveBadge active={s.active} />{isLowStock(s.currentStock, s.lowStockThreshold) && <LowStockBadge />}</div>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div><dt className="text-slate-500">In stock</dt><dd className="text-lg font-bold">{formatMetres(s.currentStock)}</dd></div>
          <div><dt className="text-slate-500">Selling price / m</dt><dd className="text-lg font-bold">{formatPrice(s.sellingPricePerMetre)}</dd></div>
          <div><dt className="text-slate-500">Low stock at</dt><dd className="text-lg font-bold">{Number(s.lowStockThreshold) > 0 ? formatMetres(s.lowStockThreshold) : "Off"}</dd></div>
          {s.otherIdentifiers && <div className="min-w-0"><dt className="text-slate-500">Other identifiers</dt><dd className="break-words">{s.otherIdentifiers}</dd></div>}
        </dl>
      </div>

      <h2 className="mb-2 text-lg font-bold">Purchase history</h2>
      {s.stockIns.length === 0 ? (
        <p className="card mb-6 text-sm text-slate-600">No stock has been recorded for this SKU yet.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {s.stockIns.map((p) => (
            <li key={p.id} className={`card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${p.voidedAt ? "opacity-60" : ""}`}>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{formatDate(p.purchaseDate)} - {formatMetres(p.quantityMetres)} {p.voidedAt && <VoidedBadge />}</p>
                <p className="break-words text-slate-600">Supplier: {p.supplierName} - Cost: {formatPrice(p.costPricePerMetre)}/m</p>
                {p.voidedAt && <p className="text-xs text-slate-500">Voided {formatDateTime(p.voidedAt)}: {p.voidReason}</p>}
              </div>
              {!p.voidedAt && <VoidButton id={p.id} kind="stockin" label={`${formatDate(p.purchaseDate)}, ${formatMetres(p.quantityMetres)} from ${p.supplierName}`} />}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 text-lg font-bold">Recent sales</h2>
      {s.sales.length === 0 ? (
        <p className="card mb-6 text-sm text-slate-600">No sales for this SKU yet.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {s.sales.map((x) => (
            <li key={x.id} className={`card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${x.voidedAt ? "opacity-60" : ""}`}>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{formatDate(x.saleDate)} - {formatMetres(x.quantityMetres)} at {formatPrice(x.pricePerMetre)}/m {x.voidedAt && <VoidedBadge />}</p>
                <p className="break-words text-slate-600">Buyer: {x.buyerName ?? "-"}</p>
                {x.voidedAt && <p className="text-xs text-slate-500">Voided {formatDateTime(x.voidedAt)}: {x.voidReason}</p>}
              </div>
              {!x.voidedAt && <VoidButton id={x.id} kind="sale" label={`${formatDate(x.saleDate)}, ${formatMetres(x.quantityMetres)}`} />}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 text-lg font-bold">Selling price history</h2>
      <ul className="card divide-y divide-slate-100 text-sm">
        {s.prices.map((p) => (
          <li key={p.id} className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <span>{formatDateTime(p.changedAt)}</span>
            <span>{p.oldPrice ? `${formatPrice(p.oldPrice)} -> ` : "Set to "}<strong>{formatPrice(p.newPrice)}</strong></span>
          </li>
        ))}
      </ul>
    </>
  );
}
