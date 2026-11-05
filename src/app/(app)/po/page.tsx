import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMetres } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { Pagination } from "@/components/bits";

export const metadata: Metadata = { title: "PO", description: "Purchase order requests." };
export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function PurchaseOrders({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();

  if (user.role !== "OWNER") redirect("/po/new");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [rows, count, users] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    prisma.purchaseOrder.count(),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return (
    <>
      <PageHeader title="PO" />
      {rows.length === 0 ? (
        <EmptyState title="No POs yet" body="POs from the sales team will appear here." />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Company</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 transition-colors duration-150"
                    style={{
                      animation: `fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.04}s both`,
                    }}
                  >
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{r.companyName}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-brand-700">{formatMetres(r.quantity)}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{userMap.get(r.createdById) ?? "Unknown"}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 max-w-xs truncate">{r.description || "—"}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-slate-400">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="mt-3 space-y-3 sm:hidden">
            {rows.map((r, i) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                style={{
                  animation: `fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.05}s both`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{r.companyName}</p>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">{formatMetres(r.quantity)}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-500">by {userMap.get(r.createdById) ?? "Unknown"} · {formatDate(r.createdAt)}</p>
                {r.description && <p className="mt-2 text-sm text-slate-400 italic">{r.description}</p>}
              </li>
            ))}
          </ul>

          <Pagination page={page} pages={Math.ceil(count / PAGE)} basePath="/po" params={{}} />
          <style>{`
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(12px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @media (max-width: 639px) {
              table { display: none; }
            }
            @media (min-width: 640px) {
              .sm\\:hidden { display: none; }
            }
          `}</style>
        </>
      )}
    </>
  );
}
