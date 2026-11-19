import React from "react";

export function InfiniteScrollSentinel({
  innerRef,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return <div ref={innerRef} className="h-6 w-full shrink-0" aria-hidden="true" />;
}

export function InfiniteScrollSpinner({
  label = "Loading more...",
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-slate-500 animate-pulse">
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export function InfiniteScrollEnd({
  count,
  label = "items",
  onScrollTop,
}: {
  count?: number;
  label?: string;
  onScrollTop?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-6 text-xs text-slate-400">
      <span>
        {count !== undefined ? `Showing all ${count} ${label}` : `All ${label} loaded`}
      </span>
      {onScrollTop && (
        <>
          <span>·</span>
          <button
            type="button"
            onClick={onScrollTop}
            className="font-semibold text-red-700 hover:text-red-800 hover:underline cursor-pointer"
          >
            Back to top ↑
          </button>
        </>
      )}
    </div>
  );
}

export function BackToTopButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 lg:bottom-8 right-5 z-40 flex items-center gap-1.5 rounded-full border border-red-200 bg-white/95 px-3 py-2 text-xs font-bold text-red-700 shadow-lg shadow-red-900/10 backdrop-blur-sm transition-all hover:bg-red-50 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer active:scale-95"
      aria-label="Scroll back to top"
    >
      <span className="text-sm leading-none">↑</span>
      <span>Top</span>
    </button>
  );
}
