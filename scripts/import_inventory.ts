import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting inventory import...");
  
  // Find a manager user to attribute creation to
  let mgr = await prisma.user.findFirst({ where: { role: "MANAGER" } });
  if (!mgr) {
    mgr = await prisma.user.findFirst();
  }
  if (!mgr) {
    throw new Error("No user found in database. Please run db:seed first.");
  }

  const jsonPath = path.join(process.cwd(), "prisma", "inventory.json");
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const items = JSON.parse(rawData);

  console.log(`Loaded ${items.length} inventory items from ${jsonPath}`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const it of items) {
    const existing = await prisma.sku.findUnique({ where: { code: it.code } });
    
    if (existing) {
      await prisma.sku.update({
        where: { id: existing.id },
        data: {
          fabricName: it.fabricName,
          fabricType: it.fabricType,
          colour: it.colour,
          pattern: it.pattern,
          otherIdentifiers: it.otherIdentifiers,
          sellingPricePerMetre: it.sellingPricePerMetre,
          lowStockThreshold: it.lowStockThreshold,
          currentStock: it.currentStock,
          active: true,
        },
      });
      updatedCount++;
    } else {
      const sku = await prisma.sku.create({
        data: {
          code: it.code,
          fabricName: it.fabricName,
          fabricType: it.fabricType,
          colour: it.colour,
          pattern: it.pattern,
          otherIdentifiers: it.otherIdentifiers,
          sellingPricePerMetre: it.sellingPricePerMetre,
          lowStockThreshold: it.lowStockThreshold,
          currentStock: it.currentStock,
          createdById: mgr.id,
          active: true,
        },
      });

      await prisma.priceChange.create({
        data: {
          skuId: sku.id,
          newPrice: it.sellingPricePerMetre,
          changedById: mgr.id,
        },
      });

      if (it.currentStock > 0) {
        await prisma.stockIn.create({
          data: {
            skuId: sku.id,
            supplierName: it.supplierName || "Apollo Mill Partner",
            quantityMetres: it.currentStock,
            purchaseDate: new Date(),
            costPricePerMetre: it.costPricePerMetre || 85.0,
            createdById: mgr.id,
          },
        });
      }

      createdCount++;
    }
  }

  console.log(`Import finished! Created: ${createdCount}, Updated: ${updatedCount}, Total: ${items.length}`);
}

main()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
