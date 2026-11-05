import { Request, Response, NextFunction } from "express";
import { jwtVerify, SignJWT } from "jose";
import { User, type Role } from "../models/index.js";

export type SessionPayload = {
  uid: string;
  name: string;
  role: Role;
  warehouses: string[];
};

export interface AuthenticatedUser extends SessionPayload {
  mustChangePassword: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

const MAX_AGE_SECONDS = 60 * 60 * 12;

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is missing or too short");
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload) {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.uid || !payload.role) return null;
    return {
      uid: String(payload.uid),
      name: String(payload.name),
      role: payload.role as SessionPayload["role"],
      warehouses: (payload.warehouses as string[] | undefined) ?? [],
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const session = await verifySession(token);
  if (!session) {
    res.status(401).json({ ok: false, message: "Unauthorized" });
    return;
  }

  const u = await User.findById(session.uid);
  if (!u || !u.active) {
    res.status(401).json({ ok: false, message: "Account disabled" });
    return;
  }

  (req as unknown as AuthenticatedRequest).user = {
    ...session,
    role: u.role,
    warehouses: u.warehouses,
    mustChangePassword: u.mustChangePassword,
  };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as AuthenticatedRequest).user;
    if (!roles.includes(user.role)) {
      res.status(403).json({ ok: false, message: "Forbidden" });
      return;
    }
    next();
  };
}
