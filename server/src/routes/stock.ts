import { Router } from "express";
import { Sku, StockIn, Sale, AuditLog, withTransaction } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { stockInSchema, saleSchema, voidSchema, updateQualitySchema, zodMessage } from "../validation.js";

const router = Router();
router.use(requireAuth);

function toDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatMetres(v: unknown): string {
  return `${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
}

router.post("/stock-in", requireRole("OWNER", "MANAGER"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = stockInSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }
  const d = p.data;

  try {
    const sku = await withTransaction(async (session) => {
      const s = await Sku.findById(d.skuId).session(session || null);
      if (!s) throw new Error("SKU not found.");

      await StockIn.create(
        [
          {
            skuId: s._id,
            supplierName: d.supplierName,
            quantityMetres: d.quantityMetres,
            purchaseDate: toDateOnly(d.purchaseDate),
            costPricePerMetre: d.costPricePerMetre,
            qualityStatus: "PENDING",
            createdById: me.uid,
          },
        ],
        { session }
      );

      const updated = await Sku.findByIdAndUpdate(
        d.skuId,
        { $inc: { currentStock: d.quantityMetres } },
        { returnDocument: "after", session: session || null }
      );
      return updated!;
    });

    res.status(201).json({
      ok: true,
      message: `Stock recorded. ${sku.code} now has ${formatMetres(sku.currentStock)}.`,
    });
  } catch (e) {
    if (e instanceof Error) {
      res.status(400).json({ ok: false, message: e.message });
      return;
    }
    throw e;
  }
});

router.post("/sale", async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = saleSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }
  const d = p.data;

  try {
    const result = await withTransaction(async (session) => {
      const sku = await Sku.findById(d.skuId).session(session || null);
      if (!sku) throw new Error("SKU not found.");
      if (!sku.active) throw new Error("This SKU is inactive and cannot be sold.");

      const upd = await Sku.findOneAndUpdate(
        { _id: d.skuId, active: true, currentStock: { $gte: d.quantityMetres } },
        { $inc: { currentStock: -d.quantityMetres } },
        { returnDocument: "after", session: session || null }
      );

      if (!upd) {
        const fresh = await Sku.findById(d.skuId).session(session || null);
        throw new Error(`Only ${formatMetres(fresh?.currentStock ?? 0)} available for ${sku.code}.`);
      }

      await Sale.create(
        [
          {
            skuId: sku._id,
            quantityMetres: d.quantityMetres,
            pricePerMetre: sku.sellingPricePerMetre,
            soldPricePerMetre: d.soldPricePerMetre,
            saleDate: toDateOnly(d.saleDate),
            buyerName: d.buyerName,
            createdById: me.uid,
          },
        ],
        { session }
      );

      return upd;
    });

    res.status(201).json({
      ok: true,
      message: `Sale recorded. ${result.code} now has ${formatMetres(result.currentStock)} left.`,
    });
  } catch (e) {
    if (e instanceof Error) {
      res.status(400).json({ ok: false, message: e.message });
      return;
    }
    throw e;
  }
});

router.post("/void-sale", requireRole("OWNER"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = voidSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  try {
    await withTransaction(async (session) => {
      const sale = await Sale.findById(p.data.id).session(session || null);
      if (!sale) throw new Error("Sale not found.");
      if (sale.voidedAt) throw new Error("This sale has already been voided.");

      sale.voidedAt = new Date();
      sale.voidedById = me.uid as any;
      sale.voidReason = p.data.reason;
      await sale.save({ session });

      await Sku.findByIdAndUpdate(
        sale.skuId,
        { $inc: { currentStock: sale.quantityMetres } },
        { session: session || null }
      );

      await AuditLog.create(
        [
          {
            actorId: me.uid,
            action: "SALE_VOIDED",
            entity: "Sale",
            entityId: sale.id || sale._id.toString(),
            details: { reason: p.data.reason },
          },
        ],
        { session }
      );
    });

    res.json({ ok: true, message: "Sale voided and stock restored." });
  } catch (e) {
    if (e instanceof Error) {
      res.status(400).json({ ok: false, message: e.message });
      return;
    }
    throw e;
  }
});

router.patch("/stockin/:id/quality", requireRole("OWNER", "MANAGER"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = updateQualitySchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  try {
    const si = await StockIn.findById(req.params.id);
    if (!si) {
      res.status(404).json({ ok: false, message: "Purchase entry not found." });
      return;
    }

    const prevStatus = si.qualityStatus;
    si.qualityStatus = p.data.qualityStatus;
    si.qualityReviewedById = me.uid as any;
    si.qualityReviewedAt = new Date();
    if (p.data.notes !== undefined) {
      si.qualityNotes = p.data.notes;
    }
    await si.save();

    await AuditLog.create([
      {
        actorId: me.uid,
        action: "STOCKIN_QUALITY_UPDATED",
        entity: "StockIn",
        entityId: si.id || si._id.toString(),
        details: { previous: prevStatus, current: p.data.qualityStatus, notes: p.data.notes },
      },
    ]);

    res.json({
      ok: true,
      message: `Quality status updated to ${p.data.qualityStatus}.`,
      qualityStatus: si.qualityStatus,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e.message || "Failed to update quality status" });
  }
});

router.post("/void-stockin", requireRole("OWNER", "MANAGER"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const p = voidSchema.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ ok: false, ...zodMessage(p.error) });
    return;
  }

  try {
    await withTransaction(async (session) => {
      const si = await StockIn.findById(p.data.id).session(session || null);
      if (!si) throw new Error("Purchase entry not found.");
      if (si.voidedAt) throw new Error("This entry has already been voided.");

      const upd = await Sku.findOneAndUpdate(
        { _id: si.skuId, currentStock: { $gte: si.quantityMetres } },
        { $inc: { currentStock: -si.quantityMetres } },
        { returnDocument: "after", session: session || null }
      );
      if (!upd) throw new Error("Cannot void: part of this stock has already been sold.");

      si.voidedAt = new Date();
      si.voidedById = me.uid as any;
      si.voidReason = p.data.reason;
      await si.save({ session });

      await AuditLog.create(
        [
          {
            actorId: me.uid,
            action: "STOCKIN_VOIDED",
            entity: "StockIn",
            entityId: si.id || si._id.toString(),
            details: { reason: p.data.reason },
          },
        ],
        { session }
      );
    });

    res.json({ ok: true, message: "Purchase entry voided and stock reduced." });
  } catch (e) {
    if (e instanceof Error) {
      res.status(400).json({ ok: false, message: e.message });
      return;
    }
    throw e;
  }
});

router.get("/sales", requireRole("OWNER"), async (req, res) => {
  const { sku, buyer, from, to } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const PAGE = 25;
  const filter: Record<string, any> = { voidedAt: null };

  if (sku && sku !== "all") filter.skuId = sku;
  if (buyer) filter.buyerName = new RegExp(escapeRegex(String(buyer)), "i");
  if (from || to) {
    filter.saleDate = {};
    if (from) filter.saleDate.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.saleDate.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const [rows, count] = await Promise.all([
    Sale.find(filter)
      .sort({ saleDate: -1, createdAt: -1 })
      .populate({ path: "sku", select: "code" })
      .skip((page - 1) * PAGE)
      .limit(PAGE),
    Sale.countDocuments(filter),
  ]);

  res.json({ rows, count, page, pages: Math.ceil(count / PAGE) });
});

router.get("/purchases", requireRole("OWNER", "MANAGER"), async (req, res) => {
  const me = (req as unknown as AuthenticatedRequest).user;
  const { sku, supplier, quality, from, to } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const PAGE = 25;
  const filter: Record<string, any> = {};

  if (sku && sku !== "all") filter.skuId = sku;
  if (supplier) filter.supplierName = new RegExp(escapeRegex(String(supplier)), "i");
  if (quality) filter.qualityStatus = quality;
  if (from || to) {
    filter.purchaseDate = {};
    if (from) filter.purchaseDate.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.purchaseDate.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  if (me.warehouses && me.warehouses.length > 0) {
    const warehouseSkus = await Sku.find({ warehouse: { $in: me.warehouses } }).select("_id").lean();
    if (filter.skuId) {
      // intersect if already set
      const ids = warehouseSkus.map((s) => String(s._id));
      if (!ids.includes(String(filter.skuId))) {
        filter.skuId = { $in: [] };
      }
    } else {
      filter.skuId = { $in: warehouseSkus.map((s) => s._id) };
    }
  }

  const [rows, count] = await Promise.all([
    StockIn.find(filter)
      .sort({ purchaseDate: -1, createdAt: -1 })
      .populate({ path: "sku", select: "code warehouse fabricName" })
      .skip((page - 1) * PAGE)
      .limit(PAGE),
    StockIn.countDocuments(filter),
  ]);

  res.json({ rows, count, page, pages: Math.ceil(count / PAGE) });
});

export default router;
