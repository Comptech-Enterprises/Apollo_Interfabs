import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiSkus, apiStock } from "@/lib/api";
import { formatMetres, formatPrice, stockColor } from "@/lib/format";
import { todayIST } from "@/lib/validation";
import { Field, PageHeader, SubmitButton } from "@/components/ui";
import { CardSkeleton } from "@/components/TableSkeleton";

export function NewSalePage() {
  const [searchParams] = useSearchParams();
  const initialSkuParam = searchParams.get("sku") || "";

  const [skus, setSkus] = useState<any[]>([]);
  const [skusLoading, setSkusLoading] = useState(true);
  const [skuId, setSkuId] = useState("");
  const [qty, setQty] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [saleDate, setSaleDate] = useState(todayIST());
  const [buyerName, setBuyerName] = useState("");
  const [filter, setFilter] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSkusLoading(true);
    apiSkus
      .list()
      .then((data) => {
        const priced = data.filter((s: any) => s.active && Number(s.sellingPricePerMetre) > 0);
        setSkus(priced);
        if (initialSkuParam) {
          const found = priced.find((s: any) => s.id === initialSkuParam);
          if (found) {
            setSkuId(found.id);
            setFilter(found.code);
          }
        }
      })
      .catch(console.error)
      .finally(() => setSkusLoading(false));
  }, [initialSkuParam]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const tokens = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return skus.filter((s) => {
      const haystack = `${s.code} ${s.fabricName ?? ""} ${s.fabricType ?? ""} ${s.colour ?? ""} ${s.pattern ?? ""} ${s.otherIdentifiers ?? ""} ${s.warehouse ?? ""}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [skus, filter]);

  const sku = useMemo(() => skus.find((s) => s.id === skuId), [skus, skuId]);
  const q = Number(qty);
  const total = sku && q > 0 ? Number(sku.sellingPricePerMetre) * q : null;
  const tooMuch = sku && q > sku.currentStock;

  const handleSelectSku = (s: any) => {
    setSkuId(s.id);
    setFilter(s.code);
    setShowSuggestions(false);
    setHighlightIndex(-1);
    if (errors.skuId) {
      setErrors((prev) => ({ ...prev, skuId: "" }));
    }
  };

  const handleClearSku = () => {
    setSkuId("");
    setFilter("");
    setShowSuggestions(false);
    setHighlightIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        handleSelectSku(suggestions[highlightIndex]);
      } else if (suggestions.length === 1) {
        handleSelectSku(suggestions[0]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuId) {
      setErrors({ skuId: "Search and select a SKU from suggestions" });
      inputRef.current?.focus();
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
        {skusLoading ? (
          <CardSkeleton />
        ) : skus.length === 0 ? (
          <div className="card text-center py-10">
            <p className="font-semibold text-slate-800">No active SKUs available for sale</p>
            <p className="mt-1 text-sm text-slate-500">Ask an owner to set selling prices on active SKUs before recording sales.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
            <Field
              label="Find SKU"
              name="skuFilter"
              error={errors.skuId}
              hint={
                sku
                  ? `${sku.fabricName} · ${sku.fabricType} · ${sku.colour}${sku.pattern ? ` · ${sku.pattern}` : ""} · ${sku.warehouse}`
                  : "Search by SKU code, fabric name, colour or type and pick from suggestions."
              }
            >
              <div ref={wrapperRef} className="relative">
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                  ref={inputRef}
                  id="skuFilter"
                  type="text"
                  value={filter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilter(val);
                    if (skuId) setSkuId("");
                    if (errors.skuId) setErrors((prev) => ({ ...prev, skuId: "" }));
                    setHighlightIndex(-1);
                    setShowSuggestions(val.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (!skuId && filter.trim().length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search SKU code, fabric name, colour, type..."
                  maxLength={100}
                  className="input pl-10 pr-9"
                  autoComplete="off"
                />
                {(filter || skuId) && (
                  <button
                    type="button"
                    onClick={handleClearSku}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                    aria-label="Clear SKU search"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {showSuggestions && filter.trim().length > 0 && (
                  <div className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-red-100 bg-white shadow-xl shadow-red-500/10">
                    {suggestions.length > 0 ? (
                      <ul>
                        {suggestions.map((s, i) => {
                          const sc = stockColor(Number(s.currentStock));
                          return (
                            <li
                              key={s.id}
                              onMouseDown={() => handleSelectSku(s)}
                              onMouseEnter={() => setHighlightIndex(i)}
                              className={`cursor-pointer ${sc.card} transition-all duration-150 ${
                                i === highlightIndex ? "brightness-95" : ""
                              }`}
                            >
                              <div className={`px-4 py-3 ${i > 0 ? "border-t border-inherit" : ""}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className={`font-mono font-bold ${sc.code}`}>{s.code}</span>
                                    <span className="ml-2 font-semibold text-slate-800 text-sm">{s.fabricName}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className={`rounded-full px-2 py-0.5 font-bold ${sc.badge}`}>
                                      {formatMetres(s.currentStock)}
                                    </span>
                                    {s.sellingPricePerMetre !== undefined && (
                                      <span className="font-semibold text-slate-700">
                                        {formatPrice(s.sellingPricePerMetre)}/m
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-600 opacity-80">
                                  {s.fabricType} · {s.colour}
                                  {s.pattern ? ` · ${s.pattern}` : ""} · {s.warehouse}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        No priced SKUs match &ldquo;{filter}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Selling price / m" name="price" hint="Set by owner">
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
