import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiSkus, apiStock } from "@/lib/api";
import { todayIST } from "@/lib/validation";
import { Field, PageHeader, SubmitButton } from "@/components/ui";

export function NewStockInPage() {
  const [searchParams] = useSearchParams();
  const initialSku = searchParams.get("sku") || "";

  const [skus, setSkus] = useState<any[]>([]);
  const [skuId, setSkuId] = useState(initialSku);
  const [filter, setFilter] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [quantityMetres, setQuantityMetres] = useState("");
  const [costPricePerMetre, setCostPricePerMetre] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIST());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    apiSkus
      .list()
      .then((data) => {
        setSkus(data.filter((s) => s.active));
        if (initialSku && data.some((s) => s.id === initialSku)) {
          setSkuId(initialSku);
        }
      })
      .catch(console.error);
  }, [initialSku]);

  const shown = useMemo(() => {
    const tokens = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return skus;
    return skus.filter((s) => {
      if (s.id === skuId) return true;
      const haystack = `${s.code ?? ""} ${s.fabricName ?? ""} ${s.otherIdentifiers ?? ""}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [skus, filter, skuId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuId) {
      setErrors({ skuId: "Select a SKU" });
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
        skuId,
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
      <PageHeader title="Record stock in (Goods Receipt)" subtitle="Add fabric arrivals against an existing SKU." />
      <div className="mx-auto max-w-xl">
        {skus.length === 0 ? (
          <div className="card text-center py-10">
            <p className="font-semibold text-slate-800">Add a SKU first</p>
            <Link to="/skus/new" className="btn-primary mt-4 inline-block">
              Add SKU
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
            <Field label="Find SKU" name="skuFilter" hint="Search by fabric name, SKU code or specs to narrow the list.">
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
                    {s.code} - {s.fabricName}, {s.colour}
                  </option>
                ))}
              </select>
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
              Record stock in
            </SubmitButton>
          </form>
        )}
      </div>
    </>
  );
}
