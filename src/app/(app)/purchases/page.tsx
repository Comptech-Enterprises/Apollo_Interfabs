import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { formatDate, formatMetres, formatPrice, toDateOnly } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { Pagination, VoidedBadge } from "@/components/bits";
import { VoidButton } from "@/components/VoidButton";

export const metadata: Metadata = { title: "Purchase log", description: "Complete date-wise log of fabric stock arrivals." };
export const dynamic = "force-dynamic";
const PAGE = 25;

type SP = { sku?: string; supplier?: string; from?: string; to?: string; page?: string };
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function Purchases({ searchParams }: { searchParams: Promise<SP> }) {
  await requireManager();
  const sp = await searchParams;
  const where: Prisma.StockInWhereInput = {};
  if (sp.sku) where.skuId = sp.sku;
  if (sp.supplier?.trim()) where.supplierName = { contains: sp.supplier.trim(), mode: "insensitive" };
  if (isDate(sp.from) || isDate(sp.to))
    where.purchaseDate = { ...(isDate(sp.from) && { gte: toDateOnly(sp.from!) }), ...(isDate(sp.to) && { lte: toDateOnly(sp.to!) }) };
  const page = Math.max(1, Number(sp.page) || 1);

  const [rows, count, skus] = await Promise.all([
    prisma.stockIn.findMany({ where, include: { sku: true }, orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE }),
    prisma.stockIn.count({ where }),
    prisma.sku.findMany({ select: { id: true, code: true, fabricName: true, colour: true }, orderBy: { code: "asc" } }),
  ]);
  const filtered = !!(sp.sku || sp.supplier || sp.from || sp.to);

  return (
    <>
      <PageHeader title="Purchase log" actions={<Link href="/stock-in/new" className="btn-primary">Record stock in</Link>} />
      <form method="get" role="search" className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="sku" className="mb-1 block text-sm font-medium">SKU / Fabric</label>
          <select id="sku" name="sku" defaultValue={sp.sku ?? ""} className="input">
            <option value="">All SKUs</option>
            {skus.map((s) => (
              <option key={s.id} value={s.id}>{s.code} - {s.fabricName} ({s.colour})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="supplier" className="mb-1 block text-sm font-medium">Supplier</label>
          <input id="supplier" name="supplier" defaultValue={sp.supplier ?? ""} maxLength={100} placeholder="Filter by supplier" className="input" />
        </div>
        <div>
          <label htmlFor="from" className="mb-1 block text-sm font-medium">From</label>
          <input id="from" name="from" type="date" defaultValue={sp.from ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-sm font-medium">To</label>
          <input id="to" name="to" type="date" defaultValue={sp.to ?? ""} className="input" />
        </div>
        <div className="flex items-end gap-2">
          <button className="btn-primary">Filter</button>
          {filtered && <Link href="/purchases" className="btn-secondary">Clear</Link>}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={filtered ? "No purchases match your filters" : "No purchases recorded yet"} body={filtered ? "Try different filters." : "Recorded stock arrivals will appear here."} />
      ) : (
        <>
          <div className="card hidden overflow-x-auto p-0 md:block sm:p-0">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-slate-200 bg-slate-50"><tr>
                <th className="th">Date</th><th className="th">SKU</th><th className="th">Supplier</th><th className="th text-right">Metres</th><th className="th text-right">Cost / m</th><th className="th"><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className={r.voidedAt ? "text-slate-400 line-through decoration-slate-300" : ""}>
                    <td className="td">{formatDate(r.purchaseDate)}</td>
                    <td className="td font-mono font-semibold"><Link href={`/skus/${r.skuId}`} className="hover:underline">{r.sku.code}</Link></td>
                    <td className="td">{r.supplierName}</td>
                    <td className="td text-right">{formatMetres(r.quantityMetres)}</td>
                    <td className="td text-right">{formatPrice(r.costPricePerMetre)}</td>
                    <td className="td text-right">{r.voidedAt ? <VoidedBadge /> : <VoidButton id={r.id} kind="stockin" label={`${r.sku.code}, ${formatMetres(r.quantityMetres)}`} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className={`card hover:shadow-md hover:-translate-y-0.5 ${r.voidedAt ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/skus/${r.skuId}`} className="break-all font-mono font-bold text-brand-700">{r.sku.code}</Link>
                  <span className="shrink-0 text-sm text-slate-600">{formatDate(r.purchaseDate)}</span>
                </div>
                <p className="mt-1 break-words text-sm">{r.supplierName}</p>
                <p className="mt-1 text-sm">{formatMetres(r.quantityMetres)} - {formatPrice(r.costPricePerMetre)}/m</p>
                <div className="mt-3">{r.voidedAt ? <VoidedBadge /> : <VoidButton id={r.id} kind="stockin" label={`${r.sku.code}, ${formatMetres(r.quantityMetres)}`} />}</div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={Math.ceil(count / PAGE)} basePath="/purchases" params={{ sku: sp.sku, supplier: sp.supplier, from: sp.from, to: sp.to }} />
        </>
      )}
    </>
  );
}
