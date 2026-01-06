/**
 * Authentication & Authorization Proxy (Edge Runtime)
 *
 * Next.js 16+ proxy.ts convention for route protection.
 * Uses edge-compatible auth config (no DB/bcrypt imports).
 * Authorization logic is in auth.config.ts authorized() callback.
 *
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 */
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Use edge-compatible config - authorization handled by authorized() callback
export default NextAuth(authConfig).auth;

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
