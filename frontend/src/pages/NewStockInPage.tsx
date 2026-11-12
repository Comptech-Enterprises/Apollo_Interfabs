import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiStock, apiFabricTypes, apiCheckItemCode } from "@/lib/api";
import { todayIST } from "@/lib/validation";
import { AccessDenied, Field, PageHeader, SubmitButton } from "@/components/ui";

function generateItemCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function NewStockInPage() {
  const { can, defaultRoute } = useAuth();
  const canCreatePurchase = can("purchases.create");
  const [itemCode, setItemCode] = useState(generateItemCode());
  const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [fabricTypes, setFabricTypes] = useState<any[]>([]);
  const [fabricType, setFabricType] = useState("");
  const [variant, setVariant] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [quantityInches, setQuantityInches] = useState("");
  const [quantityMetres, setQuantityMetres] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [costPricePerMetre, setCostPricePerMetre] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIST());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!canCreatePurchase) return;
    apiFabricTypes.list().then(setFabricTypes).catch(console.error);
  }, [canCreatePurchase]);

  const checkCode = async (code: string) => {
    if (!code.trim() || !canCreatePurchase) return;
    setCodeStatus("checking");
    try {
      const res = await apiCheckItemCode(code.trim());
      setCodeStatus(res.available ? "available" : "taken");
    } catch {
      setCodeStatus("idle");
    }
  };

  useEffect(() => {
    if (!canCreatePurchase) return;
    checkCode(itemCode);
  }, [canCreatePurchase]);

  if (!canCreatePurchase) {
    return <AccessDenied fallbackTo={defaultRoute} />;
  }

  const handleRegenerate = async () => {
    let code = generateItemCode();
    setItemCode(code);
    setCodeStatus("checking");
    try {
      let res = await apiCheckItemCode(code);
      let attempts = 0;
      while (!res.available && attempts < 5) {
        code = generateItemCode();
        res = await apiCheckItemCode(code);
        attempts++;
      }
      setItemCode(code);
      setCodeStatus(res.available ? "available" : "taken");
    } catch {
      setCodeStatus("idle");
    }
  };

  const skuCodePreview =
    itemCode && variant
      ? `${itemCode.toUpperCase()}-${variant.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${quantityInches || "0"}-${quantityMetres || "0"}`
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!itemCode.trim()) errs.itemCode = "Enter item code";
    if (!fabricType) errs.fabricType = "Select fabric type";
    if (!variant.trim()) errs.variant = "Enter variant";
    if (!warehouse) errs.warehouse = "Select warehouse";
    if (!supplierName.trim()) errs.supplierName = "Enter supplier name";
    const qm = Number(quantityMetres);
    if (!qm || qm <= 0) errs.quantityMetres = "Enter valid quantity in metres";
    const cost = Number(costPricePerMetre);
    if (!cost || cost <= 0) errs.costPricePerMetre = "Enter valid cost price";
    if (codeStatus === "taken") errs.itemCode = "Item code already in use. Regenerate.";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await apiStock.recordStockIn({
        itemCode: itemCode.trim().toUpperCase(),
        fabricType: fabricType.trim(),
        variant: variant.trim(),
        warehouse,
        supplierName: supplierName.trim(),
        quantityInches: Number(quantityInches) || 0,
        quantityMetres: qm,
        costPricePerMetre: cost,
        purchaseDate,
      });
      toast.success(res.message);
      navigate(can("modules.purchases") && can("purchases.view") ? "/purchases" : defaultRoute);
    } catch (err: any) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.message || "Failed to record purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Record Purchase" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Item code"
              name="itemCode"
              error={errors.itemCode}
              hint={
                codeStatus === "checking"
                  ? "Checking..."
                  : codeStatus === "available"
                  ? "Available"
                  : codeStatus === "taken"
                  ? "Already in use"
                  : undefined
              }
            >
              <div className="flex gap-2">
                <input
                  id="itemCode"
                  value={itemCode}
                  onChange={(e) => {
                    setItemCode(e.target.value.toUpperCase());
                    setCodeStatus("idle");
                  }}
                  onBlur={() => checkCode(itemCode)}
                  maxLength={40}
                  autoComplete="off"
                  placeholder="e.g. A3X9K1"
                  className={`input flex-1 font-mono uppercase ${
                    codeStatus === "taken" ? "border-red-500" : codeStatus === "available" ? "border-green-500" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="btn-secondary px-3 py-2 text-sm whitespace-nowrap cursor-pointer rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  Regenerate
                </button>
              </div>
            </Field>

            <Field label="Fabric type" name="fabricType" error={errors.fabricType}>
              <select
                id="fabricType"
                value={fabricType}
                onChange={(e) => setFabricType(e.target.value)}
                className="input"
              >
                <option value="">Select fabric type</option>
                {fabricTypes.map((ft) => (
                  <option key={ft.id || ft._id} value={ft.name}>
                    {ft.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Variant" name="variant" error={errors.variant}>
              <input
                id="variant"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                maxLength={50}
                autoComplete="off"
                placeholder="e.g. White, Black, Red"
                className="input"
              />
            </Field>

            <Field label="Warehouse" name="warehouse" error={errors.warehouse}>
              <select
                id="warehouse"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="input"
              >
                <option value="">Select warehouse</option>
                <option value="Warehouse 1">Warehouse 1</option>
                <option value="Warehouse 2">Warehouse 2</option>
                <option value="Warehouse 3">Warehouse 3</option>
                <option value="Warehouse 4">Warehouse 4</option>
              </select>
            </Field>

            <Field label="Supplier name" name="supplierName" error={errors.supplierName}>
              <input
                id="supplierName"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                maxLength={100}
                autoComplete="off"
                placeholder="e.g. Vardhman Textiles"
                className="input"
              />
            </Field>

            <Field label="Cost price per metre (₹)" name="costPricePerMetre" error={errors.costPricePerMetre}>
              <input
                id="costPricePerMetre"
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

            <Field label="Quantity (inches)" name="quantityInches" error={errors.quantityInches}>
              <input
                id="quantityInches"
                type="number"
                step="0.01"
                min="0"
                max="99999999"
                inputMode="decimal"
                value={quantityInches}
                onChange={(e) => setQuantityInches(e.target.value)}
                placeholder="e.g. 48"
                className="input"
              />
            </Field>

            <Field label="Quantity (metres)" name="quantityMetres" error={errors.quantityMetres}>
              <input
                id="quantityMetres"
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

            <Field label="Purchase date" name="purchaseDate" error={errors.purchaseDate}>
              <input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                max={todayIST()}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className="input"
              />
            </Field>
          </div>

          {skuCodePreview && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">SKU code preview</p>
              <p className="font-mono font-bold text-sm text-slate-800">{skuCodePreview}</p>
            </div>
          )}

          <SubmitButton loading={loading} className="btn-primary w-full cursor-pointer">
            Record purchase
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
