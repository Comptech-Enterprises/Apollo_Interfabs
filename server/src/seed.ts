import bcrypt from "bcryptjs";
import { connectDB, disconnectDB, User, Sku, PriceChange, StockIn, type Role } from "./db.js";

async function main() {
  await connectDB();

  const pw = process.env.SEED_TEMP_PASSWORD || "ChangeMe#2026";
  const hash = await bcrypt.hash(pw, 12);
  const users = [
    {
      name: "Anil",
      username: "anil",
      email: process.env.SEED_MANAGER1_EMAIL || "manager1@example.com",
      role: "OWNER" as Role,
      warehouses: [] as string[],
    },
    {
      name: "Rahul",
      username: "rahul",
      email: process.env.SEED_MANAGER2_EMAIL || "manager2@example.com",
      role: "OWNER" as Role,
      warehouses: [] as string[],
    },
    {
      name: "Sales Person",
      username: "sales",
      email: process.env.SEED_SALES_EMAIL || "sales@example.com",
      role: "SALES" as Role,
      warehouses: [] as string[],
    },
    {
      name: "Inventory Manager 1",
      username: "invmgr1",
      email: "invmgr1@inventory.local",
      role: "MANAGER" as Role,
      warehouses: ["Warehouse 1", "Warehouse 2"],
    },
    {
      name: "Inventory Manager 2",
      username: "invmgr2",
      email: "invmgr2@inventory.local",
      role: "MANAGER" as Role,
      warehouses: ["Warehouse 3", "Warehouse 4"],
    },
  ];

  for (const u of users) {
    await User.findOneAndUpdate(
      { email: u.email.toLowerCase() },
      {
        $set: {
          name: u.name,
          username: u.username,
          email: u.email.toLowerCase(),
          role: u.role,
          warehouses: u.warehouses,
          passwordHash: hash,
          mustChangePassword: true,
          active: true,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
  }
  console.log("Seeded 3 original users + 2 inventory managers. They must change the password at first sign-in.");

  if (process.argv.includes("--demo")) {
    const mgr = await User.findOne({ role: "OWNER" });
    if (!mgr) throw new Error("No owner found for seeding demo data.");

    const demo = [
      {
        code: "BLK-POLY-JUN26",
        fabricName: "Black Polyester Suiting",
        fabricType: "Polyester",
        colour: "Black",
        pattern: "Plain",
        price: 180,
        low: 50,
        qty: 200,
        cost: 120,
      },
      {
        code: "WHT-COT-JUN26",
        fabricName: "White Cotton Poplin",
        fabricType: "Cotton",
        colour: "White",
        pattern: "Plain",
        price: 150,
        low: 40,
        qty: 120,
        cost: 95,
      },
      {
        code: "NVY-RAY-JUL26",
        fabricName: "Navy Rayon Print",
        fabricType: "Rayon",
        colour: "Navy",
        pattern: "Printed",
        price: 210,
        low: 30,
        qty: 25,
        cost: 140,
      },
    ];

    for (const d of demo) {
      const exists = await Sku.findOne({ code: d.code });
      if (exists) continue;

      const sku = await Sku.create({
        code: d.code,
        fabricName: d.fabricName,
        fabricType: d.fabricType,
        colour: d.colour,
        pattern: d.pattern,
        sellingPricePerMetre: d.price,
        lowStockThreshold: d.low,
        currentStock: d.qty,
        createdById: mgr._id,
      });

      await PriceChange.create({
        skuId: sku._id,
        newPrice: d.price,
        changedById: mgr._id,
      });

      await StockIn.create({
        skuId: sku._id,
        supplierName: "Demo Supplier",
        quantityMetres: d.qty,
        purchaseDate: new Date(),
        costPricePerMetre: d.cost,
        createdById: mgr._id,
      });
    }
    console.log("Demo SKUs added.");
  }
}

main()
  .then(() => disconnectDB())
  .catch((e) => {
    console.error(e);
    disconnectDB().finally(() => process.exit(1));
  });
