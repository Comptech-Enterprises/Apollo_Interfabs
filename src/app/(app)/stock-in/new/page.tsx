import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { todayIST } from "@/lib/validation";
import { StockInForm } from "./StockInForm";

export const metadata: Metadata = { title: "Record stock in", description: "Record a new fabric arrival against a SKU." };
export const dynamic = "force-dynamic";

export default async function NewStockIn({ searchParams }: { searchParams: Promise<{ sku?: string }> }) {
  await requireManager();
  const { sku } = await searchParams;
  const skus = await prisma.sku.findMany({ orderBy: { code: "asc" } });
  return (
    <>
      <PageHeader title="Record stock in" subtitle="Add a fabric arrival to a SKU's stock." />
      <div className="mx-auto max-w-xl">
        <StockInForm
          today={todayIST()}
          initialSku={skus.some((s) => s.id === sku) ? sku! : ""}
          skus={skus.map((s) => ({
            id: s.id,
            code: s.code,
            fabricName: s.fabricName,
            label: `${s.code} - ${s.fabricName}, ${s.colour}${s.active ? "" : " (inactive)"}`,
          }))}
        />
      </div>
    </>
  );
}
