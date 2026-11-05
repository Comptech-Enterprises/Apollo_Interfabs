import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo, ContactLinks } from "./Brand";
import { NotificationBell } from "./NotificationBell";

type Item = { href: string; label: string };

export function Header({ items, userName, role }: { items: Item[]; userName: string; role: string }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [location.pathname]);

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

  const active = (href: string) =>
    location.pathname === href || (href !== "/dashboard" && location.pathname.startsWith(href + "/"));
  const roleLabel = role === "OWNER" ? "Owner" : role === "MANAGER" ? "Manager" : "Sales";

  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-red-100 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            {role === "OWNER" && <NotificationBell />}
            <button
              ref={btnRef}
              type="button"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 active:scale-95 transition-all duration-150 cursor-pointer"
              aria-expanded={open}
              aria-controls="slide-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </header>
      <div
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-xs transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        id="slide-menu"
        className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-red-100 bg-gradient-to-r from-red-50/60 to-white px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white font-bold text-sm shadow-xs shadow-red-500/20">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{userName}</p>
                <p className="text-xs text-red-600 font-medium">{roleLabel}</p>
              </div>
            </div>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-1">
              {items.map((i) => (
                <Link
                  key={i.href}
                  to={i.href}
                  aria-current={active(i.href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
                    active(i.href)
                      ? "bg-red-50 text-red-700 font-semibold shadow-xs"
                      : "text-slate-700 hover:bg-red-50/50 hover:text-red-700"
                  }`}
                >
                  {i.label}
                </Link>
              ))}
            </div>
          </nav>
          <div className="border-t border-red-100 px-3 py-3 space-y-1">
            <Link
              to="/account"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 active:scale-[0.98] transition-all duration-150"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
              Account
            </Link>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 active:scale-[0.98] transition-all duration-150 cursor-pointer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
            <ContactLinks className="mt-3 px-3 text-xs text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
