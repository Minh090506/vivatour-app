import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Role-based route access configuration
const roleRoutes: Record<string, string[]> = {
  "/requests": ["ADMIN", "SELLER", "OPERATOR", "ACCOUNTANT"],
  "/operators": ["ADMIN", "OPERATOR", "ACCOUNTANT"],
  "/revenue": ["ADMIN", "ACCOUNTANT"],
  "/expense": ["ADMIN", "ACCOUNTANT"],
  "/settings": ["ADMIN"],
  "/suppliers": ["ADMIN", "ACCOUNTANT"],
};

// Public routes that don't require auth
const publicRoutes = ["/login", "/api/auth", "/forbidden"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  for (const route of publicRoutes) {
    if (pathname.startsWith(route)) {
      return NextResponse.next();
    }
  }

  // Check authentication
  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = session.user.role;

  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route)) {
      // ADMIN always has access
      if (userRole === "ADMIN") {
        return NextResponse.next();
      }

      if (!allowedRoles.includes(userRole)) {
        // Return 403 Forbidden page
        return NextResponse.rewrite(new URL("/forbidden", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
