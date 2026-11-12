import { connectDB, Sku, FabricType } from "./db.js";

async function seed() {
  await connectDB();
  const existing = await FabricType.countDocuments();
  if (existing > 0) {
    console.log(`Already ${existing} fabric types. Skipping seed.`);
    process.exit(0);
  }
  const types = (await Sku.distinct("fabricType")) as string[];
  const unique = [...new Set(types.filter(Boolean).map((t) => t.trim()))];
  if (unique.length === 0) {
    console.log("No fabric types found in SKUs.");
    process.exit(0);
  }
  await FabricType.insertMany(unique.map((name) => ({ name, active: true })));
  console.log(`Seeded ${unique.length} fabric types: ${unique.join(", ")}`);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
