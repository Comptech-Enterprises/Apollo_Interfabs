"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { actionUser, UserError } from "@/lib/auth";
import { userSchema, zodMessage } from "@/lib/validation";
import type { ActionResult } from "@/lib/result";

function handle(e: unknown): ActionResult {
  if (e instanceof UserError) return { ok: false, message: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    return { ok: false, message: "A user with that email already exists.", fields: { email: "Already in use" } };
  console.error(e);
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function createUserAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser("MANAGER");
    const p = userSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return { ok: false, ...zodMessage(p.error) };
    const u = await prisma.user.create({
      data: {
        name: p.data.name,
        username: p.data.username,
        email: p.data.email,
        role: p.data.role,
        passwordHash: await bcrypt.hash(p.data.password, 12),
        mustChangePassword: true,
      },
    });
    await prisma.auditLog.create({ data: { actorId: me.uid, action: "USER_CREATED", entity: "User", entityId: u.id } });
    revalidatePath("/users");
    return { ok: true, message: `User ${u.name} created. They must change the password at first sign-in.` };
  } catch (e) {
    return handle(e);
  }
}

export async function resetPasswordAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser("MANAGER");
    const id = String(fd.get("id") ?? "");
    const password = String(fd.get("password") ?? "");
    if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters." };
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true },
    });
    await prisma.auditLog.create({ data: { actorId: me.uid, action: "PASSWORD_RESET", entity: "User", entityId: id } });
    return { ok: true, message: "Password reset. The user must change it at next sign-in." };
  } catch (e) {
    return handle(e);
  }
}

export async function setUserActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const me = await actionUser("MANAGER");
    if (id === me.uid && !active) return { ok: false, message: "You cannot deactivate your own account." };
    if (!active) {
      const u = await prisma.user.findUnique({ where: { id } });
      if (u?.role === "MANAGER") {
        const others = await prisma.user.count({ where: { role: "MANAGER", active: true, id: { not: id } } });
        if (others === 0) return { ok: false, message: "At least one active manager is required." };
      }
    }
    await prisma.user.update({ where: { id }, data: { active } });
    await prisma.auditLog.create({ data: { actorId: me.uid, action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED", entity: "User", entityId: id } });
    revalidatePath("/users");
    return { ok: true, message: active ? "User activated." : "User deactivated." };
  } catch (e) {
    return handle(e);
  }
}
