import { describe, expect, it } from "vitest";
import { saleSchema, skuSchema, stockInSchema } from "../src/lib/validation";
import { suggestSkuCode } from "../src/lib/sku-code";
import { formatMetres, formatPrice, isLowStock } from "../src/lib/format";

describe("skuSchema", () => {
  const base = { code: "blk-poly-jun26", fabricName: "Suiting", fabricType: "Polyester", colour: "Black", sellingPricePerMetre: "180", lowStockThreshold: "0" };
  it("uppercases a valid code", () => {
    const r = skuSchema.parse(base);
    expect(r.code).toBe("BLK-POLY-JUN26");
  });
  it("rejects bad codes and prices", () => {
    expect(skuSchema.safeParse({ ...base, code: "bad code!" }).success).toBe(false);
    expect(skuSchema.safeParse({ ...base, sellingPricePerMetre: "0" }).success).toBe(false);
    expect(skuSchema.safeParse({ ...base, sellingPricePerMetre: "10.123" }).success).toBe(false);
  });
});

describe("saleSchema / stockInSchema", () => {
  it("accepts a sale with optional buyer", () => {
    expect(saleSchema.safeParse({ skuId: "x", quantityMetres: "12.5", saleDate: "2026-01-02" }).success).toBe(true);
  });
  it("rejects zero, negative and future quantities/dates", () => {
    expect(saleSchema.safeParse({ skuId: "x", quantityMetres: "0", saleDate: "2026-01-02" }).success).toBe(false);
    expect(saleSchema.safeParse({ skuId: "x", quantityMetres: "-3", saleDate: "2026-01-02" }).success).toBe(false);
    expect(saleSchema.safeParse({ skuId: "x", quantityMetres: "1", saleDate: "2999-01-01" }).success).toBe(false);
  });
  it("ignores any client-sent price on a sale", () => {
    const r = saleSchema.parse({ skuId: "x", quantityMetres: "1", saleDate: "2026-01-02", pricePerMetre: "1" });
    expect("pricePerMetre" in r).toBe(false);
  });
  it("requires supplier for stock-in", () => {
    expect(stockInSchema.safeParse({ skuId: "x", supplierName: "", quantityMetres: "5", purchaseDate: "2026-01-02", costPricePerMetre: "10" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("suggests codes like BLK-POLY-JUN26", () => {
    expect(suggestSkuCode("Black", "Polyester", new Date(2026, 5, 10))).toBe("BLK-POLY-JUN26");
  });
  it("formats values", () => {
    expect(formatMetres(1234.5)).toBe("1,234.50 m");
    expect(formatPrice(180)).toBe("₹180.00");
  });
  it("detects low stock only when a threshold is set", () => {
    expect(isLowStock(10, 20)).toBe(true);
    expect(isLowStock(10, 0)).toBe(false);
    expect(isLowStock(21, 20)).toBe(false);
  });
});
