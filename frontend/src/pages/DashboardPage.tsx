import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiSkus } from "@/lib/api";
import { formatMetres, formatPrice, isLowStock, stockColor } from "@/lib/format";
import { ActiveBadge, LowStockBadge, OutBadge } from "@/components/bits";
import { TableSkeleton } from "@/components/TableSkeleton";

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
type SortKey = "code-asc" | "code-desc" | "stock-asc" | "stock-desc" | "name-asc" | "price-asc" | "price-desc";
type StockTab = "all" | "in" | "low" | "out";
type ViewMode = "table" | "grid";

export function DashboardPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const canManageStock = isOwner || user?.role === "MANAGER";
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

  // Listing display state
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortBy, setSortBy] = useState<SortKey>("code-asc");
  const [stockTab, setStockTab] = useState<StockTab>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    apiSkus.facets().then(setFacets).catch(console.error);
  }, []);

  const doSearch = useCallback(
    async (q: string, f: typeof filters, forceShow = false) => {
      setSearching(true);
      try {
        const data = await apiSkus.list(q.trim());
        const filtered = data.filter((s: Sku) => {
          if (isSales && (!s.sellingPricePerMetre || Number(s.sellingPricePerMetre) <= 0)) return false;
          if (f.type && s.fabricType !== f.type) return false;
          if (f.colour && s.colour !== f.colour) return false;
          if (f.pattern && s.pattern !== f.pattern) return false;
          if (f.status === "active" && !s.active) return false;
          if (f.status === "inactive" && s.active) return false;
          if (f.low && !isLowStock(s.currentStock, s.lowStockThreshold)) return false;
          return true;
        });

        setSuggestions(filtered);
        setPage(1);
        if (forceShow || q.trim().length > 0 || f.type || f.colour || f.pattern || f.status || f.low) {
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
    [isSales]
  );

  // Debounced search when query changes
  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        doSearch(query, filters);
        setShowSuggestions(true);
      } else if (filters.type || filters.colour || filters.pattern || filters.status || filters.low) {
        doSearch("", filters);
        setShowSuggestions(false);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
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
    skipNextSearchRef.current = true;
    setSelected(s);
    setShowSuggestions(false);
    setQuery(s.code);
  };

  const openSkuPreview = (s: Sku) => {
    setSelected(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && highlightIndex >= 0 && suggestions[highlightIndex]) {
        handleSelect(suggestions[highlightIndex]);
      } else {
        setShowSuggestions(false);
        setShowFilters(false);
        setSelected(null);
        doSearch(query, filters, true);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const applyFilters = () => {
    setShowSuggestions(false);
    setShowFilters(false);
    setSelected(null);
    setStockTab("all");
    doSearch(query, filters, true);
  };

  const browseAll = () => {
    setShowSuggestions(false);
    setShowFilters(false);
    setSelected(null);
    setStockTab("all");
    doSearch(query, filters, true);
  };

  const clearAll = () => {
    setQuery("");
    setFilters({ type: "", colour: "", pattern: "", status: "", low: false });
    setStockTab("all");
    setResults([]);
    setHasSearched(false);
    setSelected(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setPage(1);
    inputRef.current?.focus();
  };

  const activeFilters = Boolean(
    filters.type || filters.colour || filters.pattern || filters.status || filters.low
  );

  // Stock breakdown counts across current search results
  const stockCounts = useMemo(() => {
    let out = 0;
    let low = 0;
    let healthy = 0;
    for (const s of results) {
      const qty = Number(s.currentStock);
      if (qty <= 0) out++;
      else if (isLowStock(qty, s.lowStockThreshold)) low++;
      else healthy++;
    }
    return { all: results.length, in: healthy, low, out };
  }, [results]);

  // Filter by selected stock tab
  const filteredByStock = useMemo(() => {
    if (stockTab === "all") return results;
    return results.filter((s) => {
      const qty = Number(s.currentStock);
      if (stockTab === "out") return qty <= 0;
      if (stockTab === "low") return qty > 0 && isLowStock(qty, s.lowStockThreshold);
      return qty > 0 && !isLowStock(qty, s.lowStockThreshold);
    });
  }, [results, stockTab]);

  // Sort results
  const sortedResults = useMemo(() => {
    const copy = [...filteredByStock];
    copy.sort((a, b) => {
      switch (sortBy) {
        case "code-desc":
          return b.code.localeCompare(a.code);
        case "stock-asc":
          return Number(a.currentStock) - Number(b.currentStock);
        case "stock-desc":
          return Number(b.currentStock) - Number(a.currentStock);
        case "name-asc":
          return a.fabricName.localeCompare(b.fabricName);
        case "price-asc":
          return Number(a.sellingPricePerMetre ?? 0) - Number(b.sellingPricePerMetre ?? 0);
        case "price-desc":
          return Number(b.sellingPricePerMetre ?? 0) - Number(a.sellingPricePerMetre ?? 0);
        case "code-asc":
        default:
          return a.code.localeCompare(b.code);
      }
    });
    return copy;
  }, [filteredByStock, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pagedResults = sortedResults.slice(startIdx, startIdx + pageSize);

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-end justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        </div>
        {(isSales || canManageStock) && !isOwner && (
          <div className="flex flex-wrap gap-2">
            {isSales && (
              <Link to="/sales/new" className="btn-primary flex-1 text-center">
                Record Sale
              </Link>
            )}
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
        )}
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
              const val = e.target.value;
              setQuery(val);
              setSelected(null);
              setHighlightIndex(-1);
              if (!val.trim() && !activeFilters) {
                setHasSearched(false);
                setResults([]);
              }
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

            {(query || hasSearched) && (
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
              onClick={() => {
                setShowSuggestions(false);
                setShowFilters((v) => !v);
              }}
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

        {/* Browse all shortcut when idle */}
        {!hasSearched && !selected && !showFilters && (
          <div className="mt-2.5 flex justify-end px-2 text-xs">
            <button
              type="button"
              onClick={browseAll}
              className="font-semibold text-brand-700 hover:text-brand-800 hover:underline cursor-pointer"
            >
              Browse all stock →
            </button>
          </div>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && query.trim().length > 0 && (suggestions.length > 0 || !searching) && (
          <div className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-red-100 bg-white shadow-xl shadow-red-500/10">
            {suggestions.length > 0 ? (
              <ul>
                {suggestions.map((s, i) => {
                  const sc = stockColor(Number(s.currentStock));
                  const hasPrice = s.sellingPricePerMetre !== undefined && Number(s.sellingPricePerMetre) > 0;
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
                              hasPrice ? (
                                <span className="font-semibold text-slate-700">
                                  {formatPrice(s.sellingPricePerMetre)}/m
                                </span>
                              ) : (
                                <span className="font-semibold text-red-600">No price</span>
                              )
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
                No matching SKUs found.
              </div>
            )}
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
                  className="input h-10 min-h-10 py-1.5 text-sm"
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
                  className="input h-10 min-h-10 py-1.5 text-sm"
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
                  className="input h-10 min-h-10 py-1.5 text-sm"
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
                    className="input h-10 min-h-10 py-1.5 text-sm"
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
              {hasSearched && results.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline cursor-pointer"
                >
                  ← Back to list ({results.length})
                </button>
              )}
              <div>
                <span className="font-mono text-xl font-bold text-red-700">{selected.code}</span>
              </div>
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
              aria-label="Close details"
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
                <p className="text-base font-bold text-slate-900">
                  {Number(selected.sellingPricePerMetre) > 0 ? (
                    formatPrice(selected.sellingPricePerMetre)
                  ) : (
                    <span className="text-slate-400 italic text-sm font-medium">Not set</span>
                  )}
                </p>
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
            {isSales && (
              <Link to={`/sales/new?sku=${selected.id}`} className="btn-primary flex-1 text-center text-xs">
                Sell this SKU
              </Link>
            )}
            {canManageStock && !isOwner && (
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

      {/* Loading skeleton when fetching list without prior results */}
      {!selected && !showSuggestions && searching && results.length === 0 && (
        <div className="space-y-3">
          <TableSkeleton cols={7} rows={6} />
        </div>
      )}

      {/* Full Inventory Listing UI */}
      {!selected && !showSuggestions && hasSearched && results.length > 0 && (
        <div ref={listTopRef} className="animate-page-enter space-y-3">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-red-100/90 bg-white/95 px-4 py-3 shadow-xs shadow-red-500/5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-baseline gap-2 pr-2">
                <span className="text-sm font-bold text-slate-900">
                  {sortedResults.length} SKU{sortedResults.length === 1 ? "" : "s"}
                </span>
                {sortedResults.length > 0 && (
                  <span className="text-xs text-slate-500">
                    Showing {startIdx + 1}–{Math.min(startIdx + pageSize, sortedResults.length)}
                  </span>
                )}
              </div>

              {/* Quick stock tier tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setStockTab("all");
                    setPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    stockTab === "all"
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({stockCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStockTab("in");
                    setPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    stockTab === "in"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  In Stock ({stockCounts.in})
                </button>
                {stockCounts.low > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStockTab("low");
                      setPage(1);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      stockTab === "low"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    Low ({stockCounts.low})
                  </button>
                )}
                {stockCounts.out > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStockTab("out");
                      setPage(1);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      stockTab === "out"
                        ? "bg-red-700 text-white shadow-xs"
                        : "bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    Out ({stockCounts.out})
                  </button>
                )}
              </div>
            </div>

            {/* Right controls: Sort, Page size, View toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="sortBy" className="sr-only">
                Sort inventory
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortKey);
                  setPage(1);
                }}
                className="select-badge h-9 rounded-lg border border-slate-200 bg-white pl-3 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:border-red-500 focus:outline-none cursor-pointer"
              >
                <option value="code-asc">Code: A → Z</option>
                <option value="code-desc">Code: Z → A</option>
                <option value="name-asc">Fabric: A → Z</option>
                <option value="stock-asc">Stock: Low → High</option>
                <option value="stock-desc">Stock: High → Low</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
              </select>

              <label htmlFor="pageSize" className="sr-only">
                Items per page
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="select-badge h-9 rounded-lg border border-slate-200 bg-white pl-3 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:border-red-500 focus:outline-none cursor-pointer"
              >
                <option value={24}>24 / page</option>
                <option value={48}>48 / page</option>
                <option value={100}>100 / page</option>
              </select>

              {/* View toggle (desktop md+) */}
              <div
                className="hidden md:inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
                role="group"
                aria-label="View layout"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-red-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                  </svg>
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-red-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                  Cards
                </button>
              </div>
            </div>
          </div>

          {pagedResults.length === 0 ? (
            <div className="card text-center py-8">
              <p className="font-semibold text-slate-800">No SKUs in this stock filter</p>
              <button
                type="button"
                onClick={() => {
                  setStockTab("all");
                  setPage(1);
                }}
                className="btn-secondary mt-3 text-xs"
              >
                Show all {results.length} SKUs
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Data Table (default when viewMode === "table") */}
              {viewMode === "table" && (
                <div className="hidden overflow-x-auto rounded-xl border border-red-100/90 bg-white/95 shadow-xs shadow-red-500/5 md:block">
                  <table className="w-full min-w-[820px]">
                    <thead className="border-b border-red-100 bg-red-50/50">
                      <tr>
                        <th className="th">SKU Code</th>
                        <th className="th">Fabric</th>
                        <th className="th">Specs</th>
                        <th className="th">Warehouse</th>
                        <th className="th text-right">In Stock</th>
                        <th className="th text-right">Price / m</th>
                        <th className="th">Status</th>
                        <th className="th text-right">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedResults.map((s) => {
                        const qty = Number(s.currentStock);
                        const sc = stockColor(qty);
                        const hasPrice = s.sellingPricePerMetre !== undefined && Number(s.sellingPricePerMetre) > 0;
                        const low = qty > 0 && isLowStock(qty, s.lowStockThreshold);
                        return (
                          <tr
                            key={s.id}
                            onClick={() => openSkuPreview(s)}
                            className="cursor-pointer transition-colors hover:bg-red-50/40"
                          >
                            <td className="td">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${sc.dot}`} aria-hidden="true" />
                                <span className="font-mono font-semibold text-red-700 whitespace-nowrap">
                                  {s.code}
                                </span>
                              </div>
                              {s.otherIdentifiers && (
                                <p className="mt-0.5 max-w-[210px] truncate pl-4 font-mono text-[11px] text-slate-400">
                                  {s.otherIdentifiers}
                                </p>
                              )}
                            </td>
                            <td className="td font-semibold text-slate-900">{s.fabricName}</td>
                            <td className="td text-slate-600">
                              <span>{s.fabricType}</span>
                              <span className="text-slate-300"> · </span>
                              <span>{s.colour}</span>
                              {s.pattern && (
                                <>
                                  <span className="text-slate-300"> · </span>
                                  <span className="text-slate-500">{s.pattern}</span>
                                </>
                              )}
                            </td>
                            <td className="td whitespace-nowrap">
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {s.warehouse}
                              </span>
                            </td>
                            <td className="td text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {qty <= 0 && <OutBadge />}
                                {low && <LowStockBadge />}
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums ${sc.badge}`}>
                                  {formatMetres(qty)}
                                </span>
                              </div>
                            </td>
                            <td className="td text-right whitespace-nowrap">
                              {hasPrice ? (
                                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                  {formatPrice(s.sellingPricePerMetre)}
                                </span>
                              ) : (
                                <span className="text-xs italic text-slate-400">Not set</span>
                              )}
                            </td>
                            <td className="td whitespace-nowrap">
                              <ActiveBadge active={s.active} />
                            </td>
                            <td className="td text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {canManageStock ? (
                                <Link
                                  to={`/skus/${s.id}`}
                                  className="inline-flex items-center rounded-lg border border-red-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50/70 hover:text-red-800"
                                >
                                  Details
                                </Link>
                              ) : isSales ? (
                                Number(s.currentStock) <= 0 ? (
                                  <Link
                                    to={`/po/new?item=${encodeURIComponent(s.fabricName)}`}
                                    className="inline-flex items-center rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                                  >
                                    PO
                                  </Link>
                                ) : (
                                  <Link
                                    to={`/sales/new?sku=${s.id}`}
                                    className="inline-flex items-center rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                                  >
                                    Sell
                                  </Link>
                                )
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Refined Card Grid (always on mobile < md, and on desktop when Cards view is active) */}
              <div
                className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${
                  viewMode === "table" ? "md:hidden" : ""
                }`}
              >
                {pagedResults.map((s) => {
                  const qty = Number(s.currentStock);
                  const sc = stockColor(qty);
                  const hasPrice = s.sellingPricePerMetre !== undefined && Number(s.sellingPricePerMetre) > 0;
                  const low = qty > 0 && isLowStock(qty, s.lowStockThreshold);
                  return (
                    <div
                      key={s.id}
                      onClick={() => openSkuPreview(s)}
                      className={`group flex flex-col justify-between rounded-xl border border-red-100/90 border-l-4 ${sc.accent} bg-white/95 p-4 text-left shadow-xs transition-all duration-200 hover:border-red-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900 group-hover:text-red-700 break-all">
                            {s.code}
                          </span>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums ${sc.badge}`}>
                            {formatMetres(qty)}
                          </span>
                        </div>

                        <h3 className="mt-1.5 font-semibold text-slate-900 text-sm line-clamp-1">{s.fabricName}</h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {s.fabricType} · {s.colour}
                          {s.pattern ? ` · ${s.pattern}` : ""}
                        </p>

                        <span className="mt-2 inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {s.warehouse}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ActiveBadge active={s.active} />
                          {low && <LowStockBadge />}
                          {qty <= 0 && <OutBadge />}
                        </div>
                        {s.sellingPricePerMetre !== undefined && (
                          hasPrice ? (
                            <span className="font-mono font-semibold text-slate-900 tabular-nums">
                              {formatPrice(s.sellingPricePerMetre)}/m
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Not set</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <nav
                  aria-label="Inventory pagination"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100/90 bg-white/95 px-4 py-3 text-sm shadow-xs"
                >
                  <p className="text-xs text-slate-600">
                    Page <span className="font-semibold text-slate-900">{safePage}</span> of{" "}
                    <span className="font-semibold text-slate-900">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => changePage(safePage - 1)}
                      className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => changePage(safePage + 1)}
                      className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      )}

      {/* No results message */}
      {!selected && !showSuggestions && hasSearched && results.length === 0 && !searching && (
        <div className="card mx-auto max-w-3xl text-center py-10">
          <p className="font-semibold text-slate-800">No products match your search</p>
          <p className="mt-1 text-sm text-slate-500">Try searching with a different term or clear filters.</p>
          <button type="button" onClick={clearAll} className="btn-secondary mt-4 text-xs">
            Reset search
          </button>
        </div>
      )}
    </div>
  );
}
