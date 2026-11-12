import { Router } from "express";
import { Sku, PriceChange, AuditLog, User, Notification, withTransaction } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { getRolePermissions, hasPermission, requirePermission } from "../access-control.js";
import { skuSchema, zodMessage } from "../validation.js";

const router = Router();
router.use(requireAuth);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get(
  "/",
  requirePermission("inventory.view", "sales.create", "sales.view", "purchases.view"),
  async (req, res) => {
    const me = (req as unknown as AuthenticatedRequest).user;
    const perms = await getRolePermissions(me.role);
    const q = String(req.query.q ?? "").trim();
    const filter: Record<string, any> = {};

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      filter.$and = tokens.map((token: string) => {
        const escaped = escapeRegex(token);
        const flexPattern = escaped.replace(/[-]/g, "").split("").join("-?");
        const regex = new RegExp(flexPattern, "i");
        return {
          $or: [
            { code: regex },
            { fabricName: regex },
            { fabricType: regex },
            { variant: regex },
            { pattern: regex },
            { otherIdentifiers: regex },
          ],
        };
      });
    }

    if (me.warehouses && me.warehouses.length > 0) {
      filter.warehouse = { $in: me.warehouses };
    }
    if (!perms["inventory.viewInactive"]) {
      filter.active = true;
    }
    if (!perms["inventory.viewUnpriced"]) {
      filter.sellingPricePerMetre = { $gt: 0 };
    }

    const canViewPrices = Boolean(perms["inventory.viewPrices"]);
    const skus = await Sku.find(filter).sort({ code: 1 }).limit(500);
    res.json(
      skus.map((s) => ({
        id: s.id || s._id.toString(),
        code: s.code,
        itemCode: (s as any).itemCode || "",
        fabricName: s.fabricName,
        fabricType: s.fabricType,
        variant: s.variant,
        pattern: s.pattern,
        otherIdentifiers: s.otherIdentifiers,
        warehouse: s.warehouse,
        currentStock: Number(s.currentStock),
        lowStockThreshold: Number(s.lowStockThreshold),
        active: s.active,
        isPriced: Number(s.sellingPricePerMetre) > 0,
        ...(canViewPrices ? { sellingPricePerMetre: Number(s.sellingPricePerMetre) } : {}),
      }))
    );
  }
);

router.get(
  "/facets",
  requirePermission("inventory.view", "sales.create", "sales.view", "purchases.view"),
  async (req, res) => {
    const me = (req as unknown as AuthenticatedRequest).user;
    const perms = await getRolePermissions(me.role);
    const filter: Record<string, any> = {};
    if (me.warehouses && me.warehouses.length > 0) {
      filter.warehouse = { $in: me.warehouses };
    }
    if (!perms["inventory.viewInactive"]) {
      filter.active = true;
    }
    if (!perms["inventory.viewUnpriced"]) {
      filter.sellingPricePerMetre = { $gt: 0 };
    }

    const [types, variants, patterns] = await Promise.all([
      Sku.distinct("fabricType", filter),
      Sku.distinct("variant", filter),
      Sku.distinct("pattern", filter),
    ]);

    res.json({
      types: (types as string[]).filter(Boolean).sort(),
      variants: (variants as string[]).filter(Boolean).sort(),
      colours: (variants as string[]).filter(Boolean).sort(),
      patterns: (patterns as string[]).filter((p): p is string => Boolean(p)).sort(),
    });
  }
);

router.get("/:id", requirePermission("inventory.viewDetails", "inventory.editSku"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const perms = await getRolePermissions(me.role);
  const s = await Sku.findById(req.params.id)
    .populate({
      path: "stockIns",
      options: { sort: { purchaseDate: -1, createdAt: -1 } },
    })
    .populate({
      path: "sales",
      options: { sort: { saleDate: -1, createdAt: -1 }, limit: 50 },
    })
    .populate({
      path: "prices",
      options: { sort: { changedAt: -1 }, limit: 20 },
    });

  if (!s) {
    res.status(404).json({ ok: false, message: "SKU not found" });
    return;
  }

  const result = s.toJSON() as unknown as Record<string, any>;
  if (!perms["inventory.viewPrices"]) {
    delete result.sellingPricePerMetre;
  }
  if (!perms["inventory.viewPriceHistory"]) {
    result.prices = [];
  }
  if (!perms["purchases.view"]) {
    result.stockIns = [];
  } else if (!perms["purchases.viewCostPrice"] && Array.isArray(result.stockIns)) {
    result.stockIns = result.stockIns.map((si: any) => {
      const copy = { ...si };
      delete copy.costPricePerMetre;
      return copy;
    });
  }
  if (!perms["sales.view"]) {
    result.sales = [];
  }
  res.json(result);
});

