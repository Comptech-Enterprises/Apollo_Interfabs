import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signSession, verifySession } from "../src/lib/session";

const prisma = new PrismaClient();

describe("Live Database & Core Business Logic Integration Tests", () => {
  let managerUser: { id: string; email: string };
  let salesUser: { id: string; email: string };

  beforeAll(async () => {
    // Clean up or find seeded users
    const mgr = await prisma.user.findFirst({ where: { role: "MANAGER" } });
    const sls = await prisma.user.findFirst({ where: { role: "SALES" } });
    expect(mgr).toBeDefined();
    expect(sls).toBeDefined();
    managerUser = mgr!;
    salesUser = sls!;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("verifies seeded users and authentication mechanisms", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: managerUser.id } });
    expect(user.role).toBe("MANAGER");

    // Check password verify
    const isValid = await bcrypt.compare(process.env.SEED_TEMP_PASSWORD || "ChangeMe#2026", user.passwordHash);
    expect(isValid).toBe(true);

    // Check JWT signing and verification
    const token = await signSession({ uid: user.id, name: user.name, role: user.role });
    const payload = await verifySession(token);
    expect(payload?.uid).toBe(user.id);
    expect(payload?.role).toBe("MANAGER");
  });

  it("handles full lifecycle: SKU creation, stock-in, atomic sale, oversell protection, and voiding", async () => {
    const testSkuCode = `TEST-FAB-${Date.now()}`;

    // 1. Manager creates a SKU
    const sku = await prisma.$transaction(async (tx) => {
      const s = await tx.sku.create({
        data: {
          code: testSkuCode,
          fabricName: "Test Silk Brocade",
          fabricType: "Silk",
          colour: "Gold",
          pattern: "Floral",
          sellingPricePerMetre: 500.00,
          lowStockThreshold: 20.00,
          currentStock: 0,
          createdById: managerUser.id,
        },
      });
      await tx.priceChange.create({
        data: {
          skuId: s.id,
          newPrice: s.sellingPricePerMetre,
          changedById: managerUser.id,
        },
      });
      return s;
    });

    expect(sku.code).toBe(testSkuCode);
    expect(Number(sku.currentStock)).toBe(0);
    expect(Number(sku.sellingPricePerMetre)).toBe(500);

    // 2. Manager records Stock-In (arrival of 100 metres at cost 350)
    const stockIn = await prisma.$transaction(async (tx) => {
      const si = await tx.stockIn.create({
        data: {
          skuId: sku.id,
          supplierName: "Varanasi Weavers Ltd",
          quantityMetres: 100.00,
          purchaseDate: new Date("2026-10-10"),
          costPricePerMetre: 350.00,
          createdById: managerUser.id,
        },
      });
      await tx.sku.update({
        where: { id: sku.id },
        data: { currentStock: { increment: 100.00 } },
      });
      return si;
    });

    expect(Number(stockIn.quantityMetres)).toBe(100);
    expect(Number(stockIn.costPricePerMetre)).toBe(350);

    const skuAfterStockIn = await prisma.sku.findUniqueOrThrow({ where: { id: sku.id } });
    expect(Number(skuAfterStockIn.currentStock)).toBe(100);

    // 3. Sales records a sale of 30 metres (price autofilled from SKU)
    const sale = await prisma.$transaction(async (tx) => {
      const current = await tx.sku.findUniqueOrThrow({ where: { id: sku.id } });
      expect(current.active).toBe(true);

      const upd = await tx.sku.updateMany({
        where: { id: sku.id, active: true, currentStock: { gte: 30.00 } },
        data: { currentStock: { decrement: 30.00 } },
      });
      expect(upd.count).toBe(1);

      return tx.sale.create({
        data: {
          skuId: sku.id,
          quantityMetres: 30.00,
          pricePerMetre: current.sellingPricePerMetre, // Manager set price snapshot
          saleDate: new Date("2026-10-11"),
          buyerName: "Royal Boutique",
          createdById: salesUser.id,
        },
      });
    });

    expect(Number(sale.quantityMetres)).toBe(30);
    expect(Number(sale.pricePerMetre)).toBe(500);

    const skuAfterSale = await prisma.sku.findUniqueOrThrow({ where: { id: sku.id } });
    expect(Number(skuAfterSale.currentStock)).toBe(70);

    // 4. Oversell protection: Try to sell 80 metres when only 70 metres are available
    const oversellAttempt = await prisma.$transaction(async (tx) => {
      const upd = await tx.sku.updateMany({
        where: { id: sku.id, active: true, currentStock: { gte: 80.00 } },
        data: { currentStock: { decrement: 80.00 } },
      });
      return upd.count;
    });

    expect(oversellAttempt).toBe(0); // Blocked!
    const skuAfterBlocked = await prisma.sku.findUniqueOrThrow({ where: { id: sku.id } });
    expect(Number(skuAfterBlocked.currentStock)).toBe(70); // Still 70 metres

    // 5. Inactive SKU protection: Manager marks SKU inactive, sales cannot be recorded
    await prisma.sku.update({ where: { id: sku.id }, data: { active: false } });

    const inactiveSaleAttempt = await prisma.$transaction(async (tx) => {
      const current = await tx.sku.findUniqueOrThrow({ where: { id: sku.id } });
      if (!current.active) return "INACTIVE";

      const upd = await tx.sku.updateMany({
        where: { id: sku.id, active: true, currentStock: { gte: 10.00 } },
        data: { currentStock: { decrement: 10.00 } },
      });
      return upd.count > 0 ? "SUCCESS" : "OUT_OF_STOCK";
    });

    expect(inactiveSaleAttempt).toBe("INACTIVE");

    // Reactivate for void test
    await prisma.sku.update({ where: { id: sku.id }, data: { active: true } });

    // 6. Voiding a sale restores stock back from 70 to 100
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: sale.id },
        data: { voidedAt: new Date(), voidedById: managerUser.id, voidReason: "Customer returned fabric" },
      });
      await tx.sku.update({
        where: { id: sku.id },
        data: { currentStock: { increment: sale.quantityMetres } },
      });
    });

    const skuAfterVoidSale = await prisma.sku.findUniqueOrThrow({ where: { id: sku.id } });
    expect(Number(skuAfterVoidSale.currentStock)).toBe(100);

    // 7. Voiding Stock-In: Check guard if stock is not sufficient
    // Simulate that only 50m remain in stock, but stockIn was 100m
    await prisma.sku.update({ where: { id: sku.id }, data: { currentStock: 50.00 } });

    const voidStockInAttempt = await prisma.$transaction(async (tx) => {
      const upd = await tx.sku.updateMany({
        where: { id: sku.id, currentStock: { gte: stockIn.quantityMetres } },
        data: { currentStock: { decrement: stockIn.quantityMetres } },
      });
      return upd.count;
    });

    expect(voidStockInAttempt).toBe(0); // Blocked because balance would become negative!
  });

  it("handles high concurrency without overselling race conditions", async () => {
    const concSkuCode = `CONC-FAB-${Date.now()}`;
    const concSku = await prisma.sku.create({
      data: {
        code: concSkuCode,
        fabricName: "Concurrency Velvet",
        fabricType: "Velvet",
        colour: "Burgundy",
        sellingPricePerMetre: 200,
        currentStock: 50, // 50 metres total
        createdById: managerUser.id,
      },
    });

    // 10 concurrent sales requests for 10 metres each (total 100m requested, only 50m available)
    const results = await Promise.all(
      Array.from({ length: 10 }).map(async (_, idx) => {
        try {
          return await prisma.$transaction(async (tx) => {
            const upd = await tx.sku.updateMany({
              where: { id: concSku.id, active: true, currentStock: { gte: 10 } },
              data: { currentStock: { decrement: 10 } },
            });
            if (upd.count === 0) return { success: false, idx };
            await tx.sale.create({
              data: {
                skuId: concSku.id,
                quantityMetres: 10,
                pricePerMetre: concSku.sellingPricePerMetre,
                saleDate: new Date(),
                buyerName: `Buyer ${idx}`,
                createdById: salesUser.id,
              },
            });
            return { success: true, idx };
          });
        } catch {
          return { success: false, idx };
        }
      })
    );

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    expect(successful.length).toBe(5); // Exactly 5 * 10m = 50m sold
    expect(failed.length).toBe(5);     // Remaining 5 were blocked

    const finalSku = await prisma.sku.findUniqueOrThrow({ where: { id: concSku.id } });
    expect(Number(finalSku.currentStock)).toBe(0); // Exactly 0 metres left
  });
});
