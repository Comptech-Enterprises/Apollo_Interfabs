"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or searchParams change, the new page has arrived!
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Listen for navigation clicks (links and GET filter forms)
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external, hash, or modifier clicks
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if clicking current URL with identical search params
      const currentUrl = window.location.pathname + window.location.search;
      const targetUrl = anchor.pathname + anchor.search;
      if (currentUrl === targetUrl) return;

      // Immediately acknowledge click
      setLoading(true);
      setProgress(25);
    };

    const handleFormSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form) return;
      const method = (form.getAttribute("method") || "get").toLowerCase();
      // Only GET forms trigger standard Next.js page search transitions
      if (method === "get") {
        setLoading(true);
        setProgress(30);
      }
    };

    document.addEventListener("click", handleLinkClick, { capture: true });
    document.addEventListener("submit", handleFormSubmit, { capture: true });
    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true });
      document.removeEventListener("submit", handleFormSubmit, { capture: true });
    };
  }, []);

  // Trickle progress while waiting for server response
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        const remaining = 88 - prev;
        return prev + Math.max(1, remaining * 0.15);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [loading]);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-1 pointer-events-none transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
      }}
    >
      <div className="h-full w-full bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-500 shadow-[0_0_12px_rgba(36,86,199,0.9)]" />
    </div>
  );
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressIndicator />
    </Suspense>
  );
}
