import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { todayIST } from "@/lib/validation";
import { SaleForm } from "./SaleForm";

export const metadata: Metadata = {
  title: "Record sale",
  description: "Record a fabric sale. The selling price fills in automatically and stock is deducted.",
};
export const dynamic = "force-dynamic";

export default async function NewSale() {
  await requireUser();
  const skus = await prisma.sku.findMany({ where: { active: true }, orderBy: { code: "asc" } });
  return (
    <>
      <PageHeader title="Record sale" subtitle="Pick a SKU, enter the metres sold. The price is set by your manager." />
      <div className="mx-auto max-w-xl">
        <SaleForm
          today={todayIST()}
          skus={skus.map((s) => ({
            id: s.id,
            code: s.code,
            fabricName: s.fabricName,
            colour: s.colour,
            label: `${s.code} - ${s.fabricName}, ${s.colour}${s.pattern ? `, ${s.pattern}` : ""}`,
            price: Number(s.sellingPricePerMetre),
            stock: Number(s.currentStock),
          }))}
        />
      </div>
    </>
  );
}
