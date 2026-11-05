"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { actionUser, UserError } from "@/lib/auth";
import { purchaseOrderSchema, zodMessage } from "@/lib/validation";
import type { ActionResult } from "@/lib/result";

function handle(e: unknown): ActionResult {
  if (e instanceof UserError) return { ok: false, message: e.message };
  console.error(e);
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function createPurchaseOrderAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser();
    const p = purchaseOrderSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return { ok: false, ...zodMessage(p.error) };
    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.create({
        data: {
          companyName: p.data.companyName,
          quantity: p.data.quantity,
          description: p.data.description,
          createdById: me.uid,
        },
      });
      const owners = await tx.user.findMany({ where: { role: "OWNER", active: true }, select: { id: true } });
      if (owners.length > 0) {
        await tx.notification.createMany({
          data: owners.map((o) => ({
            userId: o.id,
            message: `New PO: ${p.data.companyName} — ${p.data.quantity}m by ${me.name}`,
            link: "/po",
          })),
        });
      }
    });
    revalidatePath("/po");
    return { ok: true, message: "PO submitted." };
  } catch (e) {
    return handle(e);
  }
}
