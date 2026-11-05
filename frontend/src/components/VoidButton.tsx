import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { apiStock } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ui";

export function VoidButton({
  id,
  kind,
  label,
  onSuccess,
}: {
  id: string;
  kind: "sale" | "stockin";
  label: string;
  onSuccess?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for voiding.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res =
        kind === "sale"
          ? await apiStock.voidSale(id, reason)
          : await apiStock.voidStockIn(id, reason);
      toast.success(res.message);
      dialog.current?.close();
      setReason("");
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to void entry.");
      toast.error(err.message || "Failed to void entry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn-secondary min-h-11 sm:min-h-9 px-3 py-1.5 text-xs font-semibold cursor-pointer"
        onClick={() => {
          setError(null);
          setReason("");
          dialog.current?.showModal();
        }}
      >
        Void
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-0 backdrop:bg-slate-900/50"
        aria-label={`Void ${label}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <h2 className="text-lg font-bold">Void this {kind === "sale" ? "sale" : "purchase"}?</h2>
          <p className="break-words text-sm text-slate-600">
            {label}. {kind === "sale" ? "The metres will be added back to stock." : "The metres will be removed from stock."} The entry stays in the log marked as voided.
          </p>
          <Field label="Reason" name={`reason-${id}`} error={error ?? undefined}>
            <input
              id={`reason-${id}`}
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={200}
              placeholder="Explain why this entry is being voided"
              className="input"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <SubmitButton loading={loading} className="btn-danger">
              Void entry
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
