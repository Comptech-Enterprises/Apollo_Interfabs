import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiSkus } from "@/lib/api";
import { formatMetres, formatPrice, isLowStock } from "@/lib/format";
import { ActiveBadge, LowStockBadge, OutBadge } from "@/components/bits";

type Sku = {
  id: string;
  code: string;
  fabricName: string;
  fabricType: string;
  colour: string;
  pattern: string | null;
  otherIdentifiers: string | null;
  warehouse: string;
  sellingPricePerMetre?: number;
  currentStock: number;
  lowStockThreshold: number;
  active: boolean;
};

type Facets = { types: string[]; colours: string[]; patterns: string[] };

function stockColor(qty: number): {
  card: string;
  badge: string;
  code: string;
  sub: string;
} {
  if (qty < 25) {
    return {
      card: "bg-red-50/80 border-red-200",
      badge: "bg-red-100 text-red-700",
      code: "text-red-700",
      sub: "text-red-900",
    };
  }
  if (qty < 100) {
    return {
      card: "bg-orange-50/80 border-orange-200",
      badge: "bg-orange-100 text-orange-800",
      code: "text-blue-900",
      sub: "text-orange-950",
    };
  }
  if (qty <= 400) {
    return {
      card: "bg-blue-50/80 border-blue-200",
      badge: "bg-blue-100 text-blue-700",
      code: "text-blue-700",
      sub: "text-blue-950",
    };
  }
  return {
    card: "bg-purple-50/80 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    code: "text-purple-700",
    sub: "text-purple-950",
  };
}

