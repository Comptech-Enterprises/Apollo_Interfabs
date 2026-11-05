import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMetres, formatPrice } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { Pagination, VoidedBadge } from "@/components/bits";

export const metadata: Metadata = { title: "My Sales", description: "Your recorded sales." };
export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function MySales({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [rows, count] = await Promise.all([
    prisma.sale.findMany({
      where: { createdById: user.uid },
      include: { sku: true },
      orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    prisma.sale.count({ where: { createdById: user.uid } }),
  ]);

  return (
    <>
      <PageHeader title="My Sales" />
      {rows.length === 0 ? (
        <EmptyState
          title="No sales recorded yet"
          body="Sales you record will appear here."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li
                key={r.id}
                className={`card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${r.voidedAt ? "opacity-60" : ""}`}
                style={{
                  animation: `fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.05}s both`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-brand-700">{r.sku.code}</p>
                    <p className="text-sm text-slate-600">{r.sku.fabricName} - {r.sku.colour}</p>
                  </div>
                  <span className="shrink-0 text-sm text-slate-500">{formatDate(r.saleDate)}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Quantity</p>
                    <p className="font-medium">{formatMetres(r.quantityMetres)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Price/m</p>
                    <p className="font-medium">{formatPrice(r.pricePerMetre)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="font-bold">{formatPrice(Number(r.quantityMetres) * Number(r.pricePerMetre))}</p>
                  </div>
                </div>
                {r.buyerName && <p className="mt-1 text-sm text-slate-600">Sold to: {r.buyerName}</p>}
                {r.voidedAt && <div className="mt-2"><VoidedBadge /></div>}
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={Math.ceil(count / PAGE)} basePath="/my-sales" params={{}} />
          <style>{`
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(12px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
