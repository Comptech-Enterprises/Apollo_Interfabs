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

export type NavItem = { href: string; label: string; manager?: boolean };

/** Single source of truth for navigation, so there are no dead links. */
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Inventory" },
  { href: "/skus", label: "SKUs", manager: true },
  { href: "/purchases", label: "Purchases", manager: true },
  { href: "/sales", label: "Sales Log", manager: true },
  { href: "/users", label: "Users", manager: true },
];
