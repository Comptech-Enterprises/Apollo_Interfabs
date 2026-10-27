import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMetres, formatPrice, isLowStock } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { ActiveBadge, LowStockBadge, OutBadge } from "@/components/bits";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Live fabric stock per SKU with selling prices and low-stock alerts.",
};
export const dynamic = "force-dynamic";

type SP = { q?: string; type?: string; colour?: string; pattern?: string; status?: string; low?: string };

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isManager = user.role === "MANAGER";

  const where: Prisma.SkuWhereInput = {};
  if (sp.q?.trim()) {
    const tokens = sp.q.trim().split(/\s+/).filter(Boolean);
    where.AND = tokens.map((token) => ({
      OR: [
        { code: { contains: token, mode: "insensitive" } },
        { fabricName: { contains: token, mode: "insensitive" } },
        { fabricType: { contains: token, mode: "insensitive" } },
        { colour: { contains: token, mode: "insensitive" } },
        { pattern: { contains: token, mode: "insensitive" } },
        { otherIdentifiers: { contains: token, mode: "insensitive" } },
      ],
    }));
  }
  if (sp.type) where.fabricType = sp.type;
  if (sp.colour) where.colour = sp.colour;
  if (sp.pattern) where.pattern = sp.pattern;
  // Sales staff only see active SKUs; managers can filter.
  if (!isManager) where.active = true;
  else if (sp.status === "active") where.active = true;
  else if (sp.status === "inactive") where.active = false;

  const [skusRaw, facets, allActive] = await Promise.all([
    prisma.sku.findMany({ where, orderBy: [{ code: "asc" }] }),
    prisma.sku.findMany({ select: { fabricType: true, colour: true, pattern: true }, distinct: ["fabricType", "colour", "pattern"] }),
    prisma.sku.findMany({ where: { active: true }, select: { id: true, code: true, currentStock: true, lowStockThreshold: true } }),
  ]);

  const types = [...new Set(facets.map((f) => f.fabricType))].sort();
  const colours = [...new Set(facets.map((f) => f.colour))].sort();
  const patterns = [...new Set(facets.map((f) => f.pattern).filter((p): p is string => !!p))].sort();

  const lowAll = allActive.filter((s) => isLowStock(s.currentStock, s.lowStockThreshold));
  let skus = skusRaw;
  if (sp.low === "1") skus = skus.filter((s) => isLowStock(s.currentStock, s.lowStockThreshold));

  const totalMetres = skus.reduce((a, s) => a + Number(s.currentStock), 0);
  const filtered = !!(sp.q || sp.type || sp.colour || sp.pattern || sp.status || sp.low);

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Current stock per SKU, updated with every purchase and sale."
        actions={
          <>
            <Link href="/sales/new" className="btn-primary">Record sale</Link>
            {isManager && <Link href="/stock-in/new" className="btn-secondary">Record stock in</Link>}
          </>
        }
      />

      {lowAll.length > 0 && (
        <div role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{lowAll.length} SKU{lowAll.length > 1 ? "s are" : " is"} running low</p>
          <p className="mt-1 break-words">
            {lowAll.slice(0, 8).map((s) => s.code).join(", ")}
            {lowAll.length > 8 ? ` and ${lowAll.length - 8} more` : ""}
          </p>
          <Link href="/dashboard?low=1" className="mt-2 inline-block font-medium underline">Show low stock only</Link>
        </div>
      )}

      <form method="get" className="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Filter inventory">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="mb-1 block text-sm font-medium text-slate-700">Search</label>
          <input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="SKU code, fabric name..." maxLength={100} autoComplete="off" className="input" />
        </div>
        <Select id="type" label="Fabric type" value={sp.type} options={types} />
        <Select id="colour" label="Colour" value={sp.colour} options={colours} />
        <Select id="pattern" label="Pattern" value={sp.pattern} options={patterns} />
        {isManager ? (
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ""} className="input">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        ) : null}
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="low" value="1" defaultChecked={sp.low === "1"} className="h-5 w-5 rounded border-slate-300" />
          Low stock only
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button className="btn-primary">Apply filters</button>
          {filtered && <Link href="/dashboard" className="btn-secondary">Clear</Link>}
        </div>
      </form>

      {skus.length === 0 ? (
        <EmptyState
          title={filtered ? "No SKUs match your filters" : "No SKUs yet"}
          body={filtered ? "Try changing or clearing the filters." : isManager ? "Add your first SKU to start tracking stock." : "A manager needs to add SKUs before stock appears here."}
        >
          {!filtered && isManager && <Link href="/skus/new" className="btn-primary">Add SKU</Link>}
        </EmptyState>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600">
            {skus.length} SKU{skus.length > 1 ? "s" : ""} - {formatMetres(totalMetres)} in stock
          </p>

          {/* Desktop table */}
          <div className="card hidden overflow-x-auto p-0 md:block sm:p-0">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="th">SKU</th>
                  <th className="th">Fabric</th>
                  <th className="th">Type</th>
                  <th className="th">Colour</th>
                  <th className="th">Pattern</th>
                  <th className="th text-right">Price / m</th>
                  <th className="th text-right">In stock</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {skus.map((s) => {
                  const low = isLowStock(s.currentStock, s.lowStockThreshold);
                  const out = Number(s.currentStock) <= 0;
                  return (
                    <tr key={s.id} className={s.active ? "" : "bg-slate-50 text-slate-500"}>
                      <td className="td font-mono font-semibold">
                        {isManager ? <Link className="text-brand-700 hover:underline" href={`/skus/${s.id}`}>{s.code}</Link> : s.code}
                      </td>
                      <td className="td">
                        <div>{s.fabricName}</div>
                        {s.otherIdentifiers && <div className="text-xs text-slate-500 font-mono mt-0.5">{s.otherIdentifiers}</div>}
                      </td>
                      <td className="td">{s.fabricType}</td>
                      <td className="td">{s.colour}</td>
                      <td className="td">{s.pattern ?? "-"}</td>
                      <td className="td text-right">{formatPrice(s.sellingPricePerMetre)}</td>
                      <td className="td text-right font-semibold">{formatMetres(s.currentStock)}</td>
                      <td className="td space-x-1">
                        {isManager && !s.active && <ActiveBadge active={false} />}
                        {out ? <OutBadge /> : low ? <LowStockBadge /> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (no sideways scrolling) */}
          <ul className="space-y-3 md:hidden">
            {skus.map((s) => {
              const low = isLowStock(s.currentStock, s.lowStockThreshold);
              const out = Number(s.currentStock) <= 0;
              return (
                <li key={s.id} className={`card ${s.active ? "" : "opacity-70"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-all font-mono text-base font-bold">
                        {isManager ? <Link className="text-brand-700" href={`/skus/${s.id}`}>{s.code}</Link> : s.code}
                      </p>
                      <p className="break-words text-sm text-slate-600">{s.fabricName}</p>
                      {s.otherIdentifiers && <p className="text-xs text-slate-500 font-mono mt-0.5">{s.otherIdentifiers}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {isManager && !s.active && <ActiveBadge active={false} />}
                      {out ? <OutBadge /> : low ? <LowStockBadge /> : null}
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <dt className="text-slate-500">Type</dt><dd className="text-right">{s.fabricType}</dd>
                    <dt className="text-slate-500">Colour</dt><dd className="text-right">{s.colour}</dd>
                    <dt className="text-slate-500">Pattern</dt><dd className="text-right">{s.pattern ?? "-"}</dd>
                    <dt className="text-slate-500">Price / m</dt><dd className="text-right">{formatPrice(s.sellingPricePerMetre)}</dd>
                    <dt className="text-slate-500">In stock</dt><dd className="text-right font-semibold">{formatMetres(s.currentStock)}</dd>
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

function Select({ id, label, value, options }: { id: string; label: string; value?: string; options: string[] }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select id={id} name={id} defaultValue={value ?? ""} className="input">
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
