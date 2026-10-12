import Link from "next/link";
import { ContactLinks } from "./Brand";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        <ContactLinks />
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/dashboard" className="hover:underline">Inventory</Link>
          <Link href="/sales/new" className="hover:underline">Record Sale</Link>
          <Link href="/account" className="hover:underline">Account</Link>
        </nav>
      </div>
    </footer>
  );
}
