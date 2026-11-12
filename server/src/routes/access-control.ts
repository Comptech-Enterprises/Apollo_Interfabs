import { Router } from "express";
import { AccessControl, AuditLog } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  ALL_PERMISSION_KEYS,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  getAllRolePermissions,
  getRolePermissions,
  invalidateAccessControlCache,
  type ConfigurableRole,
  type PermissionKey,
} from "../access-control.js";

const router = Router();
router.use(requireAuth);

const ROLE_LABELS: Record<ConfigurableRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  SALES: "Sales",
};

function isConfigurableRole(value: string): value is ConfigurableRole {
  return (CONFIGURABLE_ROLES as string[]).includes(value);
}

router.get("/my-permissions", async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const permissions = await getRolePermissions(me.role);
  res.json({ ok: true, role: me.role, permissions });
});

router.get("/", requireRole("SUPER_ADMIN"), async (_req, res) => {
  const roles = await getAllRolePermissions();
  res.json({
    ok: true,
    catalog: PERMISSION_CATALOG,
    defaults: DEFAULT_ROLE_PERMISSIONS,
    roles,
  });
});

router.put("/:role", requireRole("SUPER_ADMIN"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const rawRole = String(req.params.role || "").toUpperCase();

  if (rawRole === "SUPER_ADMIN") {
    res.status(400).json({ ok: false, message: "Super Admin always retains full access." });
    return;
  }

  if (!isConfigurableRole(rawRole)) {
    res.status(400).json({ ok: false, message: "Invalid role." });
    return;
  }

  const incoming = req.body?.permissions;
  if (!incoming || typeof incoming !== "object") {
    res.status(400).json({ ok: false, message: "Permissions object is required." });
    return;
  }

  const sanitized: Record<PermissionKey, boolean> = {
    ...DEFAULT_ROLE_PERMISSIONS[rawRole],
  };

  for (const key of ALL_PERMISSION_KEYS) {
    if (key in incoming) {
      sanitized[key] = Boolean(incoming[key]);
    }
  }

  await AccessControl.findOneAndUpdate(
    { role: rawRole },
    {
      $set: {
        role: rawRole,
        permissions: sanitized,
        updatedById: me.uid,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  invalidateAccessControlCache();

  await AuditLog.create({
    actorId: me.uid,
    action: "ACCESS_CONTROL_UPDATED",
    entity: "AccessControl",
    entityId: rawRole,
    details: { permissions: sanitized },
  });

  const roles = await getAllRolePermissions();
  res.json({
    ok: true,
    message: `Permissions updated for ${ROLE_LABELS[rawRole]}.`,
    roles,
  });
});

router.post("/reset", requireRole("SUPER_ADMIN"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const rawRole = req.body?.role ? String(req.body.role).toUpperCase() : null;

  if (rawRole && !isConfigurableRole(rawRole)) {
    res.status(400).json({ ok: false, message: "Only Owner, Manager, or Sales defaults can be reset." });
    return;
  }

  const targetRole: ConfigurableRole | null = rawRole && isConfigurableRole(rawRole) ? rawRole : null;

  if (targetRole) {
    await AccessControl.deleteOne({ role: targetRole });
  } else {
    await AccessControl.deleteMany({ role: { $in: CONFIGURABLE_ROLES } });
  }

  invalidateAccessControlCache();

  await AuditLog.create({
    actorId: me.uid,
    action: "ACCESS_CONTROL_RESET",
    entity: "AccessControl",
    entityId: targetRole || "ALL",
  });

  const roles = await getAllRolePermissions();
  res.json({
    ok: true,
    message: targetRole
      ? `Reset ${ROLE_LABELS[targetRole]} permissions to defaults.`
      : "Reset all role permissions to defaults.",
    roles,
  });
});

export default router;
