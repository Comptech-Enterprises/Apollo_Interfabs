"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { searchSkus, type SearchResult } from "@/actions/search";
import { formatMetres, formatPrice, isLowStock } from "@/lib/format";
import { ActiveBadge, LowStockBadge, OutBadge } from "@/components/bits";

type Facets = { types: string[]; colours: string[]; patterns: string[] };

function AnimateIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
        transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {children}
    </div>
  );
}

function SlideDown({ show, children, className = "" }: { show: boolean; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (show) setMounted(true);
  }, [show]);

  useEffect(() => {
    if (mounted && ref.current) {
      setHeight(ref.current.scrollHeight);
    }
    if (!show) {
      const t = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(t);
    }
  }, [show, mounted]);

  if (!mounted) return null;
  return (
    <div
      style={{
        maxHeight: show ? height + 32 : 0,
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(-4px)",
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={className}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}

export function InventorySearch({ isManager, facets }: { isManager: boolean; facets: Facets }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{ type: string; colour: string; pattern: string; status: string; low: boolean }>({
    type: "", colour: "", pattern: "", status: "", low: false,
  });
  const [searching, startSearch] = useTransition();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const doSearch = useCallback((q: string, f: typeof filters) => {
    startSearch(async () => {
      const res = await searchSkus(q, {
        type: f.type || undefined,
        colour: f.colour || undefined,
        pattern: f.pattern || undefined,
        status: f.status || undefined,
        low: f.low || undefined,
      });
      setSuggestions(res);
      if (q.trim().length > 0 || f.type || f.colour || f.pattern || f.status || f.low) {
        setResults(res);
        setHasSearched(true);
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        doSearch(query, filters);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, doSearch, filters]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(sku: SearchResult) {
    setSelected(sku);
    setShowSuggestions(false);
    setQuery(sku.code);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function applyFilters() {
    doSearch(query, filters);
    setHasSearched(true);
    setShowSuggestions(false);
    setSelected(null);
  }

  function clearAll() {
    setQuery("");
    setFilters({ type: "", colour: "", pattern: "", status: "", low: false });
    setResults([]);
    setHasSearched(false);
    setSelected(null);
    setSuggestions([]);
    inputRef.current?.focus();
  }

  const activeFilters = !!(filters.type || filters.colour || filters.pattern || filters.status || filters.low);

  return (
    <div className="mt-8 space-y-5">
      {/* Search bar with entrance animation */}
      <AnimateIn delay={100}>
        <div ref={wrapperRef} className="relative mx-auto max-w-3xl">
          <div className="group relative">
            <svg className="pointer-events-none absolute left-5 top-1/2 h-5.5 w-5.5 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); setHighlightIndex(-1); }}
              onFocus={() => { if (query.trim() && suggestions.length > 0) setShowSuggestions(true); }}
              onKeyDown={handleKeyDown}
              placeholder="Search by SKU code, fabric name, colour, type..."
              className="w-full rounded-2xl border border-slate-200 bg-white/80 py-5 pl-14 pr-32 text-lg shadow-sm backdrop-blur-sm transition-all duration-300 placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:shadow-lg focus:shadow-brand-100/50 focus:outline-none focus:ring-4 focus:ring-brand-100"
              autoComplete="off"
            />
            {/* Right side controls */}
            <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {/* Searching spinner */}
              {searching && (
                <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {/* Clear button */}
              <button
                onClick={() => { setQuery(""); setSelected(null); setSuggestions([]); setShowSuggestions(false); setResults([]); setHasSearched(false); inputRef.current?.focus(); }}
                className="rounded-lg p-1 text-slate-300 transition-all duration-200 hover:bg-slate-100 hover:text-slate-500"
                aria-label="Clear search"
                style={{
                  opacity: query ? 1 : 0,
                  transform: query ? "scale(1)" : "scale(0.5)",
                  pointerEvents: query ? "auto" : "none",
                  transition: "opacity 0.2s, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Divider */}
              <div className="h-5 w-px bg-slate-200" />
              {/* Filter pill button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${showFilters ? "bg-brand-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {activeFilters && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-brand-600">!</span>
                )}
              </button>
            </div>
          </div>

          {/* Suggestions dropdown with spring animation */}
          <div
            style={{
              opacity: showSuggestions && suggestions.length > 0 ? 1 : 0,
              transform: showSuggestions && suggestions.length > 0 ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
              pointerEvents: showSuggestions && suggestions.length > 0 ? "auto" : "none",
              transition: "opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50"
          >
            <ul>
              {suggestions.map((s, i) => (
                <li
                  key={s.id}
                  onMouseDown={() => handleSelect(s)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className="cursor-pointer transition-colors duration-150"
                  style={{
                    backgroundColor: i === highlightIndex ? "rgb(239 246 255)" : "transparent",
                  }}
                >
                  <div className={`px-4 py-3 ${i > 0 ? "border-t border-slate-100/60" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-brand-700">{s.code}</span>
                        <span className="ml-2 text-sm text-slate-600">{s.fabricName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{formatMetres(s.currentStock)}</span>
                        <span className="font-medium text-slate-600">{formatPrice(s.sellingPricePerMetre)}</span>
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {s.fabricType} · {s.colour}{s.pattern ? ` · ${s.pattern}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* No results dropdown */}
          <div
            style={{
              opacity: showSuggestions && query.trim().length > 0 && suggestions.length === 0 && !searching ? 1 : 0,
              transform: showSuggestions && query.trim().length > 0 && suggestions.length === 0 && !searching ? "translateY(0)" : "translateY(-8px)",
              pointerEvents: showSuggestions && query.trim().length > 0 && suggestions.length === 0 && !searching ? "auto" : "none",
              transition: "opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200/80 bg-white p-5 text-center text-sm text-slate-400 shadow-xl"
          >
            No products found
          </div>

          {/* Filters panel -- attached directly under search bar */}
          <SlideDown show={showFilters && !showSuggestions}>
            <div className="mt-1 rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FilterSelect label="Fabric type" value={filters.type} options={facets.types} onChange={(v) => setFilters({ ...filters, type: v })} />
                <FilterSelect label="Colour" value={filters.colour} options={facets.colours} onChange={(v) => setFilters({ ...filters, colour: v })} />
                <FilterSelect label="Pattern" value={filters.pattern} options={facets.patterns} onChange={(v) => setFilters({ ...filters, pattern: v })} />
                {isManager && (
                  <FilterSelect label="Status" value={filters.status} options={["active", "inactive"]} onChange={(v) => setFilters({ ...filters, status: v })} />
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <input type="checkbox" checked={filters.low} onChange={(e) => setFilters({ ...filters, low: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600 transition-shadow focus:ring-brand-200" />
                  Low stock only
                </label>
                <div className="flex items-center gap-2">
                  {activeFilters && (
                    <button onClick={clearAll} className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600">
                      Clear all
                    </button>
                  )}
                  <button onClick={applyFilters} className="btn-primary rounded-xl px-6 transition-transform duration-150 active:scale-[0.97]">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </SlideDown>
        </div>
      </AnimateIn>

      {/* Selected product detail with spring entrance */}
      {selected && (
        <AnimateIn key={selected.id} className="mx-auto max-w-3xl">
          <ProductDetail sku={selected} isManager={isManager} />
        </AnimateIn>
      )}

      {/* Filtered results -- hidden when suggestions open */}
      {!selected && !showSuggestions && hasSearched && results.length > 0 && (
        <AnimateIn>
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-400">{results.length} result{results.length > 1 ? "s" : ""}</p>
            <ul className="space-y-2">
              {results.map((s, i) => (
                <AnimateIn key={s.id} delay={i * 50}>
                  <button
                    onClick={() => handleSelect(s)}
                    className="card w-full text-left transition-all duration-200 hover:shadow-md hover:shadow-brand-100/40 hover:-translate-y-0.5 active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-brand-700">{s.code}</span>
                        <span className="ml-2 text-slate-700">{s.fabricName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {isLowStock(s.currentStock, s.lowStockThreshold) && <LowStockBadge />}
                        {Number(s.currentStock) <= 0 && <OutBadge />}
                        {!s.active && <ActiveBadge active={false} />}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {s.fabricType} · {s.colour}{s.pattern ? ` · ${s.pattern}` : ""} · {formatMetres(s.currentStock)} · {formatPrice(s.sellingPricePerMetre)}/m
                    </p>
                  </button>
                </AnimateIn>
              ))}
            </ul>
          </div>
        </AnimateIn>
      )}
      {!selected && !showSuggestions && hasSearched && results.length === 0 && (
        <AnimateIn>
          <p className="text-center text-sm text-slate-400">No products match your search</p>
        </AnimateIn>
      )}
    </div>
  );
}

function ProductDetail({ sku: s, isManager }: { sku: SearchResult; isManager: boolean }) {
  const low = isLowStock(s.currentStock, s.lowStockThreshold);
  const out = Number(s.currentStock) <= 0;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-xl font-bold text-brand-700">{s.code}</h2>
          <p className="mt-1 text-lg text-slate-700">{s.fabricName}</p>
          {s.otherIdentifiers && <p className="mt-0.5 font-mono text-sm text-slate-400">{s.otherIdentifiers}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {!s.active && <ActiveBadge active={false} />}
          {out ? <OutBadge /> : low ? <LowStockBadge /> : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <DetailCard label="Fabric type" value={s.fabricType} />
        <DetailCard label="Colour" value={s.colour} />
        <DetailCard label="Pattern" value={s.pattern ?? "-"} />
        <DetailCard label="Price per metre" value={formatPrice(s.sellingPricePerMetre)} highlight />
        <DetailCard label="Current stock" value={formatMetres(s.currentStock)} highlight />
        {s.lowStockThreshold > 0 && (
          <DetailCard label="Low stock alert" value={formatMetres(s.lowStockThreshold)} />
        )}
      </div>

      {isManager && (
        <div className="mt-5 flex gap-2">
          <Link href={`/skus/${s.id}`} className="btn-secondary rounded-xl transition-transform duration-150 active:scale-[0.97]">View details</Link>
          <Link href={`/skus/${s.id}/edit`} className="btn-secondary rounded-xl transition-transform duration-150 active:scale-[0.97]">Edit SKU</Link>
        </div>
      )}
    </div>
  );
}

function DetailCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50/80 p-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`mt-1 ${highlight ? "text-lg font-bold text-slate-900" : "font-medium text-slate-700"}`}>{value}</dd>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all duration-200 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
      >
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
