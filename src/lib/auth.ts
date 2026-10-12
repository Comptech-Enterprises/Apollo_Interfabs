import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

export type CurrentUser = SessionPayload & { mustChangePassword: boolean };

/** Returns the signed-in user (re-checked against the DB so deactivation is immediate). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = await verifySession(token);
  if (!s) return null;
  const u = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!u || !u.active) return null;
  return { uid: u.id, name: u.name, role: u.role, mustChangePassword: u.mustChangePassword };
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/");
  return u;
}

export async function requireManager(): Promise<CurrentUser> {
  const u = await requireUser();
  if (u.role !== "MANAGER") redirect("/forbidden");
  return u;
}

/** For server actions: throw instead of redirect. */
export class UserError extends Error {}

export async function actionUser(role?: "MANAGER"): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new UserError("Your session has expired. Please sign in again.");
  if (role && u.role !== role) throw new UserError("You do not have permission to do that.");
  return u;
}
