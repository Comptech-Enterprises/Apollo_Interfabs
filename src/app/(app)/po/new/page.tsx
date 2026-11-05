import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { POForm } from "./POForm";

export const metadata: Metadata = { title: "New PO", description: "Request a PO." };
export const dynamic = "force-dynamic";

export default async function NewPO() {
  await requireUser();
  return (
    <>
      <PageHeader title="New PO" />
      <div className="mx-auto max-w-xl">
        <POForm />
      </div>
    </>
  );
}
