import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pw = process.env.SEED_TEMP_PASSWORD;
  if (!pw || pw.length < 8) throw new Error("Set SEED_TEMP_PASSWORD (min 8 chars) in .env");
  const hash = await bcrypt.hash(pw, 12);
  const users = [
    { name: "Manager One", email: process.env.SEED_MANAGER1_EMAIL!, role: "MANAGER" as const },
    { name: "Manager Two", email: process.env.SEED_MANAGER2_EMAIL!, role: "MANAGER" as const },
    { name: "Sales Person", email: process.env.SEED_SALES_EMAIL!, role: "SALES" as const },
  ];
  for (const u of users) {
    if (!u.email) throw new Error("Seed emails are missing in .env");
    await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: {},
      create: { ...u, email: u.email.toLowerCase(), passwordHash: hash, mustChangePassword: true },
    });
  }
  console.log("Seeded 2 managers and 1 sales user. They must change the password at first sign-in.");

  if (process.argv.includes("--demo")) {
    const mgr = await prisma.user.findFirstOrThrow({ where: { role: "MANAGER" } });
    const demo = [
      { code: "BLK-POLY-JUN26", fabricName: "Black Polyester Suiting", fabricType: "Polyester", colour: "Black", pattern: "Plain", price: 180, low: 50, qty: 200, cost: 120 },
      { code: "WHT-COT-JUN26", fabricName: "White Cotton Poplin", fabricType: "Cotton", colour: "White", pattern: "Plain", price: 150, low: 40, qty: 120, cost: 95 },
      { code: "NVY-RAY-JUL26", fabricName: "Navy Rayon Print", fabricType: "Rayon", colour: "Navy", pattern: "Printed", price: 210, low: 30, qty: 25, cost: 140 },
    ];
    for (const d of demo) {
      const exists = await prisma.sku.findUnique({ where: { code: d.code } });
      if (exists) continue;
      const sku = await prisma.sku.create({
        data: {
          code: d.code, fabricName: d.fabricName, fabricType: d.fabricType, colour: d.colour, pattern: d.pattern,
          sellingPricePerMetre: d.price, lowStockThreshold: d.low, currentStock: d.qty, createdById: mgr.id,
        },
      });
      await prisma.priceChange.create({ data: { skuId: sku.id, newPrice: d.price, changedById: mgr.id } });
      await prisma.stockIn.create({
        data: { skuId: sku.id, supplierName: "Demo Supplier", quantityMetres: d.qty, purchaseDate: new Date(), costPricePerMetre: d.cost, createdById: mgr.id },
      });
    }
    console.log("Demo SKUs added.");
  }
}

main().finally(() => prisma.$disconnect());
