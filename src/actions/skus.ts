"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { actionUser, UserError } from "@/lib/auth";
import { skuSchema, zodMessage } from "@/lib/validation";
import type { ActionResult } from "@/lib/result";

function handle(e: unknown): ActionResult {
  if (e instanceof UserError) return { ok: false, message: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    return { ok: false, message: "That SKU code already exists. Choose a different code.", fields: { code: "Already in use" } };
  console.error(e);
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function createSkuAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser("MANAGER");
    const p = skuSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return { ok: false, ...zodMessage(p.error) };
    const sku = await prisma.$transaction(async (tx) => {
      const s = await tx.sku.create({ data: { ...p.data, createdById: me.uid } });
      await tx.priceChange.create({ data: { skuId: s.id, newPrice: s.sellingPricePerMetre, changedById: me.uid } });
      await tx.auditLog.create({ data: { actorId: me.uid, action: "SKU_CREATED", entity: "Sku", entityId: s.id, details: { code: s.code } } });
      return s;
    });
    revalidatePath("/skus");
    revalidatePath("/dashboard");
    return { ok: true, message: `SKU ${sku.code} created. Next, record its stock-in.` };
  } catch (e) {
    return handle(e);
  }
}

export async function updateSkuAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser("MANAGER");
    const id = String(fd.get("id") ?? "");
    const p = skuSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return { ok: false, ...zodMessage(p.error) };
    await prisma.$transaction(async (tx) => {
      const old = await tx.sku.findUnique({ where: { id } });
      if (!old) throw new UserError("SKU not found.");
      await tx.sku.update({ where: { id }, data: p.data });
      if (Number(old.sellingPricePerMetre) !== p.data.sellingPricePerMetre)
        await tx.priceChange.create({
          data: { skuId: id, oldPrice: old.sellingPricePerMetre, newPrice: p.data.sellingPricePerMetre, changedById: me.uid },
        });
      await tx.auditLog.create({ data: { actorId: me.uid, action: "SKU_UPDATED", entity: "Sku", entityId: id } });
    });
    revalidatePath("/skus");
    revalidatePath(`/skus/${id}`);
    revalidatePath("/dashboard");
    return { ok: true, message: "SKU updated." };
  } catch (e) {
    return handle(e);
  }
}

export async function setSkuActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const me = await actionUser("MANAGER");
    await prisma.sku.update({ where: { id }, data: { active } });
    await prisma.auditLog.create({
      data: { actorId: me.uid, action: active ? "SKU_ACTIVATED" : "SKU_DEACTIVATED", entity: "Sku", entityId: id },
    });
    revalidatePath("/skus");
    revalidatePath(`/skus/${id}`);
    revalidatePath("/dashboard");
    return { ok: true, message: active ? "SKU marked active." : "SKU marked inactive." };
  } catch (e) {
    return handle(e);
  }
}
