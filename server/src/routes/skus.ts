import { Router } from "express";
import { Sku, PriceChange, AuditLog, User, Notification, withTransaction } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { skuSchema, zodMessage } from "../validation.js";

const router = Router();
router.use(requireAuth);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const q = String(req.query.q ?? "").trim();
  const filter: Record<string, any> = {};

  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean);
    filter.$and = tokens.map((token: string) => {
      const regex = new RegExp(escapeRegex(token), "i");
      return {
        $or: [
          { code: regex },
          { fabricName: regex },
          { fabricType: regex },
          { colour: regex },
          { pattern: regex },
          { otherIdentifiers: regex },
        ],
      };
    });
  }

  if (me.warehouses && me.warehouses.length > 0) {
    filter.warehouse = { $in: me.warehouses };
  }
  if (me.role !== "OWNER") {
    filter.active = true;
  }
  if (me.role === "SALES") {
    filter.sellingPricePerMetre = { $gt: 0 };
  }

  const skus = await Sku.find(filter).sort({ code: 1 }).limit(500);
  res.json(
    skus.map((s) => ({
      id: s.id || s._id.toString(),
      code: s.code,
      fabricName: s.fabricName,
      fabricType: s.fabricType,
      colour: s.colour,
      pattern: s.pattern,
      otherIdentifiers: s.otherIdentifiers,
      warehouse: s.warehouse,
      currentStock: Number(s.currentStock),
      lowStockThreshold: Number(s.lowStockThreshold),
      active: s.active,
      sellingPricePerMetre: Number(s.sellingPricePerMetre),
    }))
  );
});

router.get("/facets", async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const filter: Record<string, any> = {};
  if (me.warehouses && me.warehouses.length > 0) {
    filter.warehouse = { $in: me.warehouses };
  }
  if (me.role !== "OWNER") {
    filter.active = true;
  }
  if (me.role === "SALES") {
    filter.sellingPricePerMetre = { $gt: 0 };
  }

  const [types, colours, patterns] = await Promise.all([
    Sku.distinct("fabricType", filter),
    Sku.distinct("colour", filter),
    Sku.distinct("pattern", filter),
  ]);

  res.json({
    types: (types as string[]).filter(Boolean).sort(),
    colours: (colours as string[]).filter(Boolean).sort(),
    patterns: (patterns as string[]).filter((p): p is string => Boolean(p)).sort(),
  });
});

router.get("/:id", async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
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

  const result = s.toJSON() as unknown as Record<string, unknown>;
  if (me.role !== "OWNER") {
    delete result.sellingPricePerMetre;
    result.prices = [];
  }
  res.json(result);
});

router.post("/", requireRole("OWNER", "MANAGER"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = skuSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  try {
    const sku = await withTransaction(async (session) => {
      const created = new Sku({
        ...p.data,
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

      const owners = await User.find({ role: "OWNER", active: true }).select("_id").session(session || null);
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

router.put("/:id", requireRole("OWNER", "MANAGER"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = skuSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  const skuId = String(req.params.id);

  try {
    await withTransaction(async (session) => {
      const old = await Sku.findById(skuId).session(session || null);
      if (!old) throw new Error("NOT_FOUND");

      const updateData = { ...p.data };
      if (me.role === "MANAGER") {
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

router.patch("/:id/active", requireRole("OWNER", "MANAGER"), async (req, res) => {
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
