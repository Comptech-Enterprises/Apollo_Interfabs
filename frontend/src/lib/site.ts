import type { PermissionKey } from "./permissions";

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

export type NavItem = { href: string; label: string; roles?: string[]; permission?: PermissionKey };

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Inventory", permission: "modules.inventory" },
  { href: "/skus", label: "SKUs", permission: "modules.skus" },
  { href: "/po", label: "PO", permission: "modules.po" },
  { href: "/purchases", label: "Purchases", permission: "modules.purchases" },
  { href: "/sales", label: "Sales Log", permission: "modules.sales" },
  { href: "/fabric-types", label: "Fabric Types", permission: "modules.fabricTypes" },
  { href: "/users", label: "Users", permission: "modules.users" },
  { href: "/access-management", label: "Access Management", roles: ["SUPER_ADMIN"] },
];
