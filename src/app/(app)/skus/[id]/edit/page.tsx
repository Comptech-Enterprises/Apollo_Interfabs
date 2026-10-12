import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { SkuForm } from "@/components/SkuForm";

export const metadata: Metadata = { title: "Edit SKU", description: "Edit a SKU, its selling price and low-stock threshold." };

export default async function EditSku({ params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;
  const s = await prisma.sku.findUnique({ where: { id } });
  if (!s) notFound();
  return (
    <>
      <PageHeader title={`Edit ${s.code}`} actions={<Link href={`/skus/${s.id}`} className="btn-secondary">Back to details</Link>} />
      <div className="mx-auto max-w-2xl">
        <SkuForm
          mode="edit"
          initial={{
            id: s.id,
            code: s.code,
            fabricName: s.fabricName,
            fabricType: s.fabricType,
            colour: s.colour,
            pattern: s.pattern ?? "",
            otherIdentifiers: s.otherIdentifiers ?? "",
            sellingPricePerMetre: s.sellingPricePerMetre.toString(),
            lowStockThreshold: s.lowStockThreshold.toString(),
          }}
        />
      </div>
    </>
  );
}
