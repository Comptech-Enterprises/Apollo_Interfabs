import { connectDB, disconnectDB, User, Sku, Sale, Notification, PurchaseOrder } from "./db.js";

async function main() {
  await connectDB();

  const owner = await User.findOne({ role: "OWNER" });
  const sales = await User.findOne({ role: "SALES" });
  if (!owner || !sales) throw new Error("Run seed first");

  const skus = await Sku.find({ active: true }).limit(5);
  if (skus.length === 0) throw new Error("No SKUs found");

  const now = new Date();
  const day = (d: number) => new Date(now.getTime() - d * 86400000);

  // Sales with different sold prices vs sale price
  const saleData = [
    { sku: skus[0], qty: 10, soldPrice: skus[0].sellingPricePerMetre, days: 1, buyer: "ABC Textiles" },
    { sku: skus[0], qty: 5, soldPrice: skus[0].sellingPricePerMetre - 3, days: 2, buyer: "XYZ Fabrics" },
    { sku: skus[1 % skus.length], qty: 8, soldPrice: skus[1 % skus.length].sellingPricePerMetre + 5, days: 3, buyer: "Star Garments" },
    { sku: skus[2 % skus.length], qty: 15, soldPrice: skus[2 % skus.length].sellingPricePerMetre - 2, days: 0, buyer: "Royal Exports" },
    { sku: skus[1 % skus.length], qty: 20, soldPrice: skus[1 % skus.length].sellingPricePerMetre, days: 4, buyer: "Metro Trading" },
    { sku: skus[0], qty: 12, soldPrice: skus[0].sellingPricePerMetre + 10, days: 5, buyer: "Prime Clothing" },
  ];

  for (const s of saleData) {
    await Sale.create({
      skuId: s.sku._id,
      quantityMetres: s.qty,
      pricePerMetre: s.sku.sellingPricePerMetre,
      soldPricePerMetre: s.soldPrice,
      saleDate: day(s.days),
      buyerName: s.buyer,
      createdById: sales._id,
    });
  }
  console.log(`Created ${saleData.length} sales`);

  // Notifications for owners
  const owners = await User.find({ role: "OWNER" });
  for (const o of owners) {
    await Notification.insertMany(
      saleData.map((s, i) => ({
        userId: o._id,
        message: `Sale: ${s.sku.code} — ${s.qty}m at ₹${s.soldPrice}/m by ${sales.name}`,
        link: "/sales",
        read: false,
        createdAt: day(saleData.length - 1 - i),
      }))
    );
  }
  console.log(`Created notifications for ${owners.length} owners`);

  // POs
  const poData = [
    { itemName: "Cotton White Fabric", customer: "ABC Textiles", qty: 100, desc: "Need cotton white urgently" },
    { itemName: "Silk Black Fabric", customer: "Star Garments", qty: 50, desc: "Silk black for winter collection" },
    { itemName: "Polyester Navy Suiting", customer: "Royal Exports", qty: 200, desc: null },
  ];
  for (const p of poData) {
    await PurchaseOrder.create({
      itemName: p.itemName,
      customerName: p.customer,
      quantity: p.qty,
      description: p.desc,
      createdById: sales._id,
    });
  }
  console.log(`Created ${poData.length} POs`);
}

main()
  .then(() => disconnectDB())
  .catch((e) => {
    console.error(e);
    disconnectDB().finally(() => process.exit(1));
  });
