import type { Request, Response, NextFunction } from "express";
import { AccessControl, type Role } from "./models/index.js";
import type { AuthenticatedRequest } from "./middleware/auth.js";

export type PermissionKey =
  // Modules
  | "modules.inventory"
  | "modules.skus"
  | "modules.sales"
  | "modules.purchases"
  | "modules.po"
  | "modules.fabricTypes"
  | "modules.users"
  // Inventory & SKUs
  | "inventory.view"
  | "inventory.viewPrices"
  | "inventory.viewPriceHistory"
  | "inventory.viewDetails"
  | "inventory.viewInactive"
  | "inventory.viewUnpriced"
  | "inventory.createSku"
  | "inventory.editSku"
  | "inventory.editSellingPrice"
  | "inventory.toggleSkuStatus"
  // Sales
  | "sales.view"
  | "sales.viewAllUsers"
  | "sales.create"
  | "sales.void"
  // Purchases
  | "purchases.view"
  | "purchases.viewCostPrice"
  | "purchases.create"
  | "purchases.reviewQuality"
  | "purchases.void"
  // Purchase Orders
  | "po.view"
  | "po.viewAllUsers"
  | "po.create"
  | "po.review"
  // Fabric Types
  | "fabricTypes.view"
  | "fabricTypes.create"
  | "fabricTypes.edit"
  // Users
  | "users.view"
  | "users.create"
  | "users.resetPassword"
  | "users.toggleActive"
  // System & Account
  | "notifications.view"
  | "account.changePassword";

export type PermissionKind = "module" | "read" | "write" | "field" | "scope";

export type PermissionMeta = {
  key: PermissionKey;
  group: string;
  label: string;
  description: string;
  kind: PermissionKind;
  moduleKey?: PermissionKey;
};

