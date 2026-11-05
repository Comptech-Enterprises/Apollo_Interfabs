import React from "react";
import { Link } from "react-router-dom";
import { site } from "@/lib/site";

export function Logo({ href = "/dashboard", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link
      to={href}
      className="flex min-h-11 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      aria-label={`${site.name} - home`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-700 text-white font-black text-sm shadow-xs shadow-red-500/30">
        A
      </div>
      <span className={`text-base font-bold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
        {site.name}
      </span>
    </Link>
  );
}

export function ContactLinks({ className = "" }: { className?: string }) {
  if (!site.phone && !site.email) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      {site.phone && (
        <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`} className="underline-offset-2 hover:underline hover:text-red-600 transition-colors">
          {site.phone}
        </a>
      )}
      {site.email && (
        <a href={`mailto:${site.email}`} className="break-all underline-offset-2 hover:underline hover:text-red-600 transition-colors">
          {site.email}
        </a>
      )}
    </div>
  );
}
