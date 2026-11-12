import { Router } from "express";
import bcrypt from "bcryptjs";
import { User, AuditLog } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../access-control.js";
import { userSchema, zodMessage } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("users.view"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const filter = me.role === "SUPER_ADMIN" ? {} : { role: { $ne: "SUPER_ADMIN" as const } };
  const users = await User.find(filter)
    .select("id name username email role active warehouses createdAt")
    .sort({ name: 1 });
  res.json(users);
});

router.post("/", requirePermission("users.create"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = userSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  try {
    const u = await User.create({
      name: p.data.name,
      username: p.data.username,
      email: p.data.email,
      role: p.data.role,
      passwordHash: await bcrypt.hash(p.data.password, 12),
      mustChangePassword: true,
    });
    await AuditLog.create({
      actorId: me.uid,
      action: "USER_CREATED",
      entity: "User",
      entityId: u.id || u._id.toString(),
    });
    res.status(201).json({ ok: true, message: `User ${u.name} created.` });
  } catch (e: unknown) {
    if (e && typeof e === "object" && (e as any).code === 11000) {
      const keyPattern = (e as any).keyPattern || {};
      if (keyPattern.username) {
        res.status(409).json({
          ok: false,
          message: "A user with that username already exists.",
          fields: { username: "Already in use" },
        });
        return;
      }
      res.status(409).json({
        ok: false,
        message: "A user with that email already exists.",
        fields: { email: "Already in use" },
      });
      return;
    }
    throw e;
  }
});

router.post("/:id/reset-password", requirePermission("users.resetPassword"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const { password } = req.body;
  if (!password || String(password).length < 8) {
    res.status(400).json({ ok: false, message: "Password must be at least 8 characters." });
    return;
  }

  const userId = String(req.params.id);
  const target = await User.findById(userId);
  if (!target) {
    res.status(404).json({ ok: false, message: "User not found." });
    return;
  }
  if (target.role === "SUPER_ADMIN" && me.role !== "SUPER_ADMIN") {
    res.status(403).json({ ok: false, message: "Forbidden." });
    return;
  }
  await User.findByIdAndUpdate(userId, {
    $set: {
      passwordHash: await bcrypt.hash(String(password), 12),
      mustChangePassword: true,
    },
  });
  await AuditLog.create({
    actorId: me.uid,
    action: "PASSWORD_RESET",
    entity: "User",
    entityId: userId,
  });
  res.json({ ok: true, message: "Password reset." });
});

router.patch("/:id/active", requirePermission("users.toggleActive"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const active = Boolean(req.body.active);
  const userId = String(req.params.id);

  if (userId === me.uid && !active) {
    res.status(400).json({ ok: false, message: "You cannot deactivate your own account." });
    return;
  }

  const target = await User.findById(userId);
  if (!target) {
    res.status(404).json({ ok: false, message: "User not found." });
    return;
  }
  if (target.role === "SUPER_ADMIN" && me.role !== "SUPER_ADMIN") {
    res.status(403).json({ ok: false, message: "Forbidden." });
    return;
  }

  if (!active) {
    if (target.role === "SUPER_ADMIN") {
      const others = await User.countDocuments({ role: "SUPER_ADMIN", active: true, _id: { $ne: userId } });
      if (others === 0) {
        res.status(400).json({ ok: false, message: "At least one active super admin is required." });
        return;
      }
    }
    if (target.role === "OWNER") {
      const others = await User.countDocuments({ role: "OWNER", active: true, _id: { $ne: userId } });
      if (others === 0) {
        res.status(400).json({ ok: false, message: "At least one active owner is required." });
        return;
      }
    }
  }

  await User.findByIdAndUpdate(userId, { $set: { active } });
  await AuditLog.create({
    actorId: me.uid,
    action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entity: "User",
    entityId: userId,
  });
  res.json({ ok: true, message: active ? "User activated." : "User deactivated." });
});

export default router;
