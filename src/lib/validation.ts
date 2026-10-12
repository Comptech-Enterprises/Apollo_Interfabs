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
  z
    .string()
    .trim()
    .max(max, "Text is too long")
    .optional()
    .transform((v) => (v ? v : undefined));

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((d) => !Number.isNaN(Date.parse(d)), "Enter a valid date")
  .refine((d) => d <= todayIST(), "Date cannot be in the future");

export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export const skuCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/, "Use capital letters, digits and hyphens only (e.g. BLK-POLY-JUN26)")
  .max(40, "SKU code is too long");

export const skuSchema = z.object({
  code: skuCode,
  fabricName: text("Fabric name"),
  fabricType: text("Fabric type", 50),
  colour: text("Colour", 50),
  pattern: optionalText(50),
  otherIdentifiers: optionalText(300),
  sellingPricePerMetre: money("Selling price"),
  lowStockThreshold: nonNegative("Low stock threshold"),
});

export const stockInSchema = z.object({
  skuId: text("SKU"),
  supplierName: text("Supplier name"),
  quantityMetres: money("Quantity"),
  purchaseDate: dateString,
  costPricePerMetre: money("Cost price"),
});

export const saleSchema = z.object({
  skuId: text("SKU"),
  quantityMetres: money("Metres sold"),
  saleDate: dateString,
  buyerName: optionalText(100),
});

export const voidSchema = z.object({
  id: text("Entry"),
  reason: text("Reason", 200),
});

export const userSchema = z.object({
  name: text("Name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["MANAGER", "SALES"]),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(100),
});

/** Turn a Zod error into one friendly message plus per-field messages. */
export function zodMessage(e: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const i of e.issues) {
    const k = String(i.path[0] ?? "form");
    if (!fields[k]) fields[k] = i.message;
  }
  return { message: e.issues[0]?.message ?? "Please check the form.", fields };
}