export const PERMISSION_CATALOG: PermissionMeta[] = [
  // Module Visibility
  {
    key: "modules.inventory",
    group: "Module Visibility",
    label: "Inventory Module",
    description: "Show Inventory tab in navigation and allow opening the Inventory dashboard.",
    kind: "module",
  },
  {
    key: "modules.skus",
    group: "Module Visibility",
    label: "SKU Catalog Module",
    description: "Allow opening the SKUs catalog page (/skus).",
    kind: "module",
  },
  {
    key: "modules.sales",
    group: "Module Visibility",
    label: "Sales Module",
    description: "Show Sales Log tab in navigation and allow opening Sales Log.",
    kind: "module",
  },
  {
    key: "modules.purchases",
    group: "Module Visibility",
    label: "Purchases Module",
    description: "Show Purchases tab in navigation and allow opening Purchase Log.",
    kind: "module",
  },
  {
    key: "modules.po",
    group: "Module Visibility",
    label: "Purchase Orders (PO) Module",
    description: "Show PO tab in navigation and allow opening Purchase Orders.",
    kind: "module",
  },
  {
    key: "modules.fabricTypes",
    group: "Module Visibility",
    label: "Fabric Types Module",
    description: "Show Fabric Types tab in navigation and allow opening Fabric Types setup.",
    kind: "module",
  },
  {
    key: "modules.users",
    group: "Module Visibility",
    label: "Users Module",
    description: "Show Users tab in navigation and allow opening Staff Management.",
    kind: "module",
  },

  // Inventory & SKUs
  {
    key: "inventory.view",
    group: "Inventory & SKUs",
    label: "View Inventory & Stock Levels",
    description: "Search, filter, and list inventory SKUs and stock quantities.",
    kind: "read",
    moduleKey: "modules.inventory",
  },
  {
    key: "inventory.viewPrices",
    group: "Inventory & SKUs",
    label: "View Selling Price / m",
    description: "See selling price per metre in Inventory list, SKU detail, and Sale forms.",
    kind: "field",
    moduleKey: "modules.inventory",
  },
  {
    key: "inventory.viewPriceHistory",
    group: "Inventory & SKUs",
    label: "View Price Change History",
    description: "See past selling price updates on the SKU detail page.",
    kind: "field",
    moduleKey: "modules.skus",
  },
  {
    key: "inventory.viewDetails",
    group: "Inventory & SKUs",
    label: "View Full SKU Details",
    description: "Open full SKU detail pages (/skus/:id) and clickable SKU detail links.",
    kind: "read",
  },
  {
    key: "inventory.viewInactive",
    group: "Inventory & SKUs",
    label: "View Inactive SKUs",
    description: "See deactivated SKUs and filter by Active / Inactive status.",
    kind: "field",
    moduleKey: "modules.inventory",
  },
  {
    key: "inventory.viewUnpriced",
    group: "Inventory & SKUs",
    label: "View Unpriced SKUs",
    description: "See SKUs whose selling price is not yet set (₹0).",
    kind: "field",
    moduleKey: "modules.inventory",
  },
  {
    key: "inventory.createSku",
    group: "Inventory & SKUs",
    label: "Create New SKU",
    description: "Add new SKU entries manually (/skus/new).",
    kind: "write",
  },
  {
    key: "inventory.editSku",
    group: "Inventory & SKUs",
    label: "Edit SKU Details",
    description: "Edit fabric name, type, variant, warehouse, identifiers, and low stock threshold.",
    kind: "write",
  },
  {
    key: "inventory.editSellingPrice",
    group: "Inventory & SKUs",
    label: "Edit Selling Price",
    description: "Set or change SKU selling price per metre when creating or editing SKUs.",
    kind: "write",
  },
  {
    key: "inventory.toggleSkuStatus",
    group: "Inventory & SKUs",
    label: "Activate / Deactivate SKU",
    description: "Enable or disable SKUs from the SKU detail page.",
    kind: "write",
  },

  // Sales
  {
    key: "sales.view",
    group: "Sales",
    label: "View Sales Log",
    description: "Read recorded sales entries on Sales Log and SKU history.",
    kind: "read",
    moduleKey: "modules.sales",
  },
  {
    key: "sales.viewAllUsers",
    group: "Sales",
    label: "View All Users' Sales",
    description: "See sales recorded by every user. When disabled, only sees own sales.",
    kind: "scope",
    moduleKey: "modules.sales",
  },
  {
    key: "sales.create",
    group: "Sales",
    label: "Record Sale",
    description: "Create new sale transactions and show Sell / Record Sale actions.",
    kind: "write",
  },
  {
    key: "sales.void",
    group: "Sales",
    label: "Void Sale",
    description: "Void recorded sales and restore deducted metres back to stock.",
    kind: "write",
    moduleKey: "modules.sales",
  },

  // Purchases (Stock In)
  {
    key: "purchases.view",
    group: "Purchases (Stock In)",
    label: "View Purchase Log",
    description: "Read inward stock purchases on Purchases page and SKU purchase history.",
    kind: "read",
    moduleKey: "modules.purchases",
  },
  {
    key: "purchases.viewCostPrice",
    group: "Purchases (Stock In)",
    label: "View Purchase Cost Price / m",
    description: "See supplier cost price per metre in Purchase Log and SKU purchase history.",
    kind: "field",
    moduleKey: "modules.purchases",
  },
  {
    key: "purchases.create",
    group: "Purchases (Stock In)",
    label: "Record Purchase (Stock In)",
    description: "Record new fabric purchases and auto-generate SKU codes.",
    kind: "write",
  },
  {
    key: "purchases.reviewQuality",
    group: "Purchases (Stock In)",
    label: "Review Purchase Quality",
    description: "Approve, reject, or change quality inspection status on purchase entries.",
    kind: "write",
    moduleKey: "modules.purchases",
  },
  {
    key: "purchases.void",
    group: "Purchases (Stock In)",
    label: "Void Purchase Entry",
    description: "Void stock-in entries and subtract unsold stock from inventory.",
    kind: "write",
    moduleKey: "modules.purchases",
  },

  // Purchase Orders (PO)
  {
    key: "po.view",
    group: "Purchase Orders (PO)",
    label: "View Purchase Orders",
    description: "Read Purchase Order requests on the PO page.",
    kind: "read",
    moduleKey: "modules.po",
  },
  {
    key: "po.viewAllUsers",
    group: "Purchase Orders (PO)",
    label: "View All Users' POs",
    description: "See POs submitted by anyone. When disabled, only sees own POs.",
    kind: "scope",
    moduleKey: "modules.po",
  },
  {
    key: "po.create",
    group: "Purchase Orders (PO)",
    label: "Create PO Request",
    description: "Submit new Purchase Order requests and show PO / New PO buttons.",
    kind: "write",
  },
  {
    key: "po.review",
    group: "Purchase Orders (PO)",
    label: "Approve / Reject PO",
    description: "Review pending POs and approve or reject them.",
    kind: "write",
    moduleKey: "modules.po",
  },

  // Fabric Types
  {
    key: "fabricTypes.view",
    group: "Fabric Types",
    label: "View Fabric Types",
    description: "Read the Fabric Types directory list.",
    kind: "read",
    moduleKey: "modules.fabricTypes",
  },
  {
    key: "fabricTypes.create",
    group: "Fabric Types",
    label: "Add Fabric Type",
    description: "Create new fabric type names.",
    kind: "write",
    moduleKey: "modules.fabricTypes",
  },
  {
    key: "fabricTypes.edit",
    group: "Fabric Types",
    label: "Rename Fabric Type",
    description: "Rename existing fabric types.",
    kind: "write",
    moduleKey: "modules.fabricTypes",
  },

  // User Management
  {
    key: "users.view",
    group: "User Management",
    label: "View Users",
    description: "See staff user accounts, roles, and active status on Users page.",
    kind: "read",
    moduleKey: "modules.users",
  },
  {
    key: "users.create",
    group: "User Management",
    label: "Create Users",
    description: "Add new staff user accounts and assign roles.",
    kind: "write",
    moduleKey: "modules.users",
  },
  {
    key: "users.resetPassword",
    group: "User Management",
    label: "Reset User Passwords",
    description: "Set temporary passwords for other users.",
    kind: "write",
    moduleKey: "modules.users",
  },
  {
    key: "users.toggleActive",
    group: "User Management",
    label: "Activate / Deactivate Users",
    description: "Enable or disable staff user login access.",
    kind: "write",
    moduleKey: "modules.users",
  },

  // System & Account
  {
    key: "notifications.view",
    group: "System & Account",
    label: "Notifications Bell",
    description: "Show notification bell icon and alerts in the top bar.",
    kind: "read",
  },
  {
    key: "account.changePassword",
    group: "System & Account",
    label: "Change Own Password",
    description: "Allow users in this role to update their own password on the Account page.",
    kind: "write",
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATALOG.map((p) => p.key);

function buildFullPermissions(): Record<PermissionKey, boolean> {
  const out = {} as Record<PermissionKey, boolean>;
  for (const key of ALL_PERMISSION_KEYS) {
    out[key] = true;
  }
  return out;
}

export type ConfigurableRole = "OWNER" | "MANAGER" | "SALES";
export const CONFIGURABLE_ROLES: ConfigurableRole[] = ["OWNER", "MANAGER", "SALES"];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Record<PermissionKey, boolean>> = {
  SUPER_ADMIN: buildFullPermissions(),
  OWNER: buildFullPermissions(),
  MANAGER: {
    "modules.inventory": true,
    "modules.skus": false,
    "modules.sales": true,
    "modules.purchases": true,
    "modules.po": false,
    "modules.fabricTypes": false,
    "modules.users": false,

    "inventory.view": true,
    "inventory.viewPrices": true,
    "inventory.viewPriceHistory": false,
    "inventory.viewDetails": false,
    "inventory.viewInactive": false,
    "inventory.viewUnpriced": true,
    "inventory.createSku": true,
    "inventory.editSku": true,
    "inventory.editSellingPrice": false,
    "inventory.toggleSkuStatus": true,

    "sales.view": true,
    "sales.viewAllUsers": false,
    "sales.create": true,
    "sales.void": false,

    "purchases.view": true,
    "purchases.viewCostPrice": true,
    "purchases.create": true,
    "purchases.reviewQuality": true,
    "purchases.void": true,

    "po.view": false,
    "po.viewAllUsers": false,
    "po.create": false,
    "po.review": false,

    "fabricTypes.view": false,
    "fabricTypes.create": false,
    "fabricTypes.edit": false,

    "users.view": false,
    "users.create": false,
    "users.resetPassword": false,
    "users.toggleActive": false,

    "notifications.view": false,
    "account.changePassword": true,
  },
  SALES: {
    "modules.inventory": true,
    "modules.skus": false,
    "modules.sales": true,
    "modules.purchases": false,
    "modules.po": true,
    "modules.fabricTypes": false,
    "modules.users": false,

    "inventory.view": true,
    "inventory.viewPrices": true,
    "inventory.viewPriceHistory": false,
    "inventory.viewDetails": false,
    "inventory.viewInactive": false,
    "inventory.viewUnpriced": false,
    "inventory.createSku": false,
    "inventory.editSku": false,
    "inventory.editSellingPrice": false,
    "inventory.toggleSkuStatus": false,

    "sales.view": true,
    "sales.viewAllUsers": false,
    "sales.create": true,
    "sales.void": false,

    "purchases.view": false,
    "purchases.viewCostPrice": false,
    "purchases.create": false,
    "purchases.reviewQuality": false,
    "purchases.void": false,

    "po.view": true,
    "po.viewAllUsers": false,
    "po.create": true,
    "po.review": false,

    "fabricTypes.view": false,
    "fabricTypes.create": false,
    "fabricTypes.edit": false,

    "users.view": false,
    "users.create": false,
    "users.resetPassword": false,
    "users.toggleActive": false,

    "notifications.view": false,
    "account.changePassword": true,
  },
};

const CACHE_TTL_MS = 5000;
let cachedMap: Partial<Record<Role, Record<PermissionKey, boolean>>> = {};
let cacheLoadedAt = 0;

export function invalidateAccessControlCache(): void {
  cachedMap = {};
  cacheLoadedAt = 0;
}

export async function getAllRolePermissions(): Promise<Record<Role, Record<PermissionKey, boolean>>> {
  const now = Date.now();
  if (
    now - cacheLoadedAt < CACHE_TTL_MS &&
    cachedMap.SUPER_ADMIN &&
    cachedMap.OWNER &&
    cachedMap.MANAGER &&
    cachedMap.SALES
  ) {
    return {
      SUPER_ADMIN: cachedMap.SUPER_ADMIN,
      OWNER: cachedMap.OWNER,
      MANAGER: cachedMap.MANAGER,
      SALES: cachedMap.SALES,
    };
  }

  const docs = await AccessControl.find({ role: { $in: CONFIGURABLE_ROLES } }).lean();
  const byRole = new Map<string, Record<string, boolean>>();
  for (const d of docs) {
    byRole.set(d.role, (d.permissions as Record<string, boolean>) || {});
  }

  const resolve = (role: ConfigurableRole): Record<PermissionKey, boolean> => {
    const base = { ...DEFAULT_ROLE_PERMISSIONS[role] };
    const stored = byRole.get(role) || {};
    for (const key of ALL_PERMISSION_KEYS) {
      if (typeof stored[key] === "boolean") {
        base[key] = stored[key];
      }
    }
    return base;
  };

  const result: Record<Role, Record<PermissionKey, boolean>> = {
    SUPER_ADMIN: buildFullPermissions(),
    OWNER: resolve("OWNER"),
    MANAGER: resolve("MANAGER"),
    SALES: resolve("SALES"),
  };

  cachedMap = result;
  cacheLoadedAt = now;
  return result;
}

export async function getRolePermissions(role: Role): Promise<Record<PermissionKey, boolean>> {
  if (role === "SUPER_ADMIN") {
    return buildFullPermissions();
  }
  const all = await getAllRolePermissions();
  return all[role] || { ...DEFAULT_ROLE_PERMISSIONS[role] };
}

export async function hasPermission(role: Role, ...keys: PermissionKey[]): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true;
  const perms = await getRolePermissions(role);
  return keys.some((k) => Boolean(perms[k]));
}

export function requirePermission(...keys: PermissionKey[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as AuthenticatedRequest).user;
    if (!user) {
      res.status(401).json({ ok: false, message: "Unauthorized" });
      return;
    }
    if (user.role === "SUPER_ADMIN") {
      next();
      return;
    }
    try {
      const allowed = await hasPermission(user.role, ...keys);
      if (!allowed) {
        res.status(403).json({ ok: false, message: "Access denied by role permissions." });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
