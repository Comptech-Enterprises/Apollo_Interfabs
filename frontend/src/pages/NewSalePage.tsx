import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiSkus, apiStock } from "@/lib/api";
import { formatMetres, formatPrice } from "@/lib/format";
import { todayIST } from "@/lib/validation";
import { Field, PageHeader, SubmitButton } from "@/components/ui";

export function NewSalePage() {
  const [skus, setSkus] = useState<any[]>([]);
  const [skuId, setSkuId] = useState("");
  const [qty, setQty] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [saleDate, setSaleDate] = useState(todayIST());
  const [buyerName, setBuyerName] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    apiSkus
      .list()
      .then((data) => {
        setSkus(data.filter((s) => s.active && Number(s.sellingPricePerMetre) > 0));
      })
      .catch(console.error);
  }, []);

  const shown = useMemo(() => {
    const tokens = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return skus;
    return skus.filter((s) => {
      if (s.id === skuId) return true;
      const haystack = `${s.code} ${s.fabricName ?? ""} ${s.colour ?? ""} ${s.otherIdentifiers ?? ""}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [skus, filter, skuId]);

  const sku = skus.find((s) => s.id === skuId);
  const q = Number(qty);
  const total = sku && q > 0 ? Number(sku.sellingPricePerMetre) * q : null;
  const tooMuch = sku && q > sku.currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuId) {
      setErrors({ skuId: "Select a SKU" });
      return;
    }
    if (!q || q <= 0) {
      setErrors({ quantityMetres: "Enter valid quantity" });
      return;
    }
    if (!soldPrice || Number(soldPrice) <= 0) {
      setErrors({ soldPricePerMetre: "Enter sold price" });
      return;
    }
    if (!buyerName.trim()) {
      setErrors({ buyerName: "Enter company name" });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await apiStock.recordSale({
        skuId,
        quantityMetres: q,
        soldPricePerMetre: Number(soldPrice),
        saleDate,
        buyerName: buyerName.trim(),
      });
      toast.success(res.message);
      navigate("/sales");
    } catch (err: any) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.message || "Failed to record sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Record sale" />
      <div className="mx-auto max-w-xl">
        {skus.length === 0 ? (
          <div className="card text-center py-10">
            <p className="font-semibold text-slate-800">No active SKUs available for sale</p>
            <p className="mt-1 text-sm text-slate-500">Ask a manager to add or activate a SKU before recording sales.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
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
              <select
                id="skuId"
                name="skuId"
                value={skuId}
                onChange={(e) => setSkuId(e.target.value)}
                required
                className="input"
              >
                <option value="">Select a SKU...</option>
                {shown.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.fabricName}, {s.colour} ({formatMetres(s.currentStock)} in stock)
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Selling price / m" name="price" hint="Set by manager">
                <input
                  id="price"
                  readOnly
                  tabIndex={-1}
                  value={sku ? formatPrice(sku.sellingPricePerMetre) : "-"}
                  className="input bg-slate-100"
                />
              </Field>
              <Field label="Available" name="avail">
                <input
                  id="avail"
                  readOnly
                  tabIndex={-1}
                  value={sku ? formatMetres(sku.currentStock) : "-"}
                  className="input bg-slate-100"
                />
              </Field>
            </div>

            <Field
              label="Metres sold"
              name="quantityMetres"
              error={errors.quantityMetres ?? (tooMuch ? `Only ${formatMetres(sku!.currentStock)} available in stock` : undefined)}
            >
              <input
                id="quantityMetres"
                name="quantityMetres"
                type="number"
                step="0.01"
                min="0.01"
                max={sku ? sku.currentStock : 99999999}
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="e.g. 12.5"
                required
                className="input"
              />
            </Field>

            <Field label="Sold price per metre (₹)" name="soldPricePerMetre" error={errors.soldPricePerMetre}>
              <input
                id="soldPricePerMetre"
                name="soldPricePerMetre"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="e.g. 180.00"
                required
                className="input"
              />
            </Field>

            <Field label="Sale date" name="saleDate" error={errors.saleDate}>
              <input
                id="saleDate"
                name="saleDate"
                type="date"
                value={saleDate}
                max={todayIST()}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                className="input"
              />
            </Field>

            <Field label="Sold to (Company)" name="buyerName" error={errors.buyerName}>
              <input
                id="buyerName"
                name="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                maxLength={100}
                autoComplete="off"
                placeholder="Company name"
                required
                className="input"
              />
            </Field>

            {total !== null && sku && (
              <p className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-900">
                {formatMetres(q)} x {formatPrice(sku.sellingPricePerMetre)} ={" "}
                <span className="font-bold">{formatPrice(total)}</span>
              </p>
            )}

            <SubmitButton loading={loading} disabled={Boolean(tooMuch)} className="btn-primary w-full cursor-pointer">
              Record sale
            </SubmitButton>
          </form>
        )}
      </div>
    </>
  );
}
