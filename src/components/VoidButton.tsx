"use client";

import { useRef } from "react";
import { voidSaleAction, voidStockInAction } from "@/actions/stock";
import { Field, SubmitButton, useToastAction } from "@/components/ui";

export function VoidButton({ id, kind, label }: { id: string; kind: "sale" | "stockin"; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { formAction, errors } = useToastAction(kind === "sale" ? voidSaleAction : voidStockInAction, {
    onSuccess: () => dialog.current?.close(),
  });
  return (
    <>
      <button type="button" className="btn-secondary min-h-9 px-3 py-1 text-xs" onClick={() => dialog.current?.showModal()}>
        Void
      </button>
      <dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-0 backdrop:bg-slate-900/50" aria-label={`Void ${label}`}>
        <form action={formAction} className="space-y-4 p-5">
          <h2 className="text-lg font-bold">Void this {kind === "sale" ? "sale" : "purchase"}?</h2>
          <p className="break-words text-sm text-slate-600">
            {label}. {kind === "sale" ? "The metres will be added back to stock." : "The metres will be removed from stock."} The entry stays in the log marked as voided.
          </p>
          <input type="hidden" name="id" value={id} />
          <Field label="Reason" name={`reason-${id}`} error={errors.reason}>
            <input id={`reason-${id}`} name="reason" required maxLength={200} className="input" />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => dialog.current?.close()}>Cancel</button>
            <SubmitButton className="btn-danger">Void entry</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
