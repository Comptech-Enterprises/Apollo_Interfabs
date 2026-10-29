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
      <div className="mx-auto mb-6 max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/sales/new" className="btn-primary flex-1 text-center">Record Sale</Link>
          {isManager && <Link href="/purchases" className="btn-secondary flex-1 text-center">Record Purchase</Link>}
          {isManager && <Link href="/stock-in/new" className="btn-secondary flex-1 text-center">Record GR</Link>}
        </div>
      </div>
      <InventorySearch isManager={isManager} facets={facets} />
    </>
  );
}
