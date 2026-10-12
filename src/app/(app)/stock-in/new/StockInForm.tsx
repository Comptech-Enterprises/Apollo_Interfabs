"use client";

import Link from "next/link";
import { recordStockInAction } from "@/actions/stock";
import { Field, SubmitButton, useToastAction } from "@/components/ui";

export function StockInForm({ skus, today, initialSku }: { skus: { id: string; label: string }[]; today: string; initialSku: string }) {
  const { formRef, formAction, errors } = useToastAction(recordStockInAction, { resetOnSuccess: true });
  if (skus.length === 0)
    return (
      <div className="card text-center">
        <p className="font-semibold">Add a SKU first</p>
        <Link href="/skus/new" className="btn-primary mt-4">Add SKU</Link>
      </div>
    );
  return (
    <form ref={formRef} action={formAction} className="card space-y-4" noValidate>
      <Field label="SKU" name="skuId" error={errors.skuId}>
        <select id="skuId" name="skuId" defaultValue={initialSku} required className="input">
          <option value="">Select a SKU...</option>
          {skus.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </Field>
      <Field label="Supplier name" name="supplierName" error={errors.supplierName}>
        <input id="supplierName" name="supplierName" required maxLength={100} autoComplete="off" className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantity (metres)" name="quantityMetres" error={errors.quantityMetres}>
          <input id="quantityMetres" name="quantityMetres" inputMode="decimal" required className="input" />
        </Field>
        <Field label="Cost price per metre (₹)" name="costPricePerMetre" error={errors.costPricePerMetre}>
          <input id="costPricePerMetre" name="costPricePerMetre" inputMode="decimal" required className="input" />
        </Field>
      </div>
      <Field label="Purchase date" name="purchaseDate" error={errors.purchaseDate}>
        <input id="purchaseDate" name="purchaseDate" type="date" defaultValue={today} max={today} required className="input" />
      </Field>
      <SubmitButton className="btn-primary w-full">Record stock in</SubmitButton>
    </form>
  );
}
