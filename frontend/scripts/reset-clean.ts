import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function reset() {
  console.log("Clearing all existing transactional and inventory data...");
  await prisma.sale.deleteMany({});
  await prisma.stockIn.deleteMany({});
  await prisma.priceChange.deleteMany({});
  await prisma.sku.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  const pw = process.env.SEED_TEMP_PASSWORD;
  if (!pw || pw.length < 8) throw new Error("Set SEED_TEMP_PASSWORD (min 8 chars) in .env");
  const hash = await bcrypt.hash(pw, 12);

  const users = [
    { name: "Anil", username: "anil", email: process.env.SEED_MANAGER1_EMAIL!, role: "MANAGER" as const },
    { name: "Rahul", username: "rahul", email: process.env.SEED_MANAGER2_EMAIL!, role: "MANAGER" as const },
    { name: "Sales Person", username: "sales", email: process.env.SEED_SALES_EMAIL!, role: "SALES" as const },
  ];

  for (const u of users) {
    if (!u.email) throw new Error("Seed emails are missing in environment");
    await prisma.user.create({
      data: {
        name: u.name,
        username: u.username,
        email: u.email.toLowerCase(),
        role: u.role,
        passwordHash: hash,
        active: true,
        mustChangePassword: true,
      },
    });
  }

  const userCount = await prisma.user.count();
  const skuCount = await prisma.sku.count();
  const saleCount = await prisma.sale.count();
  const stockInCount = await prisma.stockIn.count();

  console.log("RESET SUCCESSFUL:");
  console.log("- Users count:", userCount);
  console.log("- SKUs count:", skuCount);
  console.log("- Sales count:", saleCount);
  console.log("- Stock-ins count:", stockInCount);
}

reset().finally(() => prisma.$disconnect());
