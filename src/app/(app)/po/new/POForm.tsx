"use client";

import { createPurchaseOrderAction } from "@/actions/purchase-orders";
import { Field, SubmitButton, useToastAction } from "@/components/ui";

export function POForm() {
  const { formRef, formAction, errors } = useToastAction(createPurchaseOrderAction, { resetOnSuccess: true });

  return (
    <form ref={formRef} action={formAction} className="card space-y-4" noValidate>
      <Field label="Company requesting" name="companyName" error={errors.companyName}>
        <input id="companyName" name="companyName" maxLength={100} autoComplete="off" placeholder="Which company wants this?" required className="input" />
      </Field>
      <Field label="Quantity needed" name="quantity" error={errors.quantity}>
        <input id="quantity" name="quantity" type="number" step="0.01" min="0.01" inputMode="decimal" placeholder="e.g. 50" required className="input" />
      </Field>
      <Field label="Description (optional)" name="description" error={errors.description}>
        <textarea id="description" name="description" maxLength={300} rows={3} placeholder="Any notes or details..." className="input" />
      </Field>
      <SubmitButton className="btn-primary w-full">Submit PO</SubmitButton>
    </form>
  );
}
