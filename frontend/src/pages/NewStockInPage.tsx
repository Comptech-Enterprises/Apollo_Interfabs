import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiStock } from "@/lib/api";
import { todayIST } from "@/lib/validation";
import { Field, PageHeader, SubmitButton } from "@/components/ui";

export function NewStockInPage() {
  const [itemName, setItemName] = useState("");
  const [colour, setColour] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [quantityMetres, setQuantityMetres] = useState("");
  const [costPricePerMetre, setCostPricePerMetre] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIST());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setErrors({ itemName: "Enter item name" });
      return;
    }
    if (!supplierName.trim()) {
      setErrors({ supplierName: "Enter supplier name" });
      return;
    }
    const qty = Number(quantityMetres);
    if (!qty || qty <= 0) {
      setErrors({ quantityMetres: "Enter valid quantity" });
      return;
    }
    const cost = Number(costPricePerMetre);
    if (!cost || cost <= 0) {
      setErrors({ costPricePerMetre: "Enter valid cost price" });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await apiStock.recordStockIn({
        itemName: itemName.trim(),
        colour: colour.trim() || undefined,
        supplierName: supplierName.trim(),
        quantityMetres: qty,
        costPricePerMetre: cost,
        purchaseDate,
      });
      toast.success(res.message);
      navigate("/purchases");
    } catch (err: any) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.message || "Failed to record stock in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Record purchase (Goods Receipt)" />
      <div className="mx-auto max-w-xl">
        <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
          <Field label="Item name" name="itemName" error={errors.itemName}>
            <input
              id="itemName"
              name="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Micro dot"
              autoComplete="off"
              className="input"
            />
          </Field>

          <Field label="Colour" name="colour" error={errors.colour}>
            <input
              id="colour"
              name="colour"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              maxLength={50}
              placeholder="e.g. White (optional, defaults to Natural)"
              autoComplete="off"
              className="input"
            />
          </Field>

          <Field label="Supplier name" name="supplierName" error={errors.supplierName}>
            <input
              id="supplierName"
              name="supplierName"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Vardhman Textiles"
              autoComplete="off"
              className="input"
            />
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
                value={quantityMetres}
                onChange={(e) => setQuantityMetres(e.target.value)}
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
                value={costPricePerMetre}
                onChange={(e) => setCostPricePerMetre(e.target.value)}
                placeholder="e.g. 185.00"
                required
                className="input"
              />
            </Field>
          </div>

          <Field label="Purchase date" name="purchaseDate" error={errors.purchaseDate}>
            <input
              id="purchaseDate"
              name="purchaseDate"
              type="date"
              value={purchaseDate}
              max={todayIST()}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
              className="input"
            />
          </Field>

          <SubmitButton loading={loading} className="btn-primary w-full cursor-pointer">
            Record purchase
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
