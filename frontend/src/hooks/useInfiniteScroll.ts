import { useEffect, useRef, useState, useCallback } from "react";

export interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void | Promise<void>;
  rootMargin?: string;
  threshold?: number;
  throttleMs?: number;
  disabled?: boolean;
}

/**
 * High-performance, throttled intersection observer hook for infinite scrolling.
 * Automatically guards against duplicate triggers, multiple rapid events, and
 * exposes window scroll position for floating back-to-top buttons.
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  rootMargin = "350px",
  threshold = 0.05,
  throttleMs = 200,
  disabled = false,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const [showScrollTop, setShowScrollTop] = useState(false);

  // Throttled scroll listener to show/hide "Back to Top"
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowScrollTop(window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || isLoading || disabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          const now = Date.now();
          if (now - lastTriggerRef.current < throttleMs) return;
          lastTriggerRef.current = now;
          onLoadMoreRef.current();
        }
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, disabled, rootMargin, threshold, throttleMs]);

  return { sentinelRef, showScrollTop, scrollToTop };
}
