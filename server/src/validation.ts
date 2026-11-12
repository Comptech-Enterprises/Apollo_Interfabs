import { z } from "zod";

const money = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .positive(`${label} must be greater than 0`)
    .max(99999999, `${label} is too large`)
    .refine((n) => Math.round(n * 100) / 100 === n, `${label} can have at most 2 decimal places`);

const nonNegative = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(99999999, `${label} is too large`)
    .refine((n) => Math.round(n * 100) / 100 === n, `${label} can have at most 2 decimal places`);

const text = (label: string, max = 100) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const optionalText = (max = 200) =>
  z.string().trim().max(max, "Text is too long").optional().transform((v) => (v ? v : undefined));

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((d) => !Number.isNaN(Date.parse(d)), "Enter a valid date");

export const WAREHOUSES = ["Warehouse 1", "Warehouse 2", "Warehouse 3", "Warehouse 4"] as const;

export const skuCode = z
  .string().trim().toUpperCase()
  .regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/, "Use capital letters, digits and hyphens only")
  .max(40, "SKU code is too long");

export const skuSchema = z.object({
  code: skuCode,
  itemCode: text("Item code", 40).optional(),
  fabricName: text("Fabric name"),
  fabricType: text("Fabric type", 50),
  variant: text("Variant", 50),
  pattern: optionalText(50),
  otherIdentifiers: optionalText(300),
  warehouse: z.enum(WAREHOUSES, { errorMap: () => ({ message: "Select a warehouse" }) }),
  sellingPricePerMetre: z.coerce.number().min(0).max(99999999).optional().default(0),
  lowStockThreshold: nonNegative("Low stock threshold"),
});

export const stockInSchema = z.object({
  itemCode: text("Item code", 40),
  fabricType: text("Fabric type", 50),
  variant: text("Variant", 50),
  warehouse: z.enum(WAREHOUSES, { errorMap: () => ({ message: "Select a warehouse" }) }),
  supplierName: text("Supplier name"),
  quantityInches: nonNegative("Quantity inches"),
  quantityMetres: money("Quantity metres"),
  costPricePerMetre: money("Cost price"),
  purchaseDate: dateString,
});

export const updateQualitySchema = z.object({
  qualityStatus: z.enum(["APPROVED", "REJECTED", "PENDING"], {
    errorMap: () => ({ message: "Status must be APPROVED, REJECTED, or PENDING" }),
  }),
  notes: optionalText(300),
});

export const saleSchema = z.object({
  skuId: text("SKU"),
  quantityMetres: money("Metres sold"),
  soldPricePerMetre: money("Sold price"),
  saleDate: dateString,
  buyerName: text("Company name"),
});

export const purchaseOrderSchema = z.object({
  itemName: text("Item name"),
  quantity: money("Quantity"),
  customerName: text("Customer name"),
  description: optionalText(300),
});

export const poReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  note: optionalText(300),
});

export const voidSchema = z.object({
  id: text("Entry"),
  reason: text("Reason", 200),
});

export const userSchema = z.object({
  name: text("Name"),
  username: z.string().trim().toLowerCase().min(3, "Username must be at least 3 characters").max(30),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["OWNER", "MANAGER", "SALES"]),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
});

export function zodMessage(e: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const i of e.issues) {
    const k = String(i.path[0] ?? "form");
    if (!fields[k]) fields[k] = i.message;
  }
  return { message: e.issues[0]?.message ?? "Please check the form.", fields };
}
