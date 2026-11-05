import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  const sales = await prisma.user.findFirst({ where: { role: "SALES" } });
  if (!owner || !sales) throw new Error("Run seed first");

  const skus = await prisma.sku.findMany({ where: { active: true }, take: 5 });
  if (skus.length === 0) throw new Error("No SKUs found");

  const now = new Date();
  const day = (d: number) => new Date(now.getTime() - d * 86400000);

  // Sales with different sold prices vs sale price
  const saleData = [
    { sku: skus[0], qty: 10, soldPrice: skus[0].sellingPricePerMetre, days: 1, buyer: "ABC Textiles" },        // equal - normal
    { sku: skus[0], qty: 5, soldPrice: skus[0].sellingPricePerMetre - 3, days: 2, buyer: "XYZ Fabrics" },       // loss - red
    { sku: skus[1 % skus.length], qty: 8, soldPrice: skus[1 % skus.length].sellingPricePerMetre + 5, days: 3, buyer: "Star Garments" },  // profit - green
    { sku: skus[2 % skus.length], qty: 15, soldPrice: skus[2 % skus.length].sellingPricePerMetre - 2, days: 0, buyer: "Royal Exports" },  // loss - red
    { sku: skus[1 % skus.length], qty: 20, soldPrice: skus[1 % skus.length].sellingPricePerMetre, days: 4, buyer: "Metro Trading" },      // equal - normal
    { sku: skus[0], qty: 12, soldPrice: skus[0].sellingPricePerMetre + 10, days: 5, buyer: "Prime Clothing" },   // profit - green
  ];

  for (const s of saleData) {
    await prisma.sale.create({
      data: {
        skuId: s.sku.id,
        quantityMetres: s.qty,
        pricePerMetre: s.sku.sellingPricePerMetre,
        soldPricePerMetre: s.soldPrice,
        saleDate: day(s.days),
        buyerName: s.buyer,
        createdById: sales.id,
      },
    });
  }
  console.log(`Created ${saleData.length} sales`);

  // Notifications for owners
  const owners = await prisma.user.findMany({ where: { role: "OWNER" } });
  for (const o of owners) {
    await prisma.notification.createMany({
      data: saleData.map((s, i) => ({
        userId: o.id,
        message: `Sale: ${s.sku.code} — ${s.qty}m at ₹${s.soldPrice}/m by ${sales.name}`,
        link: "/sales",
        read: false,
        createdAt: day(saleData.length - 1 - i),
      })),
    });
  }
  console.log(`Created notifications for ${owners.length} owners`);

  // POs
  const poData = [
    { company: "ABC Textiles", qty: 100, desc: "Need cotton white urgently" },
    { company: "Star Garments", qty: 50, desc: "Silk black for winter collection" },
    { company: "Royal Exports", qty: 200, desc: null },
  ];
  for (const p of poData) {
    await prisma.purchaseOrder.create({
      data: {
        companyName: p.company,
        quantity: p.qty,
        description: p.desc,
        createdById: sales.id,
      },
    });
  }
  console.log(`Created ${poData.length} POs`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
