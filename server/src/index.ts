import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import skuRoutes from "./routes/skus.js";
import stockRoutes from "./routes/stock.js";
import poRoutes from "./routes/purchase-orders.js";
import notificationRoutes from "./routes/notifications.js";
import userRoutes from "./routes/users.js";

const app = express();
const PORT = Number(process.env.API_PORT) || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/skus", skuRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/po", poRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ ok: false, message: "Internal server error" });
});

async function start() {
  try {
    await connectDB();
    console.log("Connected to MongoDB via Mongoose.");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }

  app.listen(PORT, () => {
    console.log(`Apollo API running on http://localhost:${PORT}`);
  });
}

start();
