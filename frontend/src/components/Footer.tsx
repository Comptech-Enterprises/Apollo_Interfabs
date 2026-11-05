import React from "react";
import { site } from "@/lib/site";
import { ContactLinks } from "./Brand";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-red-100 bg-white/80 backdrop-blur-xs pb-20 lg:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        <ContactLinks />
      </div>
    </footer>
  );
}
