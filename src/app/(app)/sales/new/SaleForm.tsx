"use client";

import { useMemo, useState } from "react";
import { recordSaleAction } from "@/actions/stock";
import { Field, SubmitButton, useToastAction } from "@/components/ui";
import { formatMetres, formatPrice } from "@/lib/format";

type Sku = { id: string; code: string; label: string; price: number; stock: number };

export function SaleForm({ skus, today }: { skus: Sku[]; today: string }) {
  const [skuId, setSkuId] = useState("");
  const [qty, setQty] = useState("");
  const [filter, setFilter] = useState("");
  const { formRef, formAction, errors } = useToastAction(recordSaleAction, {
    resetOnSuccess: true,
    onSuccess: () => {
      setSkuId("");
      setQty("");
      setFilter("");
    },
  });

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? skus.filter((s) => s.label.toLowerCase().includes(f) || s.id === skuId) : skus;
  }, [skus, filter, skuId]);
  const sku = skus.find((s) => s.id === skuId);
  const q = Number(qty);
  const total = sku && q > 0 ? sku.price * q : null;
  const tooMuch = sku && q > sku.stock;

  if (skus.length === 0)
    return (
      <div className="card text-center">
        <p className="font-semibold">No active SKUs available</p>
        <p className="mt-1 text-sm text-slate-600">Ask a manager to add or activate a SKU before recording sales.</p>
      </div>
    );

  return (
    <form ref={formRef} action={formAction} className="card space-y-4" noValidate>
      <Field label="Find SKU" name="skuFilter" hint="Type to narrow the list below.">
        <input id="skuFilter" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Code, fabric or colour" className="input" autoComplete="off" />
      </Field>
      <Field label="SKU" name="skuId" error={errors.skuId}>
        <select id="skuId" name="skuId" value={skuId} onChange={(e) => setSkuId(e.target.value)} required className="input">
          <option value="">Select a SKU…</option>
          {shown.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price per metre" name="price" hint="Set by manager">
          <input id="price" readOnly tabIndex={-1} aria-readonly="true" value={sku ? formatPrice(sku.price) : "—"} className="input bg-slate-100" />
        </Field>
        <Field label="Available" name="avail">
          <input id="avail" readOnly tabIndex={-1} aria-readonly="true" value={sku ? formatMetres(sku.stock) : "—"} className="input bg-slate-100" />
        </Field>
      </div>

      <Field label="Metres sold" name="quantityMetres" error={errors.quantityMetres ?? (tooMuch ? `Only ${formatMetres(sku!.stock)} available` : undefined)}>
        <input id="quantityMetres" name="quantityMetres" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 12.5" required className="input" />
      </Field>
      <Field label="Sale date" name="saleDate" error={errors.saleDate}>
        <input id="saleDate" name="saleDate" type="date" defaultValue={today} max={today} required className="input" />
      </Field>
      <Field label="Buyer name (optional)" name="buyerName" error={errors.buyerName}>
        <input id="buyerName" name="buyerName" maxLength={100} autoComplete="off" className="input" />
      </Field>

      {total !== null && (
        <p className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-900">
          {formatMetres(q)} × {formatPrice(sku!.price)} = <span className="font-bold">{formatPrice(total)}</span>
        </p>
      )}
      <SubmitButton className="btn-primary w-full" disabled={!!tooMuch}>Record sale</SubmitButton>
    </form>
  );
}