export function DashboardPage() {
  const { user } = useAuth();
  const canManageStock = user?.role === "OWNER" || user?.role === "MANAGER";
  const isSales = user?.role === "SALES";

  const [query, setQuery] = useState("");
  const [facets, setFacets] = useState<Facets>({ types: [], colours: [], patterns: [] });
  const [filters, setFilters] = useState({
    type: "",
    colour: "",
    pattern: "",
    status: "",
    low: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<Sku[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState<Sku | null>(null);

  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<Sku[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiSkus.facets().then(setFacets).catch(console.error);
  }, []);

  const doSearch = useCallback(
    async (q: string, f: typeof filters) => {
      setSearching(true);
      try {
        const data = await apiSkus.list(q.trim());
        const filtered = data.filter((s: Sku) => {
          if (f.type && s.fabricType !== f.type) return false;
          if (f.colour && s.colour !== f.colour) return false;
          if (f.pattern && s.pattern !== f.pattern) return false;
          if (f.status === "active" && !s.active) return false;
          if (f.status === "inactive" && s.active) return false;
          if (f.low && !isLowStock(s.currentStock, s.lowStockThreshold)) return false;
          return true;
        });

        setSuggestions(filtered);
        if (q.trim().length > 0 || f.type || f.colour || f.pattern || f.status || f.low) {
          setResults(filtered);
          setHasSearched(true);
        } else {
          setResults([]);
          setHasSearched(false);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  // Debounced search when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        doSearch(query, filters);
        setShowSuggestions(true);
      } else if (!filters.type && !filters.colour && !filters.pattern && !filters.status && !filters.low) {
        setSuggestions([]);
        setShowSuggestions(false);
        setResults([]);
        setHasSearched(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, filters, doSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: Sku) => {
    setSelected(s);
    setShowSuggestions(false);
    setQuery(s.code);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        handleSelect(suggestions[highlightIndex]);
      } else {
        doSearch(query, filters);
        setShowSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const applyFilters = () => {
    doSearch(query, filters);
    setShowSuggestions(false);
    setSelected(null);
  };

  const clearAll = () => {
    setQuery("");
    setFilters({ type: "", colour: "", pattern: "", status: "", low: false });
    setResults([]);
    setHasSearched(false);
    setSelected(null);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const activeFilters = Boolean(
    filters.type || filters.colour || filters.pattern || filters.status || filters.low
  );

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-end justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/sales/new" className="btn-primary flex-1 text-center">
            Record Sale
          </Link>
          {canManageStock && (
            <Link to="/purchases" className="btn-secondary flex-1 text-center">
              Record Purchase
            </Link>
          )}
          {canManageStock && (
            <Link to="/stock-in/new" className="btn-secondary flex-1 text-center">
              Record GR
            </Link>
          )}
          {isSales && (
            <Link to="/po/new" className="btn-secondary flex-1 text-center">
              New PO
            </Link>
          )}
        </div>
      </div>

      {/* Centered Search Bar */}
      <div ref={wrapperRef} className="relative mx-auto max-w-3xl">
        <div className="group relative">
          <svg
            className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-brand-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setHighlightIndex(-1);
            }}
            onFocus={() => {
              if (query.trim() && suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search by SKU code, fabric name, colour, type..."
            className="w-full rounded-2xl border border-red-100 bg-white/90 py-4.5 pl-14 pr-32 text-base sm:text-lg shadow-xs backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:shadow-md focus:shadow-red-500/10 focus:outline-none focus:ring-4 focus:ring-red-100"
            autoComplete="off"
          />

          {/* Right side controls */}
          <div className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {searching && (
              <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}

            {query && (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg p-1 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className="h-5 w-px bg-slate-200" />

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                showFilters || activeFilters
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
              {activeFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-brand-600">
                  !
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-red-100 bg-white shadow-xl shadow-red-500/10">
            <ul>
              {suggestions.map((s, i) => {
                const sc = stockColor(Number(s.currentStock));
                return (
                  <li
                    key={s.id}
                    onMouseDown={() => handleSelect(s)}
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
          </div>
        )}

        {/* Filters drawer */}
        {showFilters && !showSuggestions && (
          <div className="mt-2 rounded-2xl border border-red-100 bg-white/95 p-5 shadow-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Fabric type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="input min-h-10 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {facets.types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Colour</label>
                <select
                  value={filters.colour}
                  onChange={(e) => setFilters({ ...filters, colour: e.target.value })}
                  className="input min-h-10 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {facets.colours.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Pattern</label>
                <select
                  value={filters.pattern}
                  onChange={(e) => setFilters({ ...filters, pattern: e.target.value })}
                  className="input min-h-10 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {facets.patterns.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              {canManageStock && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="input min-h-10 py-1.5 text-sm"
                  >
                    <option value="">All</option>
                    <option value="active">Active only</option>
                    <option value="inactive">Inactive only</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.low}
                  onChange={(e) => setFilters({ ...filters, low: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Low stock only
              </label>

              <div className="flex items-center gap-2">
                {activeFilters && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={applyFilters}
                  className="btn-primary rounded-xl px-5 text-sm cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected product detail panel */}
      {selected && (
        <div className="card mx-auto max-w-3xl border-red-200 bg-gradient-to-br from-red-50/70 to-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-xl font-bold text-red-700">{selected.code}</span>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">{selected.fabricName}</h2>
              <p className="text-sm text-slate-600">
                {selected.fabricType} · {selected.colour}
                {selected.pattern ? ` · ${selected.pattern}` : ""} · {selected.warehouse}
              </p>
              {selected.otherIdentifiers && (
                <p className="mt-1 font-mono text-xs text-slate-500">{selected.otherIdentifiers}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-white p-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">In Stock</p>
              <p className="text-base font-bold text-slate-900">{formatMetres(selected.currentStock)}</p>
            </div>
            {selected.sellingPricePerMetre !== undefined && (
              <div>
                <p className="text-xs text-slate-500">Price / Metre</p>
                <p className="text-base font-bold text-slate-900">{formatPrice(selected.sellingPricePerMetre)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-1">
                <ActiveBadge active={selected.active} />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Warehouse</p>
              <p className="text-sm font-semibold text-slate-700">{selected.warehouse}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/sales/new" className="btn-primary flex-1 text-center text-xs">
              Sell this SKU
            </Link>
            {canManageStock && (
              <Link to={`/stock-in/new?sku=${selected.id}`} className="btn-secondary flex-1 text-center text-xs">
                Stock in
              </Link>
            )}
            {canManageStock && (
              <Link to={`/skus/${selected.id}`} className="btn-secondary text-xs">
                Full details
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Search results: Only visible when suggestions dropdown is not active */}
      {!selected && !showSuggestions && hasSearched && results.length > 0 && (
        <div className="mx-auto max-w-3xl space-y-3">
          <p className="text-center text-sm text-slate-400">
            {results.length} result{results.length > 1 ? "s" : ""}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((s) => {
              const sc = stockColor(Number(s.currentStock));
              return (
                <div
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full rounded-2xl border p-4.5 ${sc.card} text-left transition-all duration-200 hover:brightness-95 hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-mono text-sm font-bold ${sc.code}`}>{s.code}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sc.badge}`}>
                      {formatMetres(s.currentStock)}
                    </span>
                  </div>

                  <h3 className="mt-1 font-bold text-slate-900 text-base">{s.fabricName}</h3>

                  <p className="mt-1 text-sm text-slate-600">
                    {s.fabricType} · {s.colour}
                    {s.pattern ? ` · ${s.pattern}` : ""} · {s.warehouse}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <ActiveBadge active={s.active} />
                      {isLowStock(s.currentStock, s.lowStockThreshold) && s.currentStock > 0 && (
                        <LowStockBadge />
                      )}
                      {Number(s.currentStock) <= 0 && <OutBadge />}
                    </div>
                    {s.sellingPricePerMetre !== undefined && (
                      <span className="font-semibold text-slate-800">
                        {formatPrice(s.sellingPricePerMetre)}/m
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No results message */}
      {!selected && !showSuggestions && hasSearched && results.length === 0 && !searching && (
        <div className="card mx-auto max-w-3xl text-center py-10">
          <p className="font-semibold text-slate-800">No products match your search</p>
          <p className="mt-1 text-sm text-slate-500">Try searching with a different term or clear filters.</p>
        </div>
      )}
    </div>
  );
}
