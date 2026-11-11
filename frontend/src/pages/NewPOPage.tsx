import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiPo } from "@/lib/api";
import { Field, PageHeader, SubmitButton } from "@/components/ui";

export function NewPOPage() {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setErrors({ itemName: "Enter item name" });
      return;
    }
    const q = Number(quantity);
    if (!q || q <= 0) {
      setErrors({ quantity: "Enter valid quantity" });
      return;
    }
    if (!customerName.trim()) {
      setErrors({ customerName: "Enter customer name" });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await apiPo.create({
        itemName: itemName.trim(),
        quantity: q,
        customerName: customerName.trim(),
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
      <PageHeader title="New Purchase Order" />
      <div className="mx-auto max-w-xl">
        <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
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

          <Field label="Customer name" name="customerName" error={errors.customerName}>
            <input
              id="customerName"
              name="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Raymond Ltd"
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
