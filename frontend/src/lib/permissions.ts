export type RoleName = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "SALES";

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

export type PermissionMap = Record<PermissionKey, boolean>;

const FULL_PERMISSIONS: PermissionMap = {
  "modules.inventory": true,
  "modules.skus": true,
  "modules.sales": true,
  "modules.purchases": true,
  "modules.po": true,
  "modules.fabricTypes": true,
  "modules.users": true,
  "inventory.view": true,
  "inventory.viewPrices": true,
  "inventory.viewPriceHistory": true,
  "inventory.viewDetails": true,
  "inventory.viewInactive": true,
  "inventory.viewUnpriced": true,
  "inventory.createSku": true,
  "inventory.editSku": true,
  "inventory.editSellingPrice": true,
  "inventory.toggleSkuStatus": true,
  "sales.view": true,
  "sales.viewAllUsers": true,
  "sales.create": true,
  "sales.void": true,
  "purchases.view": true,
  "purchases.viewCostPrice": true,
  "purchases.create": true,
  "purchases.reviewQuality": true,
  "purchases.void": true,
  "po.view": true,
  "po.viewAllUsers": true,
  "po.create": true,
  "po.review": true,
  "fabricTypes.view": true,
  "fabricTypes.create": true,
  "fabricTypes.edit": true,
  "users.view": true,
  "users.create": true,
  "users.resetPassword": true,
  "users.toggleActive": true,
  "notifications.view": true,
  "account.changePassword": true,
};

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, PermissionMap> = {
  SUPER_ADMIN: { ...FULL_PERMISSIONS },
  OWNER: { ...FULL_PERMISSIONS },
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

export function resolvePermissions(role: RoleName, overrides?: Record<string, boolean>): PermissionMap {
  if (role === "SUPER_ADMIN") {
    return { ...DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN };
  }
  const base = { ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.SALES) };
  if (overrides) {
    for (const k of Object.keys(base) as PermissionKey[]) {
      if (typeof overrides[k] === "boolean") {
        base[k] = overrides[k];
      }
    }
  }
  return base;
}

export function getDefaultLandingRoute(perms: PermissionMap): string {
  if (perms["modules.inventory"] && perms["inventory.view"]) return "/dashboard";
  if (perms["modules.sales"] && perms["sales.view"]) return "/sales";
  if (perms["sales.create"]) return "/sales/new";
  if (perms["modules.purchases"] && perms["purchases.view"]) return "/purchases";
  if (perms["purchases.create"]) return "/stock-in/new";
  if (perms["modules.po"] && perms["po.view"]) return "/po";
  if (perms["po.create"]) return "/po/new";
  if (perms["modules.fabricTypes"] && perms["fabricTypes.view"]) return "/fabric-types";
  if (perms["modules.users"] && perms["users.view"]) return "/users";
  return "/account";
}
