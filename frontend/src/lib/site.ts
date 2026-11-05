const phone = (import.meta.env.VITE_COMPANY_PHONE ?? "").trim();
const email = (import.meta.env.VITE_COMPANY_EMAIL ?? "").trim();

export const site = {
  name: "Inventory Portal",
  product: "",
  url: import.meta.env.VITE_SITE_URL ?? "http://localhost:3000",
  phone: phone || null,
  email: email || null,
  description: "Inventory portal: track fabric stock, purchases and sales in real time.",
};

export type NavItem = { href: string; label: string; roles?: string[] };

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Inventory" },
  { href: "/po", label: "PO", roles: ["OWNER", "SALES"] },
  { href: "/purchases", label: "Purchases", roles: ["OWNER", "MANAGER"] },
  { href: "/sales", label: "Sales Log", roles: ["OWNER"] },
  { href: "/users", label: "Users", roles: ["OWNER"] },
];
