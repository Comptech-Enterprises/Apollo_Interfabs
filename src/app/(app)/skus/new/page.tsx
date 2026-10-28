import type { Metadata } from "next";
import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SkuForm } from "@/components/SkuForm";

export const metadata: Metadata = { title: "Add SKU", description: "Add a new fabric SKU with its selling price and low-stock threshold." };

export default async function NewSku() {
  await requireManager();
  return (
    <>
      <PageHeader title="Add SKU" actions={<Link href="/skus" className="btn-secondary">Back to SKUs</Link>} />
      <div className="mx-auto max-w-2xl">
        <SkuForm mode="create" />
      </div>
    </>
  );
}
