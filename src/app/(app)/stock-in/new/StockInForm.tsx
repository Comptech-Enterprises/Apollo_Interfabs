"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { recordStockInAction } from "@/actions/stock";
import { Field, SubmitButton, useToastAction } from "@/components/ui";

type SkuOption = { id: string; code?: string; fabricName?: string; label: string };

export function StockInForm({
  skus,
  today,
  initialSku,
}: {
  skus: SkuOption[];
  today: string;
  initialSku: string;
}) {
  const [skuId, setSkuId] = useState(initialSku);
  const [filter, setFilter] = useState("");
  const { formRef, formAction, errors } = useToastAction(recordStockInAction, {
    resetOnSuccess: true,
    onSuccess: () => {
      setFilter("");
      setSkuId("");
    },
  });

  const shown = useMemo(() => {
    const tokens = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return skus;
    return skus.filter((s) => {
      if (s.id === skuId) return true;
      const haystack = `${s.code ?? ""} ${s.fabricName ?? ""} ${s.label}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [skus, filter, skuId]);

  if (skus.length === 0)
    return (
      <div className="card text-center">
        <p className="font-semibold">Add a SKU first</p>
        <Link href="/skus/new" className="btn-primary mt-4">Add SKU</Link>
      </div>
    );

  return (
    <form ref={formRef} action={formAction} className="card space-y-4" noValidate>
      <Field label="Find SKU" name="skuFilter" hint="Search by fabric name, SKU code or colour to narrow the list.">
        <input
          id="skuFilter"
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search fabric name or SKU code..."
          maxLength={100}
          className="input"
          autoComplete="off"
        />
      </Field>
      <Field label="SKU" name="skuId" error={errors.skuId}>
        <select id="skuId" name="skuId" value={skuId} onChange={(e) => setSkuId(e.target.value)} required className="input">
          <option value="">Select a SKU...</option>
          {shown.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Supplier name" name="supplierName" error={errors.supplierName}>
        <input id="supplierName" name="supplierName" required maxLength={100} placeholder="e.g. Vardhman Textiles" autoComplete="off" className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantity (metres)" name="quantityMetres" error={errors.quantityMetres}>
          <input
            id="quantityMetres"
            name="quantityMetres"
            type="number"
            step="0.01"
            min="0.01"
            max="99999999"
            inputMode="decimal"
            placeholder="e.g. 500"
            required
            className="input"
          />
        </Field>
        <Field label="Cost price per metre (₹)" name="costPricePerMetre" error={errors.costPricePerMetre}>
          <input
            id="costPricePerMetre"
            name="costPricePerMetre"
            type="number"
            step="0.01"
            min="0.01"
            max="99999999"
            inputMode="decimal"
            placeholder="e.g. 185.00"
            required
            className="input"
          />
        </Field>
      </div>
      <Field label="Purchase date" name="purchaseDate" error={errors.purchaseDate}>
        <input id="purchaseDate" name="purchaseDate" type="date" defaultValue={today} max={today} required className="input" />
      </Field>
      <SubmitButton className="btn-primary w-full">Record stock in</SubmitButton>
    </form>
  );
}
