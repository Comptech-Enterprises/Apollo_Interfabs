import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiSkus } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ui";
import { suggestSkuCode } from "@/lib/sku-code";
import { WAREHOUSES } from "@/lib/validation";

export type SkuFormValues = {
  id?: string;
  code: string;
  fabricName: string;
  fabricType: string;
  variant: string;

  otherIdentifiers: string;
  warehouse: string;
  sellingPricePerMetre: string;
  lowStockThreshold: string;
};

export const emptySku: SkuFormValues = {
  code: "",
  fabricName: "",
  fabricType: "",
  variant: "",

  otherIdentifiers: "",
  warehouse: "Warehouse 1",
  sellingPricePerMetre: "",
  lowStockThreshold: "0",
};

export function SkuForm({
  initial = emptySku,
  mode,
  allowedWarehouses = [],
  role = "OWNER",
  onSuccess,
}: {
  initial?: SkuFormValues;
  mode: "create" | "edit";
  allowedWarehouses?: string[];
  role?: string;
  onSuccess?: () => void;
}) {
  const { can } = useAuth();
  const canEditPrice = can("inventory.editSellingPrice");
  const visibleWarehouses =
    allowedWarehouses.length > 0
      ? WAREHOUSES.filter((w) => allowedWarehouses.includes(w))
      : WAREHOUSES;
  const [v, setV] = useState(initial);
  const [codeTouched, setCodeTouched] = useState(mode === "edit" && Boolean(initial.code));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const setField =
    (k: keyof SkuFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const next = { ...v, [k]: e.target.value };
      if (!codeTouched && (k === "variant" || k === "fabricType")) {
        const suggested = suggestSkuCode(next.variant, next.fabricType);
        if (suggested) {
          next.code = suggested;
        }
      }
      setV(next);
      if (errors[k]) {
        setErrors((errs) => ({ ...errs, [k]: "" }));
      }
    };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uppercaseVal = e.target.value.toUpperCase();
    setCodeTouched(uppercaseVal.length > 0);
    setV((s) => ({ ...s, code: uppercaseVal }));
    if (errors.code) {
      setErrors((errs) => ({ ...errs, code: "" }));
    }
  };

  const handleRegenerate = () => {
    let suggested = suggestSkuCode(v.variant, v.fabricType);
    if (!suggested) {
      if (v.fabricName && !v.variant && !v.fabricType) {
        suggested = suggestSkuCode(v.fabricName.slice(0, 4), "FAB", new Date(), true);
      } else {
        suggested = suggestSkuCode(v.variant, v.fabricType, new Date(), true);
      }
    }
    setV((s) => ({ ...s, code: suggested }));
    setCodeTouched(false);
    if (errors.code) {
      setErrors((errs) => ({ ...errs, code: "" }));
    }
    toast.success(`Generated SKU: ${suggested}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const payload = {
      code: v.code.trim().toUpperCase(),
      fabricName: v.fabricName.trim(),
      fabricType: v.fabricType.trim(),
      variant: v.variant.trim(),

      otherIdentifiers: v.otherIdentifiers.trim() || undefined,
      warehouse: v.warehouse,
      sellingPricePerMetre: Number(v.sellingPricePerMetre) || 0,
      lowStockThreshold: Number(v.lowStockThreshold) || 0,
    };

    try {
      if (mode === "create") {
        const res = await apiSkus.create(payload);
        toast.success(res.message);
        setV(emptySku);
        setCodeTouched(false);
        navigate(can("modules.skus") ? "/skus" : "/dashboard");
      } else if (initial.id) {
        const res = await apiSkus.update(initial.id, payload);
        toast.success(res.message);
        navigate(can("inventory.viewDetails") ? `/skus/${initial.id}` : "/dashboard");
      }
      onSuccess?.();
    } catch (err: any) {
      if (err.fields) {
        setErrors(err.fields);
      }
      toast.error(err.message || "Failed to save SKU");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fabric name" name="fabricName" error={errors.fabricName}>
          <input
            id="fabricName"
            name="fabricName"
            value={v.fabricName}
            onChange={setField("fabricName")}
            required
            maxLength={100}
            placeholder="e.g. Premium Cotton Cambric"
            className="input"
            autoComplete="off"
          />
        </Field>
        <Field label="Fabric type" name="fabricType" error={errors.fabricType} hint="e.g. Polyester, Cotton">
          <input
            id="fabricType"
            name="fabricType"
            value={v.fabricType}
            onChange={setField("fabricType")}
            required
            maxLength={50}
            placeholder="e.g. Cotton"
            className="input"
            autoComplete="off"
          />
        </Field>
      </div>

      <Field label="Variant" name="variant" error={errors.variant}>
        <input
          id="variant"
          name="variant"
          value={v.variant}
          onChange={setField("variant")}
          required
          maxLength={50}
          placeholder="e.g. Navy Blue"
          className="input"
          autoComplete="off"
        />
      </Field>

      <Field
        label="SKU code"
        name="code"
        error={errors.code}
        hint={mode === "edit" ? undefined : "Suggested from variant, type and month (e.g. BLK-POLY-JUN26). You can edit it."}
      >
        {mode === "edit" ? (
          <input
            id="code"
            name="code"
            value={v.code}
            disabled
            className="input font-mono bg-slate-100 text-slate-500 cursor-not-allowed"
          />
        ) : (
          <div className="flex gap-2">
            <input
              id="code"
              name="code"
              value={v.code}
              onChange={handleCodeChange}
              required
              maxLength={40}
              autoCapitalize="characters"
              placeholder="e.g. BLK-POLY-JUN26"
              className="input font-mono flex-1"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-secondary shrink-0 text-xs cursor-pointer"
              onClick={handleRegenerate}
            >
              Re-generate
            </button>
          </div>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Other identifiers"
          name="otherIdentifiers"
          error={errors.otherIdentifiers}
          hint="Width, GSM, lot number, notes (optional)"
        >
          <input
            id="otherIdentifiers"
            name="otherIdentifiers"
            value={v.otherIdentifiers}
            onChange={setField("otherIdentifiers")}
            maxLength={300}
            placeholder="e.g. Width 58 inches, 140 GSM"
            className="input"
            autoComplete="off"
          />
        </Field>
        <Field label="Warehouse" name="warehouse" error={errors.warehouse}>
          <select id="warehouse" name="warehouse" value={v.warehouse} onChange={setField("warehouse")} className="input">
            {visibleWarehouses.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {canEditPrice && (
          <Field
            label="Selling price per metre (₹)"
            name="sellingPricePerMetre"
            error={errors.sellingPricePerMetre}
            hint="Sales staff will see and sell at this price"
          >
            <input
              id="sellingPricePerMetre"
              name="sellingPricePerMetre"
              type="number"
              step="0.01"
              min="0"
              max="99999999"
              inputMode="decimal"
              value={v.sellingPricePerMetre}
              onChange={setField("sellingPricePerMetre")}
              placeholder="e.g. 180.00"
              className="input"
            />
          </Field>
        )}
        <Field
          label="Low stock threshold (metres)"
          name="lowStockThreshold"
          error={errors.lowStockThreshold}
          hint="Alert when stock falls to this level. 0 turns the alert off."
        >
          <input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            step="0.01"
            min="0"
            max="99999999"
            inputMode="decimal"
            value={v.lowStockThreshold}
            onChange={setField("lowStockThreshold")}
            placeholder="e.g. 25"
            className="input"
          />
        </Field>
      </div>

      <div className="flex gap-2 pt-2">
        <SubmitButton loading={loading} className="btn-primary w-full sm:w-auto">
          {mode === "create" ? "Create SKU" : "Save changes"}
        </SubmitButton>
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary cursor-pointer">
          Cancel
        </button>
      </div>
    </form>
  );
}
