"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/actions/auth";
import { Logo, ContactLinks } from "./Brand";

type Item = { href: string; label: string };

export function Header({ items, userName, role }: { items: Item[]; userName: string; role: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur transition-shadow duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active(i.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium active:scale-95 active:bg-slate-200/70 transition-all duration-150 cursor-pointer ${
                active(i.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/account" className="text-right text-sm leading-tight hover:underline">
            <span className="block font-medium">{userName}</span>
            <span className="block text-xs text-slate-500">{role === "MANAGER" ? "Manager" : "Sales"}</span>
          </Link>
          <form action={logoutAction}>
            <button className="btn-secondary min-h-0 py-1.5 px-3 text-xs">Sign out</button>
          </form>
        </div>
        <button
          ref={btnRef}
          type="button"
          className="btn-secondary lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          <span className="sr-only sm:not-sr-only">Menu</span>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-[61px] bottom-0 z-50 overflow-y-auto bg-white lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1 p-4 pb-24">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active(i.href) ? "page" : undefined}
                className={`rounded-lg px-4 py-3 text-base font-medium active:scale-[0.98] transition-all duration-150 ${
                  active(i.href) ? "bg-brand-50 text-brand-700" : "text-slate-800 active:bg-slate-100"
                }`}
              >
                {i.label}
              </Link>
            ))}
            <Link
              href="/account"
              className="rounded-lg px-4 py-3 text-base font-medium text-slate-800 active:scale-[0.98] active:bg-slate-100 transition-all duration-150"
            >
              Account ({userName})
            </Link>
            <form action={logoutAction} className="mt-2">
              <button className="btn-secondary w-full">Sign out</button>
            </form>
            <ContactLinks className="mt-6 px-4 text-sm text-slate-600" />
          </nav>
        </div>
      )}
    </header>
  );
}
