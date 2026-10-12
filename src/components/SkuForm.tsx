"use client";

import { useState } from "react";
import { createSkuAction, updateSkuAction } from "@/actions/skus";
import { Field, SubmitButton, useToastAction } from "@/components/ui";
import { suggestSkuCode } from "@/lib/sku-code";

export type SkuFormValues = {
  id?: string;
  code: string;
  fabricName: string;
  fabricType: string;
  colour: string;
  pattern: string;
  otherIdentifiers: string;
  sellingPricePerMetre: string;
  lowStockThreshold: string;
};

export const emptySku: SkuFormValues = {
  code: "",
  fabricName: "",
  fabricType: "",
  colour: "",
  pattern: "",
  otherIdentifiers: "",
  sellingPricePerMetre: "",
  lowStockThreshold: "0",
};

export function SkuForm({ initial = emptySku, mode }: { initial?: SkuFormValues; mode: "create" | "edit" }) {
  const [v, setV] = useState(initial);
  const [codeTouched, setCodeTouched] = useState(mode === "edit");
  const { formRef, formAction, errors } = useToastAction(mode === "create" ? createSkuAction : updateSkuAction, {
    resetOnSuccess: mode === "create",
    onSuccess: () => {
      if (mode === "create") {
        setV(emptySku);
        setCodeTouched(false);
      }
    },
  });

  const set = (k: keyof SkuFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...v, [k]: e.target.value };
    if (!codeTouched && (k === "colour" || k === "fabricType")) next.code = suggestSkuCode(next.colour, next.fabricType);
    setV(next);
  };

  return (
    <form ref={formRef} action={formAction} className="card space-y-4" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fabric name" name="fabricName" error={errors.fabricName}>
          <input id="fabricName" name="fabricName" value={v.fabricName} onChange={set("fabricName")} required className="input" />
        </Field>
        <Field label="Fabric type" name="fabricType" error={errors.fabricType} hint="e.g. Polyester, Cotton">
          <input id="fabricType" name="fabricType" value={v.fabricType} onChange={set("fabricType")} required className="input" />
        </Field>
        <Field label="Colour" name="colour" error={errors.colour}>
          <input id="colour" name="colour" value={v.colour} onChange={set("colour")} required className="input" />
        </Field>
        <Field label="Pattern" name="pattern" error={errors.pattern} hint="e.g. Plain, Striped (optional)">
          <input id="pattern" name="pattern" value={v.pattern} onChange={set("pattern")} className="input" />
        </Field>
      </div>
      <Field
        label="SKU code"
        name="code"
        error={errors.code}
        hint="Suggested from colour, type and month (e.g. BLK-POLY-JUN26). You can edit it."
      >
        <input
          id="code"
          name="code"
          value={v.code}
          onChange={(e) => {
            setCodeTouched(true);
            setV({ ...v, code: e.target.value.toUpperCase() });
          }}
          required
          autoCapitalize="characters"
          className="input font-mono"
        />
      </Field>
      <Field label="Other identifiers" name="otherIdentifiers" error={errors.otherIdentifiers} hint="Width, GSM, lot number, notes (optional)">
        <input id="otherIdentifiers" name="otherIdentifiers" value={v.otherIdentifiers} onChange={set("otherIdentifiers")} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Selling price per metre (₹)" name="sellingPricePerMetre" error={errors.sellingPricePerMetre}>
          <input id="sellingPricePerMetre" name="sellingPricePerMetre" inputMode="decimal" value={v.sellingPricePerMetre} onChange={set("sellingPricePerMetre")} required className="input" />
        </Field>
        <Field label="Low stock threshold (metres)" name="lowStockThreshold" error={errors.lowStockThreshold} hint="Alert when stock falls to this level. 0 turns the alert off.">
          <input id="lowStockThreshold" name="lowStockThreshold" inputMode="decimal" value={v.lowStockThreshold} onChange={set("lowStockThreshold")} required className="input" />
        </Field>
      </div>
      <SubmitButton className="btn-primary w-full sm:w-auto">{mode === "create" ? "Create SKU" : "Save changes"}</SubmitButton>
    </form>
  );
}