router.post("/", requirePermission("inventory.createSku"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = skuSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  const canEditPrice = await hasPermission(me.role, "inventory.editSellingPrice");

  try {
    const sku = await withTransaction(async (session) => {
      const skuData = { ...p.data } as any;
      if (!skuData.itemCode) skuData.itemCode = skuData.code;
      if (!canEditPrice) {
        skuData.sellingPricePerMetre = 0;
      }
      const created = new Sku({
        ...skuData,
        createdById: me.uid,
      });
      await created.save({ session });

      await PriceChange.create(
        [
          {
            skuId: created._id,
            newPrice: created.sellingPricePerMetre,
            changedById: me.uid,
          },
        ],
        { session }
      );

      await AuditLog.create(
        [
          {
            actorId: me.uid,
            action: "SKU_CREATED",
            entity: "Sku",
            entityId: created.id || created._id.toString(),
            details: { code: created.code },
          },
        ],
        { session }
      );

      const owners = await User.find({ role: { $in: ["OWNER", "SUPER_ADMIN"] }, active: true }).select("_id").session(session || null);
      if (owners.length > 0) {
        await Notification.insertMany(
          owners.map((o) => ({
            userId: o._id,
            message: `New SKU: ${created.code} added by ${me.name}`,
            link: "/dashboard",
          })),
          { session }
        );
      }

      return created;
    });

    res.status(201).json({ ok: true, message: `SKU ${sku.code} created.`, sku });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as any).code === 11000) {
      res.status(409).json({ ok: false, message: "That SKU code already exists.", fields: { code: "Already in use" } });
      return;
    }
    throw e;
  }
});

router.put("/:id", requirePermission("inventory.editSku"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = skuSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  const skuId = String(req.params.id);
  const canEditPrice = await hasPermission(me.role, "inventory.editSellingPrice");

  try {
    await withTransaction(async (session) => {
      const old = await Sku.findById(skuId).session(session || null);
      if (!old) throw new Error("NOT_FOUND");

      const updateData = { ...p.data };
      if (!canEditPrice) {
        updateData.sellingPricePerMetre = Number(old.sellingPricePerMetre);
      }

      const priceChanged = Number(old.sellingPricePerMetre) !== Number(updateData.sellingPricePerMetre);

      Object.assign(old, updateData);
      await old.save({ session });

      if (priceChanged) {
        await PriceChange.create(
          [
            {
              skuId: old._id,
              oldPrice: old.sellingPricePerMetre,
              newPrice: updateData.sellingPricePerMetre,
              changedById: me.uid,
            },
          ],
          { session }
        );
      }

      await AuditLog.create(
        [
          {
            actorId: me.uid,
            action: "SKU_UPDATED",
            entity: "Sku",
            entityId: skuId,
          },
        ],
        { session }
      );
    });

    res.json({ ok: true, message: "SKU updated." });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      res.status(404).json({ ok: false, message: "SKU not found." });
      return;
    }
    if (e && typeof e === "object" && "code" in e && (e as any).code === 11000) {
      res.status(409).json({ ok: false, message: "That SKU code already exists.", fields: { code: "Already in use" } });
      return;
    }
    throw e;
  }
});

router.patch("/:id/active", requirePermission("inventory.toggleSkuStatus"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const active = Boolean(req.body.active);
  const skuId = String(req.params.id);

  await Sku.findByIdAndUpdate(skuId, { $set: { active } });
  await AuditLog.create({
    actorId: me.uid,
    action: active ? "SKU_ACTIVATED" : "SKU_DEACTIVATED",
    entity: "Sku",
    entityId: skuId,
  });

  res.json({ ok: true, message: active ? "SKU marked active." : "SKU marked inactive." });
});

export default router;
