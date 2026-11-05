import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiPo } from "@/lib/api";
import { todayIST } from "@/lib/validation";
import { Field, PageHeader, SubmitButton } from "@/components/ui";

export function NewPOPage() {
  const [billFrom, setBillFrom] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [poDate, setPoDate] = useState(todayIST());
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billFrom.trim()) {
      setErrors({ billFrom: "Enter Bill from entity / company" });
      return;
    }
    if (!itemName.trim()) {
      setErrors({ itemName: "Enter item name" });
      return;
    }
    const q = Number(quantity);
    if (!q || q <= 0) {
      setErrors({ quantity: "Enter valid quantity" });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await apiPo.create({
        billFrom: billFrom.trim(),
        supplierName: supplierName.trim() || undefined,
        poDate,
        itemName: itemName.trim(),
        quantity: q,
        description: description.trim() || undefined,
      });
      toast.success(res.message);
      navigate("/po");
    } catch (err: any) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.message || "Failed to submit PO");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="New Purchase Order" subtitle="Submit a client request for fabric procurement." />
      <div className="mx-auto max-w-xl">
        <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bill from" name="billFrom" error={errors.billFrom}>
              <input
                id="billFrom"
                name="billFrom"
                value={billFrom}
                onChange={(e) => setBillFrom(e.target.value)}
                maxLength={100}
                autoComplete="off"
                placeholder="e.g. Apollo Interfabs"
                required
                className="input"
              />
            </Field>

            <Field label="Supplier name" name="supplierName" error={errors.supplierName}>
              <input
                id="supplierName"
                name="supplierName"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                maxLength={100}
                autoComplete="off"
                placeholder="e.g. Vardhman Textiles"
                className="input"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PO Date" name="poDate" error={errors.poDate}>
              <input
                id="poDate"
                name="poDate"
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                required
                className="input"
              />
            </Field>

            <Field label="Item name" name="itemName" error={errors.itemName}>
              <input
                id="itemName"
                name="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                maxLength={100}
                autoComplete="off"
                placeholder="e.g. Black Polyester Suiting"
                required
                className="input"
              />
            </Field>
          </div>

          <Field label="Quantity needed (metres)" name="quantity" error={errors.quantity}>
            <input
              id="quantity"
              name="quantity"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 50"
              required
              className="input"
            />
          </Field>

          <Field label="Description (optional)" name="description" error={errors.description}>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Any specifications, notes or requirements..."
              className="input"
            />
          </Field>

          <SubmitButton loading={loading} className="btn-primary w-full cursor-pointer">
            Submit PO
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
