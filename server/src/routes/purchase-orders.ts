import { Router } from "express";
import { PurchaseOrder, User, Notification, withTransaction } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { purchaseOrderSchema, zodMessage } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole("OWNER"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const PAGE = 25;

  const [rows, count, users] = await Promise.all([
    PurchaseOrder.find().sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE),
    PurchaseOrder.countDocuments(),
    User.find().select("_id name"),
  ]);

  const userMap = new Map(users.map((u) => [String(u._id), u.name]));
  res.json({
    rows: rows.map((r) => ({
      ...r.toJSON(),
      createdByName: userMap.get(String(r.createdById)) ?? "Unknown",
    })),
    count,
    page,
    pages: Math.ceil(count / PAGE),
  });
});

router.post("/", async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = purchaseOrderSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  const billFrom = p.data.billFrom || p.data.companyName || "Apollo Interfabs";
  const supplierName = p.data.supplierName || null;
  const poDate = p.data.poDate ? new Date(`${p.data.poDate}T00:00:00.000Z`) : new Date();

  await withTransaction(async (session) => {
    await PurchaseOrder.create(
      [
        {
          companyName: billFrom,
          billFrom,
          supplierName,
          poDate,
          quantity: p.data.quantity,
          description: p.data.description,
          skuId: p.data.skuId || undefined,
          skuCode: p.data.skuCode || undefined,
          itemName: p.data.itemName,
          createdById: me.uid,
        },
      ],
      { session }
    );

    const owners = await User.find({ role: "OWNER", active: true }).select("_id").session(session || null);
    if (owners.length > 0) {
      const suppInfo = supplierName ? ` | Supplier: ${supplierName}` : "";
      await Notification.insertMany(
        owners.map((o) => ({
          userId: o._id,
          message: `New PO: ${p.data.itemName} — ${p.data.quantity}m (Bill from: ${billFrom}${suppInfo}) by ${me.name}`,
          link: "/po",
        })),
        { session }
      );
    }
  });

  res.status(201).json({ ok: true, message: "PO submitted." });
});

export default router;
