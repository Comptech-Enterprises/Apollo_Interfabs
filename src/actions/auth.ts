"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { actionUser, UserError } from "@/lib/auth";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { passwordSchema, zodMessage } from "@/lib/validation";
import type { ActionResult } from "@/lib/result";

// Simple in-memory limiter: 5 failed attempts per email per 15 minutes.
const attempts = new Map<string, { n: number; first: number }>();
const WINDOW = 15 * 60 * 1000;

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

export async function loginAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const username = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!username || !password) return { ok: false, message: "Enter your username and password." };
  if (tooMany(username)) return { ok: false, message: "Too many failed attempts. Please wait 15 minutes and try again." };

  const user = await prisma.user.findUnique({ where: { username } });
  const valid = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !valid) {
    fail(username);
    return { ok: false, message: "Incorrect username or password." };
  }
  attempts.delete(username);
  const token = await signSession({ uid: user.id, name: user.name, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect(user.mustChangePassword ? "/account?first=1" : "/dashboard");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

export async function changePasswordAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  try {
    const me = await actionUser();
    const parsed = passwordSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { ok: false, ...zodMessage(parsed.error) };
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.uid } });
    if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)))
      return { ok: false, message: "Your current password is incorrect.", fields: { currentPassword: "Incorrect password" } };
    if (parsed.data.currentPassword === parsed.data.newPassword)
      return { ok: false, message: "Choose a password different from the current one.", fields: { newPassword: "Must be different" } };
    await prisma.user.update({
      where: { id: me.uid },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), mustChangePassword: false },
    });
    await prisma.auditLog.create({ data: { actorId: me.uid, action: "PASSWORD_CHANGED", entity: "User", entityId: me.uid } });
    return { ok: true, message: "Password updated." };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
