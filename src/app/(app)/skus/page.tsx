import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { formatMetres, formatPrice, isLowStock } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { ActiveBadge, LowStockBadge } from "@/components/bits";

export const metadata: Metadata = { title: "SKUs", description: "Manage fabric SKUs, selling prices and status." };
export const dynamic = "force-dynamic";

export default async function SkuList({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireManager();
  const { q } = await searchParams;
  const tokens = q?.trim().split(/\s+/).filter(Boolean);
  const skus = await prisma.sku.findMany({
    where: tokens && tokens.length > 0
      ? {
          AND: tokens.map((t) => ({
            OR: [
              { code: { contains: t, mode: "insensitive" } },
              { fabricName: { contains: t, mode: "insensitive" } },
              { fabricType: { contains: t, mode: "insensitive" } },
              { colour: { contains: t, mode: "insensitive" } },
              { pattern: { contains: t, mode: "insensitive" } },
              { otherIdentifiers: { contains: t, mode: "insensitive" } },
            ],
          })),
        }
      : undefined,
    orderBy: { code: "asc" },
  });
  return (
    <>
      <PageHeader title="SKUs" subtitle="Add SKUs, set prices and mark them active or inactive." actions={<Link href="/skus/new" className="btn-primary">Add SKU</Link>} />
      <form method="get" role="search" className="mb-4 flex gap-2">
        <label htmlFor="q" className="sr-only">Search SKUs</label>
        <input id="q" name="q" defaultValue={q ?? ""} placeholder="Search SKU code, fabric name, colour or specs..." maxLength={100} autoComplete="off" className="input" />
        <button className="btn-secondary">Search</button>
        {q && <Link href="/skus" className="btn-secondary">Clear</Link>}
      </form>
      {skus.length === 0 ? (
        <EmptyState title={q ? "No SKUs match your search" : "No SKUs yet"} body={q ? undefined : "Add your first SKU to get started."}>
          {!q && <Link href="/skus/new" className="btn-primary">Add SKU</Link>}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {skus.map((s) => (
            <li key={s.id} className={`card ${s.active ? "" : "opacity-75"}`}>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/skus/${s.id}`} className="min-w-0 break-all font-mono text-base font-bold text-brand-700 hover:underline">{s.code}</Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ActiveBadge active={s.active} />
                  {isLowStock(s.currentStock, s.lowStockThreshold) && <LowStockBadge />}
                </div>
              </div>
              <p className="mt-1 break-words text-sm text-slate-600">{s.fabricName} - {s.fabricType} - {s.colour}{s.pattern ? ` - ${s.pattern}` : ""}</p>
              {s.otherIdentifiers && <p className="text-xs text-slate-500 font-mono mt-0.5">{s.otherIdentifiers}</p>}
              <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
                <dt className="text-slate-500">Price / m</dt><dd className="text-right">{formatPrice(s.sellingPricePerMetre)}</dd>
                <dt className="text-slate-500">In stock</dt><dd className="text-right font-semibold">{formatMetres(s.currentStock)}</dd>
              </dl>
              <div className="mt-3 flex gap-2">
                <Link href={`/skus/${s.id}`} className="btn-secondary flex-1">Details</Link>
                <Link href={`/skus/${s.id}/edit`} className="btn-secondary flex-1">Edit</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
