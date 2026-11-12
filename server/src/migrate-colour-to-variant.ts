import mongoose from "mongoose";
import { connectDB } from "./db.js";

async function migrate() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No DB connection");

  const skuCol = db.collection("Sku");
  const result = await skuCol.updateMany(
    { colour: { $exists: true } },
    [
      {
        $set: {
          variant: { $ifNull: ["$variant", "$colour"] },
          itemCode: { $ifNull: ["$itemCode", "$code"] },
        },
      },
    ]
  );
  console.log(`Updated ${result.modifiedCount} SKU documents (colour -> variant, added itemCode).`);

  process.exit(0);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
