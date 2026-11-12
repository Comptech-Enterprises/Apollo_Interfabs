import { Router } from "express";
import { PurchaseOrder, User, Notification } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { hasPermission, requirePermission } from "../access-control.js";
import { purchaseOrderSchema, poReviewSchema, zodMessage } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("po.view"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const page = Math.max(1, Number(req.query.page) || 1);
  const status = req.query.status as string | undefined;
  const PAGE = 25;

  const filter: Record<string, any> = {};

  if (!(await hasPermission(me.role, "po.viewAllUsers"))) {
    filter.createdById = me.uid;
  }

  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    filter.status = status;
  }

  const [rows, count, users] = await Promise.all([
    PurchaseOrder.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE),
    PurchaseOrder.countDocuments(filter),
    User.find().select("_id name"),
  ]);

  const userMap = new Map(users.map((u) => [String(u._id), u.name]));
  res.json({
    rows: rows.map((r) => ({
      ...r.toJSON(),
      createdByName: userMap.get(String(r.createdById)) ?? "Unknown",
      reviewedByName: r.reviewedById ? (userMap.get(String(r.reviewedById)) ?? "Unknown") : null,
    })),
    count,
    page,
    pages: Math.ceil(count / PAGE),
  });
});

router.post("/", requirePermission("po.create"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = purchaseOrderSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  const po = await PurchaseOrder.create({
    itemName: p.data.itemName,
    quantity: p.data.quantity,
    customerName: p.data.customerName,
    description: p.data.description,
    status: "PENDING",
    createdById: me.uid,
  });

  const owners = await User.find({ role: { $in: ["OWNER", "SUPER_ADMIN"] }, active: true }).select("_id");
  if (owners.length > 0) {
    await Notification.insertMany(
      owners.map((o) => ({
        userId: o._id,
        message: `New PO request: ${p.data.itemName} — ${p.data.quantity}m for ${p.data.customerName} by ${me.name}`,
        link: "/po",
      }))
    );
  }

  res.status(201).json({ ok: true, message: "PO submitted for approval." });
});

router.patch("/:id/review", requirePermission("po.review"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = poReviewSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) {
    res.status(404).json({ ok: false, message: "PO not found." });
    return;
  }
  if (po.status !== "PENDING") {
    res.status(400).json({ ok: false, message: `PO already ${po.status.toLowerCase()}.` });
    return;
  }

  po.status = p.data.status;
  po.reviewedById = me.uid as any;
  po.reviewedAt = new Date();
  po.reviewNote = p.data.note || null;
  await po.save();

  const creatorNotif = {
    userId: po.createdById,
    message: `Your PO for ${po.itemName} (${po.quantity}m) has been ${p.data.status.toLowerCase()} by ${me.name}${p.data.note ? `: ${p.data.note}` : ""}`,
    link: "/po",
  };
  await Notification.create(creatorNotif);

  res.json({ ok: true, message: `PO ${p.data.status.toLowerCase()}.` });
});

export default router;
