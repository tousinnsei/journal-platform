import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isLoginPage = pathname === "/admin/login";

  // Login page: redirect authenticated admins away
  if (isLoginPage) {
    if (token) {
      const user = await verifyToken(token);
      if (user && user.role !== "USER") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // Missing cookie -> login
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Invalid / expired / tampered token -> login (and clear the bad cookie)
  const user = await verifyToken(token);
  if (!user) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  // USER role is not allowed into /admin at all
  if (user.role === "USER") {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
