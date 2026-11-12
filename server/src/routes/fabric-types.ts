import { Router } from "express";
import { FabricType } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../access-control.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  requirePermission("fabricTypes.view", "purchases.create", "inventory.createSku", "inventory.editSku"),
  async (_req, res) => {
    const types = await FabricType.find({ active: true }).sort({ name: 1 });
    res.json(types);
  }
);

router.get("/all", requirePermission("fabricTypes.view"), async (_req, res) => {
  const types = await FabricType.find().sort({ name: 1 });
  res.json(types);
});

router.post("/", requirePermission("fabricTypes.create"), async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  if (!name) {
    res.status(400).json({ ok: false, message: "Name is required." });
    return;
  }
  const exists = await FabricType.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (exists) {
    res.status(409).json({ ok: false, message: "Fabric type already exists." });
    return;
  }
  const ft = await FabricType.create({ name });
  res.status(201).json({ ok: true, message: `Fabric type "${ft.name}" created.`, fabricType: ft });
});

router.put("/:id", requirePermission("fabricTypes.edit"), async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  if (!name) {
    res.status(400).json({ ok: false, message: "Name is required." });
    return;
  }
  const dup = await FabricType.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") }, _id: { $ne: req.params.id } });
  if (dup) {
    res.status(409).json({ ok: false, message: "Fabric type already exists." });
    return;
  }
  const ft = await FabricType.findByIdAndUpdate(req.params.id, { name }, { new: true });
  if (!ft) {
    res.status(404).json({ ok: false, message: "Not found." });
    return;
  }
  res.json({ ok: true, message: `Renamed to "${ft.name}".` });
});

router.patch("/:id/active", requirePermission("fabricTypes.edit"), async (req, res) => {
  const active = Boolean(req.body.active);
  const ft = await FabricType.findByIdAndUpdate(req.params.id, { active }, { new: true });
  if (!ft) {
    res.status(404).json({ ok: false, message: "Not found." });
    return;
  }
  res.json({ ok: true, message: active ? "Activated." : "Deactivated." });
});

export default router;
