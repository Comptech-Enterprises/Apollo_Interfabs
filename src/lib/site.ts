const phone = (process.env.NEXT_PUBLIC_COMPANY_PHONE ?? "").trim();
const email = (process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? "").trim();

export const site = {
  name: "Inventory Portal",
  product: "",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // Contact details come from env vars so no fake numbers are ever shown.
  phone: phone || null,
  email: email || null,
  description:
    "Inventory portal: track fabric stock, purchases and sales in real time.",
};

export type NavItem = { href: string; label: string; roles?: string[] };

/** Single source of truth for navigation, so there are no dead links. */
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Inventory" },
  { href: "/po", label: "PO", roles: ["OWNER", "SALES"] },
  { href: "/purchases", label: "Purchases", roles: ["OWNER", "MANAGER"] },
  { href: "/sales", label: "Sales Log", roles: ["OWNER"] },
  { href: "/users", label: "Users", roles: ["OWNER"] },
];
