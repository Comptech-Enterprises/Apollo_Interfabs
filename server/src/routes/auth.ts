import { Router } from "express";
import bcrypt from "bcryptjs";
import { User, AuditLog } from "../models/index.js";
import { signSession, requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { getRolePermissions, hasPermission } from "../access-control.js";
import { passwordSchema, zodMessage } from "../validation.js";

const router = Router();

const attempts = new Map<string, { n: number; first: number }>();
const WINDOW = 60 * 1000;

function tooMany(key: string) {
  const a = attempts.get(key);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW) {
    attempts.delete(key);
    return false;
  }
  return a.n >= 5;
}

function fail(key: string) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > WINDOW) attempts.set(key, { n: 1, first: Date.now() });
  else a.n++;
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ ok: false, message: "Enter your username and password." });
    return;
  }

  const key = String(username).trim().toLowerCase();
  const compactKey = key.replace(/\s+/g, "");
  if (tooMany(key)) {
    res.status(429).json({ ok: false, message: "Too many failed attempts. Please wait 1 minute." });
    return;
  }

  const orQuery: Record<string, string>[] = [{ username: key }, { email: key }];
  if (compactKey !== key) {
    orQuery.push({ username: compactKey });
  }
  const user = await User.findOne({ $or: orQuery });
  const valid = user && user.active && (await bcrypt.compare(String(password), user.passwordHash));
  if (!user || !valid) {
    fail(key);
    res.status(401).json({ ok: false, message: "Incorrect username or password." });
    return;
  }

  attempts.delete(key);
  const permissions = await getRolePermissions(user.role);
  const token = await signSession({
    uid: user.id || user._id.toString(),
    name: user.name,
    role: user.role,
    warehouses: user.warehouses,
  });
  res.json({
    ok: true,
    token,
    user: { name: user.name, role: user.role, mustChangePassword: user.mustChangePassword, permissions },
  });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  if (!(await hasPermission(me.role, "account.changePassword"))) {
    res.status(403).json({ ok: false, message: "Password changes are disabled for your role." });
    return;
  }
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, ...zodMessage(parsed.error) });
    return;
  }

  const user = await User.findById(me.uid);
  if (!user) {
    res.status(404).json({ ok: false, message: "User not found." });
    return;
  }

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    res.status(400).json({
      ok: false,
      message: "Your current password is incorrect.",
      fields: { currentPassword: "Incorrect password" },
    });
    return;
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    res.status(400).json({
      ok: false,
      message: "Choose a different password.",
      fields: { newPassword: "Must be different" },
    });
    return;
  }

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  user.mustChangePassword = false;
  await user.save();

  await AuditLog.create({
    actorId: me.uid,
    action: "PASSWORD_CHANGED",
    entity: "User",
    entityId: me.uid,
  });

  res.json({ ok: true, message: "Password updated." });
});

export default router;
