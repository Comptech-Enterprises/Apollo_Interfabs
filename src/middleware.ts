import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const OWNER_ONLY = ["/users"];
const OWNER_OR_MANAGER = ["/skus", "/stock-in", "/purchases"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/") {
    return NextResponse.next();
  }
  if (!session) return NextResponse.redirect(new URL("/", req.url));

  const matches = (prefixes: string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // "/sales" (the log) is owner-only, "/sales/new" is for everyone.
  const isSalesLog = pathname === "/sales" || (pathname.startsWith("/sales/") && !pathname.startsWith("/sales/new"));

  if ((isSalesLog || matches(OWNER_ONLY)) && session.role !== "OWNER")
    return NextResponse.redirect(new URL("/forbidden", req.url));

  if (matches(OWNER_OR_MANAGER) && session.role !== "OWNER" && session.role !== "MANAGER")
    return NextResponse.redirect(new URL("/forbidden", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)",
  ],
};
