"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { actionUser, UserError } from "@/lib/auth";
import { saleSchema, stockInSchema, voidSchema, zodMessage } from "@/lib/validation";
import { formatMetres, toDateOnly } from "@/lib/format";
import type { ActionResult } from "@/lib/result";

function handle(e: unknown): ActionResult {
  if (e instanceof UserError) return { ok: false, message: e.message };
  console.error(e);
  return { ok: false, message: "Something went wrong. Please try again." };
}

function refresh(skuId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/skus");
  revalidatePath(`/skus/${skuId}`);
  revalidatePath("/purchases");
  revalidatePath("/sales");
  revalidatePath("/sales/new");
}

export async function recordStockInAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser("MANAGER");
    const p = stockInSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return { ok: false, ...zodMessage(p.error) };
    const d = p.data;
    const sku = await prisma.$transaction(async (tx) => {
      const s = await tx.sku.findUnique({ where: { id: d.skuId } });
      if (!s) throw new UserError("SKU not found.");
      await tx.stockIn.create({
        data: {
          skuId: d.skuId,
          supplierName: d.supplierName,
          quantityMetres: d.quantityMetres,
          purchaseDate: toDateOnly(d.purchaseDate),
          costPricePerMetre: d.costPricePerMetre,
          createdById: me.uid,
        },
      });
      return tx.sku.update({ where: { id: d.skuId }, data: { currentStock: { increment: d.quantityMetres } } });
    });
    refresh(d.skuId);
    return { ok: true, message: `Stock recorded. ${sku.code} now has ${formatMetres(sku.currentStock)}.` };
  } catch (e) {
    return handle(e);
  }
}

export async function recordSaleAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser();
    // The price is never read from the form: it always comes from the SKU.
    const p = saleSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return { ok: false, ...zodMessage(p.error) };
    const d = p.data;
    const result = await prisma.$transaction(async (tx) => {
      const sku = await tx.sku.findUnique({ where: { id: d.skuId } });
      if (!sku) throw new UserError("SKU not found.");
      if (!sku.active) throw new UserError("This SKU is inactive and cannot be sold.");
      // Conditional decrement: cannot oversell even with simultaneous sales.
      const upd = await tx.sku.updateMany({
        where: { id: d.skuId, active: true, currentStock: { gte: d.quantityMetres } },
        data: { currentStock: { decrement: d.quantityMetres } },
      });
      if (upd.count === 0) {
        const fresh = await tx.sku.findUniqueOrThrow({ where: { id: d.skuId } });
        throw new UserError(`Only ${formatMetres(fresh.currentStock)} available for ${sku.code}.`);
      }
      await tx.sale.create({
        data: {
          skuId: d.skuId,
          quantityMetres: d.quantityMetres,
          pricePerMetre: sku.sellingPricePerMetre,
          saleDate: toDateOnly(d.saleDate),
          buyerName: d.buyerName,
          createdById: me.uid,
        },
      });
      return tx.sku.findUniqueOrThrow({ where: { id: d.skuId } });
    });
    refresh(d.skuId);
    return { ok: true, message: `Sale recorded. ${result.code} now has ${formatMetres(result.currentStock)} left.` };
  } catch (e) {
    return handle(e);
  }
}

export async function voidSaleAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser("MANAGER");
    const p = voidSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return { ok: false, ...zodMessage(p.error) };
    const skuId = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: p.data.id } });
      if (!sale) throw new UserError("Sale not found.");
      if (sale.voidedAt) throw new UserError("This sale has already been voided.");
      await tx.sale.update({
        where: { id: sale.id },
        data: { voidedAt: new Date(), voidedById: me.uid, voidReason: p.data.reason },
      });
      await tx.sku.update({ where: { id: sale.skuId }, data: { currentStock: { increment: sale.quantityMetres } } });
      await tx.auditLog.create({ data: { actorId: me.uid, action: "SALE_VOIDED", entity: "Sale", entityId: sale.id, details: { reason: p.data.reason } } });
      return sale.skuId;
    });
    refresh(skuId);
    return { ok: true, message: "Sale voided and stock restored." };
  } catch (e) {
    return handle(e);
  }
}

export async function voidStockInAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser("MANAGER");
    const p = voidSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return { ok: false, ...zodMessage(p.error) };
    const skuId = await prisma.$transaction(async (tx) => {
      const si = await tx.stockIn.findUnique({ where: { id: p.data.id } });
      if (!si) throw new UserError("Purchase entry not found.");
      if (si.voidedAt) throw new UserError("This entry has already been voided.");
      // Reverse only if the stock is still there; otherwise the balance would go negative.
      const upd = await tx.sku.updateMany({
        where: { id: si.skuId, currentStock: { gte: si.quantityMetres } },
        data: { currentStock: { decrement: si.quantityMetres } },
      });
      if (upd.count === 0)
        throw new UserError("Cannot void: part of this stock has already been sold. Void the related sales first.");
      await tx.stockIn.update({
        where: { id: si.id },
        data: { voidedAt: new Date(), voidedById: me.uid, voidReason: p.data.reason },
      });
      await tx.auditLog.create({ data: { actorId: me.uid, action: "STOCKIN_VOIDED", entity: "StockIn", entityId: si.id, details: { reason: p.data.reason } } });
      return si.skuId;
    });
    refresh(skuId);
    return { ok: true, message: "Purchase entry voided and stock reduced." };
  } catch (e) {
    return handle(e);
  }
}
