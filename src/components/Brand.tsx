import Link from "next/link";
import { site } from "@/lib/site";

export function Logo({ href = "/dashboard", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" aria-label={`${site.name} - home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9" />
      <span className="flex flex-col leading-tight">
        <span className={`text-base font-bold ${light ? "text-white" : "text-slate-900"}`}>{site.name}</span>
        <span className={`text-xs ${light ? "text-brand-100" : "text-slate-500"}`}>{site.product}</span>
      </span>
    </Link>
  );
}

export function ContactLinks({ className = "" }: { className?: string }) {
  if (!site.phone && !site.email) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      {site.phone && (
        <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`} className="underline-offset-2 hover:underline">
          {site.phone}
        </a>
      )}
      {site.email && (
        <a href={`mailto:${site.email}`} className="break-all underline-offset-2 hover:underline">
          {site.email}
        </a>
      )}
    </div>
  );
}
