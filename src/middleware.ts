import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const MANAGER_PREFIXES = ["/skus", "/stock-in", "/purchases", "/users"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/") {
    if (session) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }
  if (!session) return NextResponse.redirect(new URL("/", req.url));

  // "/sales" (the log) is manager-only, "/sales/new" is for everyone.
  const isSalesLog = pathname === "/sales" || (pathname.startsWith("/sales/") && !pathname.startsWith("/sales/new"));
  const managerOnly = isSalesLog || MANAGER_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (managerOnly && session.role !== "MANAGER") return NextResponse.redirect(new URL("/forbidden", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)",
  ],
};
