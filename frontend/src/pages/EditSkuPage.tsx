import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiSkus } from "@/lib/api";
import { PageHeader } from "@/components/ui";
import { SkuForm, type SkuFormValues } from "@/components/SkuForm";
import { CardSkeleton } from "@/components/TableSkeleton";

export function EditSkuPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [initial, setInitial] = useState<SkuFormValues | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiSkus
      .get(id)
      .then((s) => {
        setInitial({
          id: s.id,
          code: s.code,
          fabricName: s.fabricName,
          fabricType: s.fabricType,
          colour: s.colour,
          pattern: s.pattern ?? "",
          otherIdentifiers: s.otherIdentifiers ?? "",
          warehouse: s.warehouse,
          sellingPricePerMetre: s.sellingPricePerMetre !== undefined ? String(s.sellingPricePerMetre) : "",
          lowStockThreshold: String(s.lowStockThreshold ?? 0),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="mx-auto max-w-2xl"><CardSkeleton /></div>;
  }

  if (!initial) {
    return <div className="card text-center py-12 text-slate-500">SKU not found</div>;
  }

  return (
    <>
      <PageHeader title={`Edit ${initial.code}`} />
      <div className="mx-auto max-w-2xl">
        <SkuForm mode="edit" initial={initial} allowedWarehouses={user?.warehouses} role={user?.role} />
      </div>
    </>
  );
}
