import React from "react";
import { Link, useLocation } from "react-router-dom";

export function MobileBottomNav({ role }: { role: string }) {
  const location = useLocation();

  const stockLink = {
    href: "/dashboard",
    label: "Stock",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  };

  const accountLink = {
    href: "/account",
    label: "Account",
    icon: (
      <svg
        width="22"
        height="22"
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
    ),
  };

  const links =
    role === "OWNER"
      ? [
          stockLink,
          {
            href: "/po",
            label: "PO",
            icon: (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            ),
          },
          {
            href: "/purchases",
            label: "Purchases",
            icon: (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            ),
          },
          accountLink,
        ]
      : role === "MANAGER"
      ? [
          stockLink,
          {
            href: "/sales/new",
            label: "Sale",
            icon: (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            ),
          },
          {
            href: "/stock-in/new",
            label: "Stock In",
            icon: (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="m8 11 4 4 4-4" />
                <path d="M8 21h8" />
              </svg>
            ),
          },
          accountLink,
        ]
      : [
          stockLink,
          {
            href: "/sales/new",
            label: "Record Sale",
            icon: (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            ),
          },
          accountLink,
        ];

  const isActive = (href: string) =>
    location.pathname === href || (href !== "/dashboard" && location.pathname.startsWith(href + "/"));

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 inset-x-0 z-30 border-t border-red-100 bg-white/95 backdrop-blur-md lg:hidden pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(220,38,38,0.06)]"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              to={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center py-1 text-xs font-medium transition-all active:scale-95 ${
                active ? "text-red-600 font-bold" : "text-slate-600 hover:text-red-700"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 ${
                  active ? "bg-red-50 text-red-600 scale-110 shadow-xs" : ""
                }`}
              >
                {link.icon}
              </span>
              <span className="mt-0.5 truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
