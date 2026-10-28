import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getFacets } from "@/actions/search";
import { InventorySearch } from "./InventorySearch";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Search and browse fabric inventory.",
};
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();
  const isManager = user.role === "MANAGER";
  const facets = await getFacets();

  return (
    <>
      <div className="mx-auto mb-6 flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/sales/new" className="btn-primary">Record sale</Link>
          {isManager && <Link href="/stock-in/new" className="btn-secondary">Record stock in</Link>}
        </div>
      </div>
      <InventorySearch isManager={isManager} facets={facets} />
    </>
  );
}
