import { Router } from "express";
import { Notification } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../access-control.js";

const router = Router();
router.use(requireAuth, requirePermission("notifications.view"));

router.get("/unread-count", async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const count = await Notification.countDocuments({ userId: me.uid, read: false });
  res.json({ count });
});

router.get("/", async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const rows = await Notification.find({ userId: me.uid })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(
    rows.map((r) => ({
      id: r.id || r._id.toString(),
      message: r.message,
      link: r.link,
      read: r.read,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/mark-read", async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  await Notification.updateMany({ userId: me.uid, read: false }, { $set: { read: true } });
  res.json({ ok: true });
});

export default router;
